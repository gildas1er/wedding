import { NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { createCheckout, paymentsConfigured, priceFor, saspayEnvironment, serviceSupabase } from '../../../../lib/premium-server';
import { hasAdminFlag } from '../../../../lib/admin-server';
import { TIERS, type TierId } from '../../../../lib/plan';
import { getSiteUrl } from '../../../../lib/og';
import { crossSiteRefusal, isSameOrigin } from '../../../../lib/same-origin';
import { contactEmail, loginPhone } from '../../../../lib/phone-auth';
import type { AppliedCode } from '../../../../lib/promo';

// Paiement en ligne des paliers (SasPay).
// En mode test (adresse « sandbox »), seuls les administrateurs et les comptes de test listés dans
// SASPAY_TEST_EMAILS (Vercel, adresses séparées par des virgules) voient et utilisent le paiement en ligne :
// les faux numéros de test ne doivent pas permettre à un couple d'obtenir un palier gratuitement.
const testEmails = () => (process.env.SASPAY_TEST_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const test = saspayEnvironment() === 'sandbox';
  const tester = hasAdminFlag(user) || (Boolean(user?.email) && testEmails().includes(user!.email!.toLowerCase()));
  const enabled = paymentsConfigured() && Boolean(user) && (!test || tester);
  return { supabase, user, test, enabled };
}

// Le paiement en ligne est-il proposé à ce compte ?
export async function GET() {
  const { enabled, test } = await context();
  return NextResponse.json({ enabled, test: enabled && test });
}

// Crée la page de paiement SasPay pour le palier choisi et renvoie son adresse
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  const { supabase, user, enabled } = await context();
  if (!user) return NextResponse.json({ error: 'Connectez-vous pour continuer.' }, { status: 401 });
  if (!enabled) return NextResponse.json({ error: "Le paiement en ligne n'est pas encore disponible. Contactez-nous sur WhatsApp." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { tier?: string };
  const target = TIERS.find((t) => t.id === body.tier)?.id as TierId | undefined;
  if (!target) return NextResponse.json({ error: 'Palier inconnu.' }, { status: 400 });

  const { data: marriage } = await supabase.from('marriages')
    .select('id, partner_1_name, partner_2_name, plan, premium_until, tier, guest_limit').eq('user_id', user.id)
    .order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (!marriage) return NextResponse.json({ error: 'Mariage introuvable.' }, { status: 404 });

  // Code promo ou de parrainage saisi par le couple (absent sans la migration 19)
  const { data: code } = await supabase.rpc('my_code');
  const price = priceFor(marriage, target, (code as AppliedCode | null) ?? null);
  if ('error' in price) return NextResponse.json({ error: price.error }, { status: 400 });

  const email = contactEmail(user);
  if (!email) return NextResponse.json({ error: 'Ajoutez une adresse e-mail dans vos paramètres : SasPay en demande une pour le reçu.' }, { status: 400 });
  const couple = [marriage.partner_1_name, marriage.partner_2_name].filter(Boolean).join(' & ') || 'Mariés';
  const db = serviceSupabase();

  try {
    const session = await createCheckout({
      amount: price.amount,
      description: `WeddingStudio · palier ${price.tier.label}${price.upgradeFrom ? ' (montée de palier)' : ''} · ${couple}`,
      customerName: couple,
      customerEmail: email,
      customerPhone: loginPhone(user),
      returnUrl: `${getSiteUrl()}/dashboard/premium?paiement=retour`,
      metadata: { marriage_id: marriage.id, tier: price.tier.id },
    });
    if (!session?.id || !session.checkout_url) throw new Error('Réponse SasPay incomplète');

    const row: Record<string, unknown> = {
      marriage_id: marriage.id, couple, provider: 'saspay', reference: session.id, amount: price.amount, currency: 'XOF',
      status: 'pending', environment: saspayEnvironment(), tier: price.tier.id, promo_code: price.promoCode,
      note: [`Palier ${price.tier.label}`, price.upgradeFrom ? 'montée de palier' : null, price.launch ? 'offre de lancement' : null, price.promoCode ? `code ${price.promoCode}` : null].filter(Boolean).join(' · '),
    };
    const { error } = await db.from('payments').insert(row);
    if (error) {
      console.error('Enregistrement du paiement SasPay :', error.message);
      return NextResponse.json({ error: /tier|fee|method/.test(error.message) ? 'Lancez la migration 38 (paiement en ligne) dans Supabase.' : 'Le paiement n’a pas pu être préparé.' }, { status: 500 });
    }
    const response = NextResponse.json({ url: session.checkout_url });
    // Retenue 24 h pour vérifier ce paiement au retour sur le site
    response.cookies.set('premium_ref', session.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 });
    return response;
  } catch (e) {
    console.error('Création du paiement SasPay :', e);
    return NextResponse.json({ error: 'Le paiement n’a pas pu être préparé. Réessayez dans quelques instants ou contactez-nous sur WhatsApp.' }, { status: 502 });
  }
}
