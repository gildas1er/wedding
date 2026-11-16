// Invitations au style africain (migration 37) : Le Pagne, Le Kita, Le Bogolan, Le Village.
// Les familles qui invitent, la tenue demandée et le pagne de la cérémonie servent aussi aux autres modèles.
import { parsePhone } from './phone-auth';
import { formatDateFr, formatHourFr } from './event-datetime';

export const AFRICAN_TEMPLATES = ['pagne', 'kita', 'bogolan', 'village'] as const;
export type AfricanTemplate = (typeof AFRICAN_TEMPLATES)[number];
export const isAfricanTemplate = (t: unknown): t is AfricanTemplate => AFRICAN_TEMPLATES.includes(t as AfricanTemplate);

export const DRESS_CODES = [
  { id: 'pagne', label: 'Pagne de la cérémonie', heading: 'Le pagne de la cérémonie', tag: 'Tenue : pagne de la cérémonie' },
  { id: 'traditionnel', label: 'Tenue traditionnelle', heading: 'Tenue traditionnelle', tag: 'Tenue traditionnelle souhaitée' },
  { id: 'couleurs', label: 'Couleurs imposées', heading: 'Les couleurs du jour', tag: 'Tenue aux couleurs du jour' },
] as const;
export type DressCode = (typeof DRESS_CODES)[number]['id'];
export const resolveDressCode = (v: unknown): DressCode | null => DRESS_CODES.find((d) => d.id === v)?.id ?? null;
export const dressTag = (v: unknown) => DRESS_CODES.find((d) => d.id === v)?.tag ?? null;

export const MAX_DRESS_COLORS = 4;
const HEX = /^#[0-9a-f]{6}$/i;
export function readDressColors(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string' && HEX.test(c)).slice(0, MAX_DRESS_COLORS) : [];
}

export type CeremonyPagne = { photo_url: string; label: string; price: number | null; seller_name: string; seller_phone: string };
export const EMPTY_PAGNE: CeremonyPagne = { photo_url: '', label: '', price: null, seller_name: '', seller_phone: '' };

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export function readPagne(v: unknown): CeremonyPagne {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const price = Number(o.price);
  const photo = str(o.photo_url, 600);
  return {
    photo_url: /^https:\/\//.test(photo) ? photo : '',
    label: str(o.label, 80),
    price: Number.isFinite(price) && price > 0 ? Math.min(Math.round(price), 10_000_000) : null,
    seller_name: str(o.seller_name, 60),
    seller_phone: str(o.seller_phone, 20),
  };
}
export const hasPagne = (p: CeremonyPagne) => Boolean(p.photo_url || p.label || p.price || p.seller_phone);

// Enregistrement : null si rien n'est rempli ; le numéro est mis au format international
export function preparePagneForSave(p: CeremonyPagne): { value: CeremonyPagne | null; error?: string } {
  const clean = readPagne(p);
  let phone = '';
  if (p.seller_phone.trim()) {
    const parsed = parsePhone(p.seller_phone, 'CI');
    if (!parsed) return { value: null, error: 'Le numéro WhatsApp pour commander le pagne n’est pas valide.' };
    phone = parsed;
  }
  const value = { ...clean, seller_phone: phone };
  return { value: hasPagne(value) ? value : null };
}

// Lien WhatsApp pour commander le pagne, avec un message prêt à envoyer
export function pagneOrderLink(p: CeremonyPagne, couple: string, guestName?: string) {
  const digits = p.seller_phone.replace(/\D/g, '');
  if (!digits) return null;
  const text = `Bonjour${p.seller_name ? ` ${p.seller_name}` : ''}, ${guestName ? `c’est ${guestName}. ` : ''}Je souhaite commander le pagne${p.label ? ` « ${p.label} »` : ''} pour le mariage de ${couple}.`;
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`;
}

export const formatPrice = (n: number) => `${n.toLocaleString('fr-FR').replace(/ | /g, ' ')} F`;

type Flags = { dot: boolean; civil: boolean; religious: boolean; reception: boolean };

// Titre : « Cérémonie de dot » quand c'est la seule cérémonie prévue, sinon « Mariage »
export function invitationHeading(flags: Flags) {
  const dotOnly = flags.dot && !flags.civil && !flags.religious && !flags.reception;
  return dotOnly ? { title: 'Cérémonie de dot', to: 'à la' } : { title: 'Mariage', to: 'au' };
}

// « Les familles Kouassi & Yao ont la joie de vous convier » (une seule famille : « La famille … a la joie »)
export function familiesPhrase(f1?: string | null, f2?: string | null) {
  const names = [f1, f2].map((f) => f?.trim()).filter(Boolean) as string[];
  if (names.length === 2) return { lead: 'Les familles', names: names.join(' & '), verb: 'ont la joie de vous convier' };
  if (names.length === 1) return { lead: 'La famille', names: names[0], verb: 'a la joie de vous convier' };
  return null;
}

// Informations du mariage lues par l'invitation (fonction get_rsvp_invitation, ou aperçu du studio)
export type InvitationLike = {
  partner_1_name?: string | null; partner_2_name?: string | null; wedding_date?: string | Date | null;
  primary_color?: string | null; accent_color?: string | null; names_font?: string | null;
  family_1?: string | null; family_2?: string | null; dress_code?: string | null; dress_colors?: unknown; ceremony_pagne?: unknown;
  [key: string]: unknown;
};
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
// Date, heure et lieu mis en avant : ceux de la dot si elle est seule, sinon ceux de la première cérémonie prévue
export function mainEvent(m: InvitationLike, flags: Flags) {
  const order: [boolean, string][] = [[flags.dot, 'dot'], [flags.civil, 'mairie'], [flags.religious, 'religious'], [flags.reception, 'reception']];
  const first = order.find(([on]) => on)?.[1];
  const wedding = m.wedding_date instanceof Date ? m.wedding_date.toISOString() : text(m.wedding_date);
  const date = (first && text(m[`${first}_date`])) || (wedding ? wedding.slice(0, 10) : null);
  const hour = first ? text(m[`${first}_hour`]) : null;
  return {
    date: date ? formatDateFr(date) : null,
    hour: hour ? formatHourFr(hour) || null : null,
    location: first ? text(m[`${first}_location`]) : null,
  };
}

/* ── Motifs dessinés pour WeddingStudio (aucune copie de pagne de marque) ── */
const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`)}")`;

// Le Pagne : un wax aux couleurs du couple (fond = couleur principale, grands cercles = couleur d'accent)
export function waxPattern(primary: string, accent: string) {
  const cream = '#f7ebd3';
  return svg(72, 72, `<rect width='72' height='72' fill='${primary}'/>`
    + `<circle cx='36' cy='36' r='25' fill='${accent}'/><circle cx='36' cy='36' r='17' fill='${cream}' opacity='.9'/>`
    + `<circle cx='36' cy='36' r='11' fill='${primary}'/><circle cx='36' cy='36' r='4' fill='${accent}'/>`
    + `<g fill='${cream}' opacity='.85'><circle cx='0' cy='0' r='11'/><circle cx='72' cy='0' r='11'/><circle cx='0' cy='72' r='11'/><circle cx='72' cy='72' r='11'/></g>`
    + `<g fill='${accent}'><circle cx='0' cy='0' r='4'/><circle cx='72' cy='0' r='4'/><circle cx='0' cy='72' r='4'/><circle cx='72' cy='72' r='4'/></g>`
    + `<g fill='${cream}' opacity='.55'><circle cx='36' cy='3' r='2'/><circle cx='36' cy='69' r='2'/><circle cx='3' cy='36' r='2'/><circle cx='69' cy='36' r='2'/></g>`);
}

// Le Kita : bandes tissées orange, ocre et blanc séparées par un fil brun
export const KITA_PATTERN = svg(150, 96, `<rect width='150' height='96' fill='#5a2d12'/>`
  + `<rect x='4' y='4' width='26' height='88' fill='#e8622c'/>`
  + `<g fill='#5a2d12'><path d='M17 14l6 8-6 8-6-8z'/><path d='M17 38l6 8-6 8-6-8z'/><path d='M17 62l6 8-6 8-6-8z'/></g>`
  + `<rect x='34' y='4' width='26' height='88' fill='#fff'/>`
  + `<g stroke='#5a2d12' stroke-width='4'><path d='M34 22L52 4M34 44L60 18M34 66L60 40M34 88L60 62M48 92L60 80'/></g>`
  + `<rect x='64' y='4' width='26' height='88' fill='#f0a83a'/>`
  + `<g fill='#5a2d12'><path d='M77 12l9 12h-18z'/><path d='M77 30l9 12h-18z'/><path d='M77 48l9 12h-18z'/><path d='M77 66l9 12h-18z'/></g>`
  + `<rect x='94' y='4' width='26' height='88' fill='#e8622c'/>`
  + `<path d='M107 4 C122 28 92 52 107 74 S110 92 107 92' fill='none' stroke='#f0a83a' stroke-width='5'/>`
  + `<rect x='124' y='4' width='22' height='88' fill='#fff'/>`);

// Le Village : mur en terre (banco) peint de motifs blancs
export const VILLAGE_GROUND = svg(80, 60, `<rect width='80' height='60' fill='#b8662f'/>`
  + `<g fill='#f6e7cf' opacity='.75'><circle cx='10' cy='10' r='2.4'/><circle cx='20' cy='10' r='2.4'/><circle cx='30' cy='10' r='2.4'/></g>`
  + `<path d='M44 6 l8 10 l8 -10 l8 10' fill='none' stroke='#f6e7cf' stroke-width='2.4' opacity='.7'/>`
  + `<path d='M8 40 h20 M18 30 v20' stroke='#3b1d0c' stroke-width='3' opacity='.45'/>`
  + `<circle cx='58' cy='42' r='8' fill='none' stroke='#f6e7cf' stroke-width='2.2' opacity='.6'/>`);

// Le Bogolan : terre sombre et motifs peints écru
export const BOGOLAN_PATTERN = svg(56, 56, `<rect width='56' height='56' fill='#4a2a17'/>`
  + `<path d='M0 12 L7 5 L14 12 L21 5 L28 12 L35 5 L42 12 L49 5 L56 12' fill='none' stroke='#eadbc0' stroke-width='3'/>`
  + `<g fill='#eadbc0'><circle cx='7' cy='28' r='2.6'/><circle cx='21' cy='28' r='2.6'/><circle cx='35' cy='28' r='2.6'/><circle cx='49' cy='28' r='2.6'/></g>`
  + `<path d='M10 40 h8 M14 36 v8 M38 40 h8 M42 36 v8' stroke='#c98a4b' stroke-width='3'/>`
  + `<path d='M0 52 H56' stroke='#eadbc0' stroke-width='2' stroke-dasharray='5 4'/>`);
export const BOGOLAN_RULE = svg(20, 10, `<path d='M0 8 L5 2 L10 8 L15 2 L20 8' fill='none' stroke='#9c5a26' stroke-width='2'/>`);
