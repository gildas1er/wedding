// Haut de la page d'invitation : les vraies dates des cérémonies, le compte à rebours et le programme rangé par jour.
import { formatDateFr, toHHMM, toISODate } from './event-datetime';
import { mapsUrl } from './ceremonies';

type Flags = { dot: boolean; civil: boolean; religious: boolean; reception: boolean };
type MarriageLike = { wedding_date?: unknown; [key: string]: unknown };

export type ProgramKind = 'dot' | 'civil' | 'religious' | 'reception';
export type ProgramEvent = { kind: ProgramKind; title: string; date: string | null; hour: string | null; location: string | null; maps: string | null };

const SOURCES: { kind: ProgramKind; prefix: string; title: string }[] = [
  { kind: 'dot', prefix: 'dot', title: 'La cérémonie de dot' },
  { kind: 'civil', prefix: 'mairie', title: 'La cérémonie civile' },
  { kind: 'religious', prefix: 'religious', title: 'La cérémonie religieuse' },
  { kind: 'reception', prefix: 'reception', title: 'Le cocktail & dîner' },
];

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const weddingISO = (m: MarriageLike) => {
  const w = m.wedding_date instanceof Date ? m.wedding_date.toISOString() : text(m.wedding_date);
  return w ? toISODate(w.slice(0, 10)) : null;
};

// Cérémonies prévues, triées par date puis par heure (celles sans date restent à la fin, dans l'ordre habituel)
export function programEvents(m: MarriageLike, flags: Flags): ProgramEvent[] {
  const year = Number(weddingISO(m)?.slice(0, 4)) || undefined;
  const events = SOURCES.filter((s) => flags[s.kind]).map((s, i) => {
    const location = text(m[`${s.prefix}_location`]);
    return {
      i,
      kind: s.kind,
      title: s.title,
      date: toISODate(text(m[`${s.prefix}_date`]), year),
      hour: toHHMM(text(m[`${s.prefix}_hour`])),
      location,
      maps: mapsUrl(text(m[`${s.prefix}_maps_url`]), location),
    };
  });
  events.sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (Boolean(a.date) !== Boolean(b.date)) return a.date ? -1 : 1;
    if (a.date && a.hour && b.hour && a.hour !== b.hour) return a.hour < b.hour ? -1 : 1;
    return a.i - b.i;
  });
  return events.map(({ kind, title, date, hour, location, maps }) => ({ kind, title, date, hour, location, maps }));
}

// Programme rangé par jour : [{ day: '2027-05-27' | null, label: 'Jeudi 27 mai', events }]
export function programByDay(events: ProgramEvent[]) {
  const groups: { day: string | null; label: string; events: ProgramEvent[] }[] = [];
  for (const e of events) {
    const last = groups[groups.length - 1];
    if (last && last.day === e.date) last.events.push(e);
    else groups.push({ day: e.date, label: e.date ? formatDateFr(e.date, { withYear: false }) : 'Date à venir', events: [e] });
  }
  return groups;
}

// « 09:00 » -> « 9 h », « 20:30 » -> « 20 h 30 »
export function hourLabel(hhmm: string | null) {
  if (!hhmm) return null;
  const [h, min] = hhmm.split(':');
  return `${Number(h)} h${min && min !== '00' ? ` ${min}` : ''}`;
}

const longDate = (iso: string, withYear: boolean) => {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });
  return s.replace(/^(\S+ )1 /, (_, w) => `${w}1er `);
};

// « Samedi 29 mai 2027 » ou « Du jeudi 27 au vendredi 28 mai 2027 » d'après les cérémonies,
// sinon la date du mariage saisie dans le compte
export function dateSummary(m: MarriageLike, events: ProgramEvent[]) {
  const days = [...new Set(events.map((e) => e.date).filter(Boolean) as string[])].sort();
  if (days.length === 0) {
    const w = weddingISO(m);
    return { label: w ? cap(longDate(w, true)) : 'Date à venir', several: false, first: w };
  }
  const first = days[0];
  const last = days[days.length - 1];
  if (first === last) return { label: cap(longDate(first, true)), several: false, first };
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  const sameMonth = sameYear && first.slice(5, 7) === last.slice(5, 7);
  const start = sameMonth
    ? longDate(first, false).replace(/\s+\S+$/, '') // « jeudi 27 »
    : longDate(first, !sameYear);
  return { label: `Du ${start} au ${longDate(last, true)}`, several: true, first };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Jours restants avant la première cérémonie (null si elle est passée ou inconnue)
export function daysUntil(iso: string | null, today = new Date()) {
  if (!iso) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, mo, d] = iso.split('-').map(Number);
  const diff = Math.round((new Date(y, mo - 1, d).getTime() - start.getTime()) / 86_400_000);
  return diff >= 0 ? diff : null;
}
