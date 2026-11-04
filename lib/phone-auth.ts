// Comptes créés avec un numéro de téléphone (onglet « Avec mon téléphone » de l'inscription).
// Supabase identifie chaque compte par une adresse e-mail : pour un compte par téléphone, cette adresse
// est fabriquée à partir du numéro (2250708123456@telephone.weddingstudio.app) et ne reçoit jamais
// rien. L'e-mail facultatif donné à l'inscription est gardé dans user_metadata.contact_email.
// Aucun réglage Supabase n'est nécessaire (pas de fournisseur SMS).
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export const PHONE_LOGIN_DOMAIN = 'telephone.weddingstudio.app';
export const DEFAULT_COUNTRY: CountryCode = 'CI';

// Numéro saisi + pays choisi -> +2250708123456, ou null s'il n'est pas valide pour ce pays
export function parsePhone(raw: string, country: CountryCode): string | null {
  const p = parsePhoneNumberFromString(raw.trim(), country);
  return p && p.isValid() ? p.number : null;
}

// Affichage lisible : +225 07 08 12 34 56
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  // Côte d'Ivoire : par deux chiffres, comme on l'écrit sur place (la bibliothèque donne « 12 3456 »)
  const ci = /^\+225(\d{10})$/.exec(e164);
  if (ci) return `+225 ${ci[1].replace(/(\d{2})(?=\d)/g, '$1 ')}`;
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

export const phoneLoginEmail = (e164: string) => `${e164.replace(/\D/g, '')}@${PHONE_LOGIN_DOMAIN}`;

export const isPhoneLoginEmail = (email: string | null | undefined) =>
  Boolean(email && email.toLowerCase().endsWith(`@${PHONE_LOGIN_DOMAIN}`));

type UserLike = { email?: string | null; user_metadata?: Record<string, unknown> | null } | null | undefined;

// Adresse où écrire au couple (rappels, reçus) : jamais l'adresse fabriquée d'un compte par téléphone
export function contactEmail(user: UserLike): string | null {
  if (!user) return null;
  if (!isPhoneLoginEmail(user.email)) return user.email || null;
  const c = user.user_metadata?.contact_email;
  return typeof c === 'string' && c.trim() ? c.trim() : null;
}

// Numéro de connexion d'un compte par téléphone (null pour un compte par e-mail ou Google)
export function loginPhone(user: UserLike): string | null {
  if (!user || !isPhoneLoginEmail(user.email)) return null;
  const p = user.user_metadata?.phone;
  return typeof p === 'string' && p ? p : `+${user.email!.split('@')[0]}`;
}

// Liste des pays pour le choix de l'indicatif : nom en français, Côte d'Ivoire et voisins en tête
const FIRST: CountryCode[] = ['CI', 'FR', 'SN', 'BF', 'ML', 'CM', 'TG', 'BJ', 'GN', 'GH', 'BE', 'CA', 'US'];
export type CountryOption = { code: CountryCode; name: string; dial: string; flag: string };

let cached: { first: CountryOption[]; others: CountryOption[] } | null = null;
export function countryOptions() {
  if (cached) return cached;
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames(['fr'], { type: 'region' }); } catch { /* ancien navigateur */ }
  const make = (code: CountryCode): CountryOption => ({
    code,
    name: names?.of(code) ?? code,
    dial: `+${getCountryCallingCode(code)}`,
    flag: String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)),
  });
  const all = getCountries();
  cached = {
    first: FIRST.filter((c) => all.includes(c)).map(make),
    others: all.filter((c) => !FIRST.includes(c)).map(make).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  };
  return cached;
}

export const isCountryCode = (v: unknown): v is CountryCode => typeof v === 'string' && (getCountries() as string[]).includes(v);
