// Cycle de vie d'un espace après le mariage (même règle que la fonction SQL marriage_space_phase, migration 13).
//   • jusqu'à J+1 mois : espace complet ;
//   • ensuite : mode souvenir (lecture seule, téléchargements), pendant 2 mois ;
//   • J+3 mois : suppression automatique, sauf prolongation (kept_until) ou transition (delete_after, migration 34).
//   Le couple reçoit un e-mail au passage en mode souvenir, puis un dernier rappel 3 jours avant la suppression
//   (tâche de nuit /api/cron/purge) : aucun espace n'est supprimé sans ce dernier rappel.
import { PREMIUM_CONTACT } from './plan';

export const ACTIVE_MONTHS_AFTER_WEDDING = 1;
export const DELETE_MONTHS_AFTER_WEDDING = 3;
export const EXTENSION_PRICE_XOF = 5000;
export const EXTENSION_MONTHS = 1;
// Dernier rappel (e-mail, fenêtre à chaque connexion) : n jours avant la suppression
export const FINAL_REMINDER_DAYS = 3;
// Bandeau orange dans l'espace : n jours avant la suppression
export const SOON_DAYS = 14;

export type SpacePhase = 'active' | 'souvenir';

type LifecycleLike = { wedding_date?: string | null; kept_until?: string | null; delete_after?: string | null; final_reminder_at?: string | null; space_phase?: string | null } | null | undefined;

function weddingDay(value?: string | null) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : null;
}

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

export function spaceLifecycle(m: LifecycleLike, now = new Date()) {
  const wedding = weddingDay(m?.wedding_date);
  const kept = m?.kept_until ? new Date(m.kept_until) : null;
  // Transition de 30 jours pour les espaces existants (migration 34)
  const notBefore = m?.delete_after ? new Date(m.delete_after) : null;
  if (!wedding) return { phase: 'active' as SpacePhase, activeUntil: null, deleteAt: null, daysBeforeDeletion: null, weddingPassed: false };

  const baseActive = addMonths(wedding, ACTIVE_MONTHS_AFTER_WEDDING);
  const activeUntil = kept && kept > baseActive ? kept : baseActive;
  const baseDelete = addMonths(wedding, DELETE_MONTHS_AFTER_WEDDING);
  // Dernier rappel parti en retard (e-mails pas encore configurés…) : suppression au moins 3 jours après lui
  const reminder = m?.final_reminder_at ? weddingDay(m.final_reminder_at) : null;
  const afterReminder = reminder ? reminder.getTime() + FINAL_REMINDER_DAYS * 86_400_000 : 0;
  const deleteAt = new Date(Math.max(baseDelete.getTime(), kept?.getTime() ?? 0, notBefore?.getTime() ?? 0, afterReminder));
  // La base fait foi quand elle a calculé la phase (pages invités)
  const phase: SpacePhase = m?.space_phase === 'souvenir' || m?.space_phase === 'active'
    ? (m.space_phase as SpacePhase)
    : now < activeUntil ? 'active' : 'souvenir';
  return {
    phase,
    activeUntil,
    deleteAt,
    daysBeforeDeletion: Math.max(0, Math.ceil((deleteAt.getTime() - now.getTime()) / 86_400_000)),
    weddingPassed: now >= wedding,
  };
}

export const formatLongDate = (d: Date | null) =>
  d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

// Erreur renvoyée par la base quand l'espace est en mode souvenir
export function isSpaceArchivedError(error: { message?: string; hint?: string } | null | undefined) {
  return Boolean(error && (error.message?.includes('SPACE_ARCHIVED') || error.message?.includes('WEDDING_DATE_LOCKED') || error.hint === 'souvenir'));
}

export function extensionWhatsappLink(couple: string, marriageId?: string | null) {
  const ref = marriageId ? ` (référence ${marriageId.slice(0, 8)})` : '';
  const text = `Bonjour, je souhaite prolonger de ${EXTENSION_MONTHS} mois l'espace WeddingStudio du mariage${couple ? ` de ${couple}` : ''}${ref}.`;
  return `https://api.whatsapp.com/send?phone=${PREMIUM_CONTACT.phone.replace('+', '')}&text=${encodeURIComponent(text)}`;
}

// Pages de l'espace encore ouvertes en mode souvenir
export const SOUVENIR_ALLOWED_PATHS = ['/dashboard/souvenir', '/dashboard/album', '/dashboard/invite/print', '/dashboard/planning/print'];
