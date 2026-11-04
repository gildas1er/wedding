import { NextResponse } from 'next/server';
import { serviceSupabase } from '../../../../lib/premium-server';
import { crossSiteRefusal, isSameOrigin } from '../../../../lib/same-origin';
import { LEGAL } from '../../../../lib/legal';
import { normalizeCode } from '../../../../lib/promo';
import { passwordOk } from '../../../../lib/password';
import { isCountryCode, parsePhone, phoneLoginEmail } from '../../../../lib/phone-auth';

// Inscription avec un numéro de téléphone (sans code de vérification). Le compte est créé ici,
// déjà confirmé, avec les mêmes informations que l'inscription par e-mail ; la fiche mariage est
// créée par le déclencheur habituel (create_marriage_for_new_user). La page ouvre ensuite la
// session avec le jeton renvoyé (connexion à usage unique, aucun e-mail envoyé).
// Anti-robot : jeton Turnstile vérifié si TURNSTILE_SECRET_KEY est défini sur Vercel,
// et 5 inscriptions par heure au plus depuis une même adresse IP.

const ROLES = ['le-marie', 'la-mariee', 'le-pco'];
const MAX_PER_IP_PER_HOUR = 5;
const MAX_PER_HOUR = 200;

type Body = {
  country?: string; phone?: string; password?: string;
  fullName?: string; partnerName?: string; email?: string;
  weddingDate?: string; role?: string;
  termsAccepted?: boolean; marketingOptIn?: boolean;
  referralCode?: string; captchaToken?: string;
};

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function clientIp(request: Request) {
  return request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'inconnue';
}

async function captchaValid(token: string | undefined, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    return Boolean(((await res.json()) as { success?: boolean }).success);
  } catch {
    return false;
  }
}

// Même règle que la page : le mariage est prévu au moins un mois plus tard
function weddingDateOk(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const min = new Date();
  min.setMonth(min.getMonth() + 1);
  min.setHours(0, 0, 0, 0);
  return d >= min;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  const body = (await request.json().catch(() => ({}))) as Body;

  const fullName = (body.fullName ?? '').trim().slice(0, 60);
  const partnerName = (body.partnerName ?? '').trim().slice(0, 60);
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const weddingDate = body.weddingDate ?? '';
  const phone = isCountryCode(body.country) ? parsePhone(body.phone ?? '', body.country) : null;

  if (!phone) return fail('Ce numéro de téléphone n’est pas valide pour le pays choisi.');
  if (!fullName || !partnerName) return fail('Indiquez les deux prénoms.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Le format de l’adresse e-mail est invalide.');
  if (!weddingDateOk(weddingDate)) return fail('Le mariage doit être prévu au moins 1 mois à l’avance.');
  if (!ROLES.includes(body.role ?? '')) return fail('Indiquez qui vous êtes (le marié, la mariée ou le PCO).');
  if (!passwordOk(password)) return fail('Le mot de passe ne respecte pas toutes les règles.');
  if (body.termsAccepted !== true) return fail('Acceptez les conditions pour créer votre compte.');

  const ip = clientIp(request);
  if (!(await captchaValid(body.captchaToken, ip))) return fail('La vérification anti-robot a échoué ou a expiré. Réessayez.');

  const db = serviceSupabase();
  const ipKey = `inscription-tel:${ip}`;
  const [{ data: byIp }, { data: all }] = await Promise.all([
    db.rpc('rate_count', { p_key: ipKey, p_window: '1 hour' }),
    db.rpc('rate_count', { p_key: 'inscription-tel', p_window: '1 hour' }),
  ]);
  if ((byIp ?? 0) >= MAX_PER_IP_PER_HOUR || (all ?? 0) >= MAX_PER_HOUR) {
    return fail('Trop d’inscriptions en peu de temps. Réessayez dans une heure.', 429);
  }
  await Promise.all([db.rpc('rate_hit', { p_key: ipKey }), db.rpc('rate_hit', { p_key: 'inscription-tel' })]);

  const loginEmail = phoneLoginEmail(phone);
  const referral = normalizeCode(body.referralCode ?? '');
  const { error } = await db.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      partner_name_1: fullName,
      partner_name_2: partnerName,
      phone,
      contact_email: email || null,
      signup_method: 'phone',
      wedding_date: weddingDate,
      role: body.role,
      // Preuve du consentement : version des documents acceptés et date
      terms_version: LEGAL.version,
      terms_accepted_at: new Date().toISOString(),
      marketing_opt_in: body.marketingOptIn === true,
      ...(referral ? { referral_code: referral } : {}),
    },
  });
  if (error) {
    const exists = error.status === 422 || /already|exists|registered/i.test(error.message);
    if (exists) return fail('Ce numéro a déjà un compte. Connectez-vous avec votre numéro et votre mot de passe.', 409);
    console.error('Inscription par téléphone :', error.message);
    return fail('Le compte n’a pas pu être créé. Réessayez dans un instant.', 500);
  }

  // Connexion immédiate : jeton à usage unique, échangé par la page contre une session
  const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email: loginEmail });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return NextResponse.json({ ok: true, tokenHash: null });
  return NextResponse.json({ ok: true, tokenHash });
}
