// Rubriques pratiques de l'invitation (dress code, contact, hébergement…).
import { isHttpUrl } from './ceremonies';
import { isHexColor } from './palettes';
import { normalizePhone } from './phone';

export type InfoKind = 'dress_code' | 'contact' | 'accommodation' | 'access' | 'gifts' | 'custom';

export type PracticalInfo = {
  id: string;
  kind: InfoKind;
  title: string;
  text: string;
  name?: string;     // contact
  phone?: string;    // contact
  url?: string;      // cadeaux, hébergement, accès
  colors?: string[]; // dress code
};

export const MAX_INFOS = 12;
export const LIMITS = { title: 60, text: 600, name: 60, phone: 25, url: 500, colors: 5 };

export const INFO_PRESETS: Record<InfoKind, { label: string; title: string; placeholder: string }> = {
  dress_code: { label: 'Dress code', title: 'Dress code', placeholder: 'Ex : Tenue de soirée. Pagne bienvenu pour la cérémonie traditionnelle.' },
  contact: { label: 'Contact', title: 'Une question ?', placeholder: 'Ex : Notre témoin se tient à votre disposition.' },
  accommodation: { label: 'Hébergement', title: 'Hébergement', placeholder: 'Ex : Chambres à tarif préférentiel à l’hôtel… avec le code MARIAGE.' },
  access: { label: 'Accès & parking', title: 'Accès & parking', placeholder: 'Ex : Parking gratuit sur place. Navette depuis l’église à 13h.' },
  gifts: { label: 'Liste de cadeaux', title: 'Liste de cadeaux', placeholder: 'Ex : Votre présence est notre plus beau cadeau. Pour ceux qui le souhaitent…' },
  custom: { label: 'Rubrique libre', title: 'Bon à savoir', placeholder: 'Ex : La cérémonie commence à l’heure, merci d’arriver 15 minutes avant.' },
};

export function newInfo(kind: InfoKind): PracticalInfo {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    kind,
    title: INFO_PRESETS[kind].title,
    text: '',
    ...(kind === 'contact' ? { name: '', phone: '' } : {}),
    ...(kind === 'dress_code' ? { colors: [] } : {}),
    ...(['gifts', 'accommodation', 'access'].includes(kind) ? { url: '' } : {}),
  };
}

const KINDS = Object.keys(INFO_PRESETS) as InfoKind[];
const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

// Lecture sûre des données (base ou aperçu) : seuls les champs attendus, bornés, sont conservés
export function sanitizeInfos(raw: unknown): PracticalInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_INFOS).flatMap((item: any) => {
    if (!item || typeof item !== 'object' || !KINDS.includes(item.kind)) return [];
    const info: PracticalInfo = {
      id: clip(item.id, 64) || `${Math.random()}`,
      kind: item.kind,
      title: clip(item.title, LIMITS.title),
      text: clip(item.text, LIMITS.text),
    };
    if (item.kind === 'contact') { info.name = clip(item.name, LIMITS.name); info.phone = clip(item.phone, LIMITS.phone); }
    if (typeof item.url === 'string') info.url = clip(item.url, LIMITS.url);
    if (Array.isArray(item.colors)) info.colors = item.colors.filter(isHexColor).slice(0, LIMITS.colors);
    return [info];
  });
}

// Avant publication : rubriques vides retirées, liens et numéros vérifiés
export function prepareInfosForSave(infos: PracticalInfo[]): { infos: PracticalInfo[]; error: string | null } {
  const kept = sanitizeInfos(infos).filter((i) => i.title.trim() || i.text.trim() || i.phone?.trim() || i.url?.trim() || i.colors?.length);
  for (const i of kept) {
    if (i.url && !isHttpUrl(i.url)) return { infos: kept, error: `Le lien de la rubrique « ${i.title || INFO_PRESETS[i.kind].label} » doit commencer par https://` };
    if (i.phone && !normalizePhone(i.phone)) return { infos: kept, error: `Le numéro de la rubrique « ${i.title || INFO_PRESETS[i.kind].label} » n'est pas valide.` };
  }
  return { infos: kept.map((i) => ({ ...i, phone: i.phone ? normalizePhone(i.phone)! : i.phone })), error: null };
}
