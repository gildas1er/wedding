// Démos pour les prospects (onglet « Démos » de l'administration) : un faux couple, Aya & Konan,
// pour chaque type de cérémonie. Rien n'est lu ni écrit en base : l'invitation est construite ici.
import { resolveTemplate } from './invitation-templates';

export const DEMO_TYPES = [
  { id: 'dot', label: 'Dot', of: 'votre dot', summary: 'La dot seule : familles Kouassi & Yao, cour familiale à Bingerville, pagne de la cérémonie à commander.' },
  { id: 'civil', label: 'Mariage civil', of: 'votre mariage civil', summary: 'Mairie de Cocody le matin, cocktail et dîner le soir, deux couleurs imposées.' },
  { id: 'religieux', label: 'Mariage religieux', of: 'votre mariage religieux', summary: 'Messe à la cathédrale Saint-Paul, puis cocktail et dîner.' },
  { id: 'complet', label: 'Mariage complet', of: 'votre mariage', summary: 'Dot, mairie, église et réception sur trois jours, pagne de la cérémonie.' },
] as const;
export type DemoType = (typeof DEMO_TYPES)[number]['id'];
export const resolveDemoType = (v: unknown): DemoType => DEMO_TYPES.find((t) => t.id === v)?.id ?? 'dot';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Toujours un samedi dans environ quatre mois : le compte à rebours reste crédible
export function demoSaturday(today = new Date()) {
  const base = addDays(today, 120);
  return addDays(base, (6 - base.getDay() + 7) % 7);
}

const PAGNE = { photo_url: '', label: 'Pagne de la dot', price: 15000, seller_name: 'Tantie Adjoua', seller_phone: '+2250708123456' };
const INFOS = [
  { id: 'demo-contact', kind: 'contact', title: 'Une question ?', text: 'La famille répond à toutes vos questions sur la cérémonie.', name: 'Tantie Awa', phone: '+2250708123456' },
  { id: 'demo-gifts', kind: 'gifts', title: 'Cadeaux', text: 'Votre présence est notre plus beau cadeau. Une urne sera à disposition pour ceux qui le souhaitent.' },
];

// Mariage fictif au format de get_rsvp_invitation
export function buildDemoMarriage(template: unknown, type: unknown, guestName?: string, today = new Date()) {
  const t = resolveDemoType(type);
  const sat = demoSaturday(today);
  const day = (n: number) => iso(addDays(sat, n));
  const show = {
    dot: t === 'dot' || t === 'complet',
    civil: t === 'civil' || t === 'complet',
    religious: t === 'religieux' || t === 'complet',
    reception: t !== 'dot',
  };
  const dotDay = t === 'complet' ? day(-2) : day(0);
  return {
    id: 'demo',
    partner_1_name: 'Aya',
    partner_2_name: 'Konan',
    wedding_date: day(0),
    invitation_template: resolveTemplate(template),
    primary_color: '#9e3a55',
    accent_color: null,
    names_font: 'pinyon_script',
    invitation_text: t === 'dot' ? 'Cérémonie de dot' : 'On se marie !',
    bg_image_url: null,
    bg_image_position: null,
    music_url: null,
    show_dot: show.dot, show_civil: show.civil, show_religious: show.religious, show_reception: show.reception,
    dot_date: show.dot ? dotDay : null, dot_hour: show.dot ? '10:00' : null,
    dot_location: show.dot ? 'Cour familiale Kouassi, Bingerville' : null, dot_maps_url: null,
    mairie_date: show.civil ? (t === 'complet' ? day(-1) : day(0)) : null, mairie_hour: show.civil ? '10:00' : null,
    mairie_location: show.civil ? 'Mairie de Cocody' : null, mairie_maps_url: null,
    religious_date: show.religious ? day(0) : null, religious_hour: show.religious ? (t === 'complet' ? '10:00' : '15:00') : null,
    religious_location: show.religious ? 'Cathédrale Saint-Paul, Plateau' : null, religious_maps_url: null,
    reception_date: show.reception ? day(0) : null, reception_hour: show.reception ? '19:30' : null,
    reception_location: show.reception ? 'Salle des fêtes Les Palmiers, Cocody' : null, reception_maps_url: null,
    practical_info: INFOS,
    referral_code: null,
    family_1: 'Kouassi',
    family_2: 'Yao',
    dress_code: show.dot ? 'pagne' : t === 'civil' ? 'couleurs' : null,
    dress_colors: t === 'civil' ? ['#1e3a5f', '#c9962b'] : [],
    ceremony_pagne: show.dot ? PAGNE : null,
    preview_guest_name: guestName?.trim().slice(0, 60) || '',
  };
}

// Lien à envoyer au prospect
export function demoUrl(origin: string, template: string, type: DemoType, guestName?: string) {
  const q = new URLSearchParams({ tpl: template, c: type });
  if (guestName?.trim()) q.set('n', guestName.trim().slice(0, 60));
  return `${origin}/rsvp/demo?${q.toString()}`;
}
