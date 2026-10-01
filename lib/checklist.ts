// Checklist : catégories, périodes, échéances et liste type (mariage en Côte d'Ivoire).

export type Task = {
  id: string;
  marriage_id?: string;
  title: string;
  category?: string | null;
  priority?: string | null; // 'haute' | 'moyenne' | 'basse'
  due_months_before?: number | null;
  is_completed?: boolean | null;
  notes?: string | null;
  assigned_to?: string | null;
  completed_at?: string | null;
  created_at?: string;
};

export const CATEGORIES = [
  'Général', 'Cérémonie', 'Administratif', 'Réception', 'Prestataires',
  'Tenues & beauté', 'Invités', 'Finance', 'Logistique',
] as const;

export const PRIORITIES = [
  { id: 'haute', label: 'Haute' },
  { id: 'moyenne', label: 'Moyenne' },
  { id: 'basse', label: 'Basse' },
] as const;

export const ASSIGNEES = ['Les mariés', 'La mariée', 'Le marié', 'La famille', 'Les témoins', 'Le wedding planner'];

// Échéances proposées (en mois avant le mariage)
export const DUE_OPTIONS = [12, 10, 9, 8, 6, 5, 4, 3, 2, 1, 0];

export const dueLabel = (months: number) =>
  months <= 0 ? 'Le dernier mois' : `${months} mois avant`;

// Périodes d'affichage
export const PERIODS = [
  { id: 'p12', min: 12, max: Infinity, label: '12 mois et plus avant' },
  { id: 'p9', min: 9, max: 11, label: '9 à 12 mois avant' },
  { id: 'p6', min: 6, max: 8, label: '6 à 9 mois avant' },
  { id: 'p3', min: 3, max: 5, label: '3 à 6 mois avant' },
  { id: 'p1', min: 1, max: 2, label: '1 à 3 mois avant' },
  { id: 'p0', min: -Infinity, max: 0, label: 'Le dernier mois' },
] as const;

export const periodOf = (months: number) => PERIODS.find((p) => months >= p.min && months <= p.max) ?? PERIODS[PERIODS.length - 1];

const parseWedding = (weddingDate?: string | null) => {
  if (!weddingDate) return null;
  const [y, m, d] = weddingDate.slice(0, 10).split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

// Date limite = date du mariage moins N mois (le dernier mois : la veille du mariage)
export function deadline(weddingDate: string | null | undefined, months: number) {
  const w = parseWedding(weddingDate);
  if (!w) return null;
  if (months <= 0) return new Date(w.getFullYear(), w.getMonth(), w.getDate() - 1);
  return new Date(w.getFullYear(), w.getMonth() - months, w.getDate());
}

export type TaskState = 'done' | 'late' | 'soon' | 'later';

export function taskState(task: Task, weddingDate?: string | null, today = new Date()): TaskState {
  if (task.is_completed) return 'done';
  const d = deadline(weddingDate, task.due_months_before ?? 0);
  if (!d) return 'later';
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (d < t0) return 'late';
  return (d.getTime() - t0.getTime()) / 86_400_000 <= 30 ? 'soon' : 'later';
}

export const formatDeadline = (d: Date | null) =>
  d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

// Raccourcis vers les pages de l'application selon l'intitulé de la tâche
const LINKS: [RegExp, string, string][] = [
  [/studio|invitation en ligne/i, '/dashboard/studio', 'Studio'],
  [/invitation|faire-part|relancer les invités/i, '/dashboard/invite', 'Invités'],
  [/liste d.invités/i, '/dashboard/invite', 'Invités'],
  [/plan de table/i, '/dashboard/table', 'Plan de table'],
  [/déroulé/i, '/dashboard/planning', 'Jour J'],
  [/budget|enveloppes/i, '/dashboard/budget', 'Budget'],
];

export function taskLink(title: string) {
  const hit = LINKS.find(([re]) => re.test(title));
  return hit ? { href: hit[1], label: hit[2] } : null;
}

// Erreur PostgREST quand la migration 9 n'a pas encore été appliquée
export const TASK_EXTRA_FIELDS = ['notes', 'assigned_to', 'completed_at'] as const;

export type TemplateTask = { key: string; title: string; category: string; priority: 'haute' | 'moyenne' | 'basse'; due_months_before: number; notes?: string };

const T = (due: number, category: string, priority: TemplateTask['priority'], title: string, notes?: string): TemplateTask =>
  ({ key: `${due}-${title}`, title, category, priority, due_months_before: due, notes });

export const TEMPLATE_TASKS: TemplateTask[] = [
  T(12, 'Général', 'haute', 'Choisir la date et les cérémonies (dot, mairie, religieux)'),
  T(12, 'Finance', 'haute', 'Fixer le budget global et qui finance quoi'),
  T(12, 'Invités', 'moyenne', 'Établir une première liste d’invités'),
  T(12, 'Réception', 'haute', 'Visiter et réserver la salle de réception'),
  T(10, 'Cérémonie', 'haute', 'Organiser la dot / le mariage coutumier avec les deux familles'),
  T(10, 'Prestataires', 'haute', 'Choisir et réserver le traiteur'),
  T(10, 'Prestataires', 'haute', 'Réserver le photographe et le vidéaste'),
  T(10, 'Cérémonie', 'moyenne', 'Rencontrer la paroisse ou le lieu de culte'),
  T(9, 'Prestataires', 'moyenne', 'Réserver le DJ ou l’orchestre'),
  T(9, 'Prestataires', 'moyenne', 'Choisir le maître de cérémonie'),
  T(9, 'Général', 'moyenne', 'Choisir les témoins, garçons et demoiselles d’honneur'),
  T(8, 'Cérémonie', 'moyenne', 'Commencer la préparation au mariage religieux'),
  T(6, 'Tenues & beauté', 'haute', 'Choisir la robe et le costume'),
  T(6, 'Tenues & beauté', 'moyenne', 'Choisir le pagne / tissu des familles et du cortège'),
  T(6, 'Invités', 'moyenne', 'Créer l’invitation en ligne dans le Studio'),
  T(6, 'Prestataires', 'moyenne', 'Choisir le décorateur et le thème de la salle'),
  T(6, 'Logistique', 'basse', 'Prévoir l’hébergement des invités venant de loin'),
  T(4, 'Invités', 'haute', 'Envoyer les invitations WhatsApp'),
  T(4, 'Cérémonie', 'moyenne', 'Commander les alliances'),
  T(4, 'Logistique', 'moyenne', 'Réserver les voitures du cortège'),
  T(4, 'Réception', 'moyenne', 'Choisir le gâteau'),
  T(3, 'Administratif', 'haute', 'Déposer le dossier de mariage à la mairie', 'Extraits d’acte de naissance, pièces d’identité, certificats de résidence, pièces des témoins. Vérifier la liste exacte auprès de la mairie.'),
  T(3, 'Tenues & beauté', 'moyenne', 'Réserver coiffure et maquillage (avec essai)'),
  T(3, 'Réception', 'moyenne', 'Valider le menu et faire la dégustation'),
  T(2, 'Invités', 'moyenne', 'Relancer les invités qui n’ont pas répondu'),
  T(2, 'Réception', 'basse', 'Commander les dragées et les cadeaux invités'),
  T(2, 'Général', 'moyenne', 'Préparer le déroulé du Jour J'),
  T(1, 'Réception', 'haute', 'Faire le plan de table'),
  T(1, 'Réception', 'haute', 'Donner le nombre final d’invités au traiteur'),
  T(1, 'Prestataires', 'haute', 'Confirmer chaque prestataire (horaires, lieux, acomptes)'),
  T(1, 'Tenues & beauté', 'moyenne', 'Faire l’essayage final des tenues'),
  T(1, 'Administratif', 'moyenne', 'Vérifier la publication des bans à la mairie'),
  T(0, 'Général', 'moyenne', 'Imprimer et partager le déroulé avec l’équipe'),
  T(0, 'Finance', 'moyenne', 'Préparer les enveloppes de paiement des prestataires'),
  T(0, 'Tenues & beauté', 'moyenne', 'Récupérer les tenues et les alliances'),
  T(0, 'Logistique', 'basse', 'Préparer le kit du Jour J (couture, mouchoirs, chargeurs…)'),
  T(0, 'Général', 'basse', 'Se reposer et profiter !'),
];

export const normalizeTitle = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
