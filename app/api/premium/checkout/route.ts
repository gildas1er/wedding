import { NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { createCheckout, paymentsConfigured, serviceSupabase } from '../../../../lib/premium-server';
import { isPremium, ONLINE_PAYMENT_ENABLED, PREMIUM_PRICE_XOF } from '../../../../lib/plan';
import { getSiteUrl } from '../../../../lib/og';

// Crée un paiement GeniusPay pour le mariage du couple connecté et renvoie l'adresse de la page de paiement
export async function POST() {
  // Paiement en ligne désactivé : l'activation se fait par contact (voir lib/plan.ts)
  if (!ONLINE_PAYMENT_ENABLED || !paymentsConfigured()) {
    return NextResponse.json({ error: "Le paiement en ligne n'est pas encore activé. Contactez-nous pour passer au Premium." }, { status: 503 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connectez-vous pour continuer.' }, { status: 401 });

  const { data: marriage } = await supabase
    .from('marriages').select('id, partner_1_name, partner_2_name, plan, premium_until').eq('user_id', user.id).maybeSingle();
  if (!marriage) return NextResponse.json({ error: 'Mariage introuvable.' }, { status: 404 });
  if (isPremium(marriage)) return NextResponse.json({ error: 'Votre espace est déjà Premium.' }, { status: 409 });

  const site = getSiteUrl();
  try {
    const payment = await createCheckout({
      marriageId: marriage.id,
      userId: user.id,
      email: user.email,
      name: [marriage.partner_1_name, marriage.partner_2_name].filter(Boolean).join(' & ') || undefined,
      phone: (user.user_metadata?.phone as string | undefined) ?? null,
      successUrl: `${site}/dashboard/premium?retour=1`,
      errorUrl: `${site}/dashboard/premium?echec=1`,
    });
    // Trace du paiement : permet de relier la notification de GeniusPay au bon mariage
    const { error } = await serviceSupabase().from('payments').insert({
      marriage_id: marriage.id, reference: payment.reference, amount: PREMIUM_PRICE_XOF, status: 'pending', environment: payment.environment ?? null,
    });
    if (error) throw new Error(error.message);

    const url = payment.checkout_url || payment.payment_url;
    if (!url) throw new Error('Adresse de paiement manquante');
    const response = NextResponse.json({ url, reference: payment.reference });
    // Retenue quelques heures pour vérifier le paiement au retour sur le site
    response.cookies.set('premium_ref', payment.reference, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 });
    return response;
  } catch (e) {
    console.error('Création du paiement Premium :', e);
    return NextResponse.json({ error: 'Le paiement n’a pas pu être préparé. Réessayez dans quelques instants.' }, { status: 502 });
  }
}
