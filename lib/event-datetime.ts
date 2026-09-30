// Dates et heures des cérémonies.
// Stockage : date "AAAA-MM-JJ" et heure "HH:MM" (formats des sélecteurs natifs).
// Les anciennes saisies en texte libre ("Jeudi 27 août 2026", "09h00") sont converties à la lecture.

const MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
  aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, décembre: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

function isValidDate(y: number, m: number, d: number) {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// "2026-08-27", "27/08/2026", "Jeudi 27 août 2026", "27 août" (année du mariage par défaut)
export function toISODate(value: string | null | undefined, fallbackYear?: number): string | null {
  if (!value) return null;
  const text = value.trim().toLowerCase();

  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return isValidDate(+m[1], +m[2], +m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;

  m = text.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return isValidDate(y, +m[2], +m[1]) ? `${y}-${pad(+m[2])}-${pad(+m[1])}` : null;
  }

  m = text.match(/(\d{1,2})(?:er)?\s+([a-zéû]+)(?:\s+(\d{4}))?/);
  if (m && MONTHS[m[2]]) {
    const y = m[3] ? +m[3] : fallbackYear ?? new Date().getFullYear();
    return isValidDate(y, MONTHS[m[2]], +m[1]) ? `${y}-${pad(MONTHS[m[2]])}-${pad(+m[1])}` : null;
  }
  return null;
}

// "09:00", "9h", "14h30", "14 H 30" -> "HH:MM"
export function toHHMM(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2})\s*(?:[h:]\s*(\d{2})?)?/i);
  if (!m) return null;
  const h = +m[1];
  const min = m[2] ? +m[2] : 0;
  return h < 24 && min < 60 ? `${pad(h)}:${pad(min)}` : null;
}

// -> "Jeudi 27 août 2026" (ou le texte d'origine s'il n'est pas reconnu)
export function formatDateFr(value: string | null | undefined, { withYear = true } = {}): string {
  const iso = toISODate(value);
  if (!iso) return value ?? '';
  const date = new Date(`${iso}T12:00:00`);
  const s = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });
  // « 1 décembre » -> « 1er décembre »
  const withOrdinal = s.replace(/^(\S+ )1 /, (_, weekday) => `${weekday}1er `);
  return withOrdinal.charAt(0).toUpperCase() + withOrdinal.slice(1);
}

// -> "09h00" (ou le texte d'origine s'il n'est pas reconnu)
export function formatHourFr(value: string | null | undefined): string {
  const hhmm = toHHMM(value);
  return hhmm ? hhmm.replace(':', 'h') : value ?? '';
}
