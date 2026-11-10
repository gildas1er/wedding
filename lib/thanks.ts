// Cartes de remerciements (migration 35) : ce que partagent la page du couple, la page de l'invité
// (/merci/[id]) et le serveur (/api/merci). Dessin de l'image dans lib/thanks-draw.ts.
import { ceremonyFlags } from './ceremonies';

export const THANKS_TEMPLATES = [
  { id: 'lettre', label: 'La Lettre', description: 'Une carte papier crème : votre photo, le prénom de l’invité écrit à la main, votre mot et votre cachet de cire.' },
  { id: 'souvenir', label: 'Le Souvenir', description: 'Chaque invité retrouve sa photo de l’album et le message qu’il vous a laissé dans le livre d’or.' },
  { id: 'generique', label: 'Le Générique de fin', description: 'Votre mariage se termine comme un film : le générique défile, le nom de l’invité en vedette, avec les vrais chiffres de la fête.' },
  { id: 'statut', label: 'Le Statut', description: 'Trois écrans plein format à publier sur le statut WhatsApp : votre photo, le merci à son nom, un souvenir de la journée.' },
] as const;
export type ThanksTemplate = (typeof THANKS_TEMPLATES)[number]['id'];
export const resolveThanksTemplate = (v: unknown): ThanksTemplate =>
  THANKS_TEMPLATES.some((t) => t.id === v) ? (v as ThanksTemplate) : 'lettre';

// Modèles qui montrent la photo et le message de l'invité (album, livre d'or)
export const usesGuestMemories = (t: ThanksTemplate) => t === 'souvenir' || t === 'statut';
// Modèles imprimables en PDF (formules payantes) ; les deux autres sont au format statut (9:16)
export const isPrintable = (t: ThanksTemplate) => t === 'lettre' || t === 'souvenir';

// Rôles proposés pour les tables du générique (le couple peut écrire le sien)
export const TABLE_ROLE_EXAMPLES = [
  'Les ambianceurs', 'Les sages', 'Les rois de la piste', 'Les inséparables', 'Les témoins de la première heure',
  'La famille d’abord', 'Les gourmands', 'Les photographes officiels', 'Les cœurs tendres', 'La team mariée', 'La team marié',
];
export const TABLE_ROLE_MAX = 40;

export const THANKS_MESSAGE_MAX = 600;
export const THANKS_NOTE_MAX = 300;

// Textes proposés au couple (il peut les modifier)
export const THANKS_EXAMPLES = [
  'Merci du fond du cœur d’avoir partagé avec nous ce jour si important. Votre présence, vos sourires et vos pas de danse resteront gravés dans nos cœurs.',
  'Votre présence a rendu notre mariage encore plus beau. Merci pour votre amour, vos prières et tous ces moments de joie partagés.',
  'Il n’y a pas de mots assez forts pour vous dire merci. Grâce à vous, notre journée a été exactement comme nous l’avions rêvée.',
  'Merci d’avoir fait le déplacement, d’avoir chanté, dansé et prié avec nous. Nous commençons notre vie à deux le cœur rempli de vos bénédictions.',
  'Un immense merci pour votre présence et vos attentions. Que Dieu vous rende au centuple tout l’amour que vous nous avez donné.',
];
export const DEFAULT_THANKS_MESSAGE = THANKS_EXAMPLES[0];

// Données d'une carte, telles que /api/merci les renvoie à la page de l'invité
export type ThanksCardData = {
  template: ThanksTemplate;
  marriageId: string;
  partner1: string;
  partner2: string;
  weddingDate: string | null;      // AAAA-MM-JJ
  city: string | null;
  guestName: string;
  ceremonies: string | null;       // « à la dot et à la réception »
  table: string | null;
  message: string;
  note: string | null;
  coverUrl: string | null;         // photo de couverture du faire-part
  photoUrl: string | null;         // photo de l'album choisie pour cet invité
  quote: { text: string; author: string } | null;
  primary: string | null;
  accent: string | null;
  namesFont: string | null;
  referralCode: string | null;
  paid: boolean;                   // formule payante : PDF à imprimer
  guestbookOpen: boolean;          // livre d'or encore ouvert (avant le mode souvenir)
  // Générique de fin
  stats: { guests: number; ceremonies: number; photos: number; messages: number } | null;
  tableRole: string | null;        // « Les ambianceurs »
  tableMates: string[];            // quelques invités venus de la même table
};

// Rôles des tables lus dans thanks_settings.table_roles (valeurs vides ou trop longues ignorées)
export function readTableRoles(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>)
      .filter(([, r]) => typeof r === 'string' && r.trim())
      .map(([k, r]) => [k, (r as string).trim().slice(0, TABLE_ROLE_MAX)]),
  );
}

export const plannedCeremonies = (m: CeremonyMarriage) => Object.values(ceremonyFlags(m)).filter(Boolean).length;

export const thanksUrl = (origin: string, marriageId: string, inviteId: string) => `${origin}/merci/${marriageId}?g=${inviteId}`;

// Une carte n'est visible qu'à partir du jour du mariage (heure d'Abidjan = UTC)
export const thanksOpen = (weddingDate: string | null | undefined, today = new Date().toISOString().slice(0, 10)) =>
  Boolean(weddingDate && weddingDate.slice(0, 10) <= today);

// Invité venu : réponse « confirmé » ou entrée scannée à l'accueil
export const guestCame = (g: { status?: string | null; checked_in_at?: string | null }) => g.status === 'confirmé' || Boolean(g.checked_in_at);

type CeremonyMarriage = Parameters<typeof ceremonyFlags>[0];
type Attending = { attending_dot?: boolean | null; attending_civil?: boolean | null; attending_church?: boolean | null; attending_reception?: boolean | null };

// « à la dot et à la réception », « à chaque étape de notre mariage », ou null si on ne sait pas
export function ceremoniesSentence(m: CeremonyMarriage, g: Attending): string | null {
  const flags = ceremonyFlags(m);
  const planned = [
    flags.dot && { label: 'à la dot', came: g.attending_dot },
    flags.civil && { label: 'à la mairie', came: g.attending_civil },
    flags.religious && { label: 'à la cérémonie religieuse', came: g.attending_church },
    flags.reception && { label: 'à la réception', came: g.attending_reception },
  ].filter((c): c is { label: string; came: boolean | null | undefined } => Boolean(c));
  const came = planned.filter((c) => c.came === true).map((c) => c.label);
  if (!came.length) return null;
  if (planned.length > 1 && came.length === planned.length) return 'à chaque étape de notre mariage';
  return came.length === 1 ? came[0] : `${came.slice(0, -1).join(', ')} et ${came[came.length - 1]}`;
}

/* ── Rapprocher un invité de ses photos et de ses messages (noms saisis librement) ── */
const STOP = new Set(['famille', 'fam', 'les', 'le', 'la', 'de', 'du', 'des', 'et', 'mr', 'm', 'mme', 'mlle', 'monsieur', 'madame', 'mademoiselle', 'tante', 'tonton', 'oncle', 'tata', 'maman', 'papa', 'couple', 'dr', 'pasteur', 'abbe']);

export function nameTokens(name: string | null | undefined): string[] {
  return (name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

// 3 : mêmes mots ; 2 : tous les mots de l'un sont dans l'autre ; 1 : un mot important en commun ; 0 : rien
export function nameScore(a: string | null | undefined, b: string | null | undefined): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  const common = ta.filter((t) => sb.has(t));
  if (common.length === sa.size && common.length === sb.size) return 3;
  if (common.length && (ta.every((t) => sb.has(t)) || tb.every((t) => sa.has(t)))) return 2;
  return common.some((t) => t.length >= 4) ? 1 : 0;
}

// Élément le plus proche du nom de l'invité (au moins « tous les mots de l'un dans l'autre »)
export function bestMatch<T>(guestName: string, items: T[], nameOf: (item: T) => string | null | undefined, min = 2): T | null {
  let best: T | null = null;
  let bestScore = min - 1;
  for (const item of items) {
    const s = nameScore(guestName, nameOf(item));
    if (s > bestScore) { best = item; bestScore = s; }
  }
  return best;
}

export const formatWeddingDay = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export const thanksFilename = (guestName: string, ext: 'png' | 'jpg' | 'pdf') =>
  `merci-${guestName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'invite'}.${ext}`;
