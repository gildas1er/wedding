// Déroulé du Jour J : types et utilitaires partagés par la page et sa version imprimable.

export type PlanningEvent = {
  id: string;
  marriage_id?: string;
  start_time: string; // "HH:MM:SS"
  end_time?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  is_major_step?: boolean | null;
  responsible?: string | null;
  responsible_contact?: string | null;
};

// "14:30:00" -> "14h30"
export function formatTime(t?: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${Number(h)}h${m ?? '00'}`;
}

export function timeRange(e: Pick<PlanningEvent, 'start_time' | 'end_time'>) {
  return e.end_time ? `${formatTime(e.start_time)} – ${formatTime(e.end_time)}` : formatTime(e.start_time);
}

export const sortEvents = <T extends Pick<PlanningEvent, 'start_time'>>(list: T[]) =>
  [...list].sort((a, b) => a.start_time.localeCompare(b.start_time));

// Lien cliquable pour le contact : appel si c'est un numéro, e-mail sinon
export function contactHref(contact?: string | null) {
  const c = contact?.trim();
  if (!c) return null;
  if (c.includes('@')) return `mailto:${c}`;
  const digits = c.replace(/[^\d+]/g, '');
  if (digits.replace('+', '').length < 8) return null;
  // Numéro ivoirien à 10 chiffres sans indicatif -> +225
  return `tel:${digits.startsWith('+') ? digits : digits.length === 10 ? `+225${digits}` : digits}`;
}

// Erreur PostgREST quand la migration 8 n'a pas encore été appliquée
export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(error && (error.code === 'PGRST204' || /column .* (does not exist|not find)/i.test(error.message ?? '')));
}

export const EXTRA_FIELDS = ['end_time', 'responsible', 'responsible_contact'] as const;

// Date du mariage (AAAA-MM-JJ) comparée à aujourd'hui, en heure locale
export function daysUntil(weddingDate?: string | null) {
  if (!weddingDate) return null;
  const [y, m, d] = weddingDate.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - t0) / 86_400_000);
}

export function formatWeddingDate(weddingDate?: string | null) {
  if (!weddingDate) return '';
  const date = new Date(`${weddingDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const s = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Le jour J : moment en cours et moment suivant
export function liveStatus(events: PlanningEvent[], now = new Date()) {
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  const sorted = sortEvents(events);
  const nextIndex = sorted.findIndex((e) => e.start_time > hhmm);
  const next = nextIndex === -1 ? null : sorted[nextIndex];
  const lastStarted = nextIndex === -1 ? sorted[sorted.length - 1] : sorted[nextIndex - 1];
  const current = lastStarted && (!lastStarted.end_time || lastStarted.end_time > hhmm) ? lastStarted : null;
  return { current: current ?? null, next };
}

// Version « invités » : les moments clés s'il y en a, sinon tout le déroulé
export function guestEvents(events: PlanningEvent[]) {
  const major = events.filter((e) => e.is_major_step);
  return sortEvents(major.length ? major : events);
}

export function deroulText(couple: string, weddingDate: string | null | undefined, events: PlanningEvent[], team = false) {
  const lines = [`💍 Déroulé du mariage${couple ? ` de ${couple}` : ''}`];
  const date = formatWeddingDate(weddingDate);
  if (date) lines.push(`📅 ${date}`);
  lines.push('');
  for (const e of events) {
    lines.push(`🕐 ${timeRange(e)} · ${e.title}`);
    if (e.location) lines.push(`   📍 ${e.location}`);
    if (team && e.responsible) lines.push(`   👤 ${e.responsible}${e.responsible_contact ? ` (${e.responsible_contact})` : ''}`);
    if (team && e.description) lines.push(`   📝 ${e.description.replace(/\n+/g, ' ')}`);
  }
  return lines.join('\n');
}
