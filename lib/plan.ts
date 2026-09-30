// Offre gratuite / Premium : constantes partagées par l'interface et le serveur.
// La limite est aussi appliquée par la base (migration 7) : ce fichier sert à l'affichage.

export const FREE_GUEST_LIMIT = 30;
export const PREMIUM_PRICE_XOF = 25000;
export const PREMIUM_ACCESS_MONTHS_AFTER_WEDDING = 6;

// Paiement en ligne GeniusPay : désactivé pour l'instant, l'activation se fait par contact direct.
// Passer à true (et configurer les variables GENIUSPAY_* sur Vercel) pour réactiver le paiement en ligne.
export const ONLINE_PAYMENT_ENABLED = false;

// Contact pour activer le Premium (appel ou WhatsApp)
export const PREMIUM_CONTACT = { display: '01 01 54 06 87', phone: '+2250101540687' };

export function premiumWhatsappLink(couple: string, marriageId?: string | null) {
  const ref = marriageId ? ` (référence ${marriageId.slice(0, 8)})` : '';
  const text = `Bonjour, je souhaite activer WeddingStudio Premium pour le mariage${couple ? ` de ${couple}` : ''}${ref}.`;
  return `https://api.whatsapp.com/send?phone=${PREMIUM_CONTACT.phone.replace('+', '')}&text=${encodeURIComponent(text)}`;
}

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
