// Codes promo et parrainage (migration 19) : calcul de la réduction et messages, partagés par l'interface et le serveur.
// Les montants du parrainage sont aussi écrits dans la fonction SQL my_code() : garder les deux identiques.

export const REFERRAL_DISCOUNT_XOF = 5000; // réduction du couple parrainé sur son premier palier
export const REFERRAL_REWARD_XOF = 5000;   // récompense du parrain quand son filleul paie

export type AppliedCode = {
  code: string;
  kind: 'promo' | 'parrainage';
  label: string | null;
  discount_type: 'percent' | 'amount';
  discount_value: number;
  used: boolean;   // déjà appliqué à un paiement
  valid: boolean;  // encore utilisable (actif, pas expiré)
  valid_until?: string | null;
};

export type PromoCode = {
  code: string; label: string | null; discount_type: 'percent' | 'amount'; discount_value: number;
  valid_until: string | null; max_uses: number | null; active: boolean;
  partner_name: string | null; partner_phone: string | null; commission_xof: number; created_at: string;
};

// Format accepté pour un code promo : lettres, chiffres et tirets
export const normalizeCode = (raw: string) => raw.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '');
export const isValidPromoCode = (code: string) => /^[A-Z0-9-]{3,24}$/.test(code);

// Réduction sur un montant (arrondie à 100 F, jamais plus que le montant)
export function discountFor(price: number, c: Pick<AppliedCode, 'discount_type' | 'discount_value'> | null | undefined) {
  if (!c || price <= 0) return 0;
  const raw = c.discount_type === 'percent' ? (price * Math.min(100, c.discount_value)) / 100 : c.discount_value;
  return Math.min(price, Math.round(raw / 100) * 100);
}

// Code utilisable maintenant (saisi, valide et pas encore consommé)
export const activeCode = (c: AppliedCode | null | undefined) => (c && c.valid && !c.used ? c : null);

export const describeDiscount = (c: Pick<AppliedCode, 'discount_type' | 'discount_value'>) =>
  c.discount_type === 'percent' ? `-${c.discount_value} %` : `-${new Intl.NumberFormat('fr-FR').format(c.discount_value)} F`;

// Lien d'inscription à partager par un couple
export const referralLink = (origin: string, code: string) => `${origin}/register?parrain=${encodeURIComponent(code)}`;

// Code de parrainage gardé entre le lien et la création du compte (inscription Google comprise)
export const REFERRAL_STORAGE_KEY = 'ws-parrain';
