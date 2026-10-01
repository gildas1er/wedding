// Modèle de déroulé : une journée type, calée sur les heures saisies dans le Studio.
import { toHHMM, toISODate } from './event-datetime';
import { formatWeddingDate } from './planning';

export type TemplateMoment = {
  key: string;
  start_time: string; // "HH:MM"
  end_time: string | null;
  title: string;
  location: string | null;
  responsible: string | null;
  description: string | null;
  is_major_step: boolean;
  dayNote?: string | null; // affiché dans l'aperçu seulement, jamais enregistré
};

type MarriageLike = Record<string, unknown> & { wedding_date?: string | null };

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

// "HH:MM" décalé de n minutes, borné à la journée
function shift(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Mention du jour quand une cérémonie n'a pas lieu le jour du mariage (ex : mairie la veille)
function otherDayNote(m: MarriageLike, dateKey: string) {
  const wedding = m.wedding_date?.slice(0, 10);
  const iso = toISODate(str(m[dateKey]) ?? '', wedding ? Number(wedding.slice(0, 4)) : undefined);
  return iso && wedding && iso !== wedding ? `⚠️ ${formatWeddingDate(iso)}` : null;
}

export function buildTemplate(m: MarriageLike) {
  const fromStudio: string[] = [];
  const anchor = (key: string, fallback: string, label: string) => {
    const hhmm = toHHMM(str(m[key]) ?? '');
    if (hhmm) fromStudio.push(`${label} ${hhmm.replace(':', 'h')}`);
    return hhmm ?? fallback;
  };

  // Cérémonies affichées dans le Studio (par défaut : mairie + réception, comme le Studio)
  const civil = m.show_civil !== false;
  const religious = m.show_religious === true;
  const reception = m.show_reception !== false;

  const moments: TemplateMoment[] = [];
  const add = (key: string, start: string, durationMin: number | null, title: string, extra: Partial<TemplateMoment> = {}) =>
    moments.push({
      key, start_time: start, end_time: durationMin ? shift(start, durationMin) : null, title,
      location: null, responsible: null, description: null, is_major_step: false, ...extra,
    });

  const civilAt = civil ? anchor('mairie_hour', '10:00', 'mairie') : null;
  const churchAt = religious ? anchor('religious_hour', civil ? '14:00' : '11:00', 'église') : null;
  const receptionAt = reception ? anchor('reception_hour', '19:00', 'réception') : null;

  const civilNote = civil ? otherDayNote(m, 'mairie_date') : null;
  const churchNote = religious ? otherDayNote(m, 'religious_date') : null;
  const receptionNote = reception ? otherDayNote(m, 'reception_date') : null;

  // Les préparatifs se calent sur la première cérémonie du jour J (pas sur une mairie la veille)
  const sameDay = [civilNote ? null : civilAt, churchNote ? null : churchAt, receptionNote ? null : receptionAt].filter(Boolean) as string[];
  const first = sameDay.sort()[0] ?? '10:00';
  add('preparatifs', shift(first, -180), 150, 'Préparatifs des mariés', {
    responsible: 'Coiffure & maquillage',
    description: 'Coiffure, maquillage, habillage. Photos des préparatifs.',
  });

  if (civilAt) {
    const location = str(m.mairie_location);
    const note = civilNote;
    add('accueil-mairie', shift(civilAt, -30), 30, 'Accueil des invités à la mairie', { location, description: note, dayNote: note });
    add('civil', civilAt, 45, 'Cérémonie civile', {
      location, is_major_step: true, responsible: 'Témoins', dayNote: note,
      description: ['Pièces d’identité et livret de famille à prévoir.', note].filter(Boolean).join('\n'),
    });
  }

  if (churchAt) {
    const location = str(m.religious_location);
    const note = churchNote;
    add('religieux', churchAt, 90, 'Cérémonie religieuse', {
      location, is_major_step: true, responsible: 'Officiant', dayNote: note,
      description: ['Alliances, livret de messe, quête.', note].filter(Boolean).join('\n'),
    });
    add('photos', shift(churchAt, 90), 60, 'Séance photo des mariés et des familles', { location, responsible: 'Photographe' });
  } else if (civilAt) {
    add('photos', shift(civilAt, 45), 60, 'Séance photo des mariés et des familles', { location: str(m.mairie_location), responsible: 'Photographe' });
  }

  if (receptionAt) {
    const location = str(m.reception_location);
    add('cocktail', receptionAt, 60, 'Accueil des invités et cocktail', { location, responsible: 'Protocole / hôtesses', description: receptionNote, dayNote: receptionNote });
    add('entree', shift(receptionAt, 60), 15, 'Entrée des mariés', {
      location, is_major_step: true, responsible: 'Maître de cérémonie',
      description: 'Ordre d’entrée : parents, témoins, garçons et demoiselles d’honneur, mariés.\nMusique d’entrée à confirmer avec le DJ.',
    });
    add('discours', shift(receptionAt, 75), 30, 'Mots des familles et des témoins', { location, responsible: 'Maître de cérémonie' });
    add('diner', shift(receptionAt, 105), 90, 'Dîner', { location, responsible: 'Traiteur' });
    add('gateau', shift(receptionAt, 195), 20, 'Découpe du gâteau', { location, is_major_step: true, responsible: 'Traiteur' });
    add('bal', shift(receptionAt, 215), null, 'Ouverture du bal', { location, is_major_step: true, responsible: 'DJ' });
  }

  return { moments: moments.sort((a, b) => a.start_time.localeCompare(b.start_time)), fromStudio };
}
