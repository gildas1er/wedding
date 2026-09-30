// Offre gratuite / Premium : constantes partagées par l'interface et le serveur.
// La limite est aussi appliquée par la base (migration 7) : ce fichier sert à l'affichage.

export const FREE_GUEST_LIMIT = 30;
export const PREMIUM_PRICE_XOF = 25000;
export const PREMIUM_ACCESS_MONTHS_AFTER_WEDDING = 6;

export const PREMIUM_FEATURES = [
  'Invités illimités (au-delà de 30 fiches)',
  'Import CSV sans limite',
  'Invitations WhatsApp et RSVP pour tous vos proches',
  'Plan de table, exports traiteur et listes à imprimer',
  'Faire-part, album photos et livre d’or',
] as const;

type PlanLike = { plan?: string | null; premium_until?: string | null } | null | undefined;

export function isPremium(m: PlanLike) {
  if (m?.plan !== 'premium') return false;
  return !m.premium_until || new Date(m.premium_until).getTime() > Date.now();
}

export const formatXof = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;

// Erreur renvoyée par la base quand la limite gratuite est atteinte
export function isGuestLimitError(error: { message?: string; hint?: string } | null | undefined) {
  return Boolean(error && (error.message?.includes('GUEST_LIMIT_REACHED') || error.hint === 'premium'));
}
