// Offre gratuite / paliers Premium : constantes partagées par l'interface et le serveur.
// Les limites sont aussi appliquées par la base (migration 17) : ce fichier sert à l'affichage.
// Les invités se comptent en personnes (fiche + accompagnants), sauf pour les comptes gratuits
// créés avant la migration 17, qui gardent la règle d'origine (30 fiches).

export const FREE_GUEST_LIMIT = 30;

export const TIERS = [
  { id: 'intime', label: 'Intime', max: 100, price: 50000 },
  { id: 'famille', label: 'Famille', max: 150, price: 75000 },
  { id: 'grande_fete', label: 'Grande Fête', max: 200, price: 100000 },
  { id: 'prestige', label: 'Prestige', max: 250, price: 125000 },
  { id: 'royal', label: 'Royal', max: 300, price: 150000 },
] as const;
export type TierId = (typeof TIERS)[number]['id'];
export const CUSTOM_TIER = { id: 'sur_mesure', label: 'Sur mesure', min: 301 } as const;

// Prix d'entrée (premier palier), conservé pour le paiement en ligne
export const PREMIUM_PRICE_XOF = TIERS[0].price;
export const PREMIUM_ACCESS_MONTHS_AFTER_WEDDING = 1;

// Paiement en ligne GeniusPay : désactivé pour l'instant, l'activation se fait par contact direct.
// Passer à true (et configurer les variables GENIUSPAY_* sur Vercel) pour réactiver le paiement en ligne.
export const ONLINE_PAYMENT_ENABLED = false;

// Contact pour activer le Premium (appel ou WhatsApp)
export const PREMIUM_CONTACT = { display: '01 01 54 06 87', phone: '+2250101540687' };

const waLink = (text: string) => `https://api.whatsapp.com/send?phone=${PREMIUM_CONTACT.phone.replace('+', '')}&text=${encodeURIComponent(text)}`;
const refOf = (marriageId?: string | null) => (marriageId ? ` (référence ${marriageId.slice(0, 8)})` : '');

export function premiumWhatsappLink(couple: string, marriageId?: string | null) {
  return waLink(`Bonjour, je souhaite activer WeddingStudio Premium pour le mariage${couple ? ` de ${couple}` : ''}${refOf(marriageId)}.`);
}

// Message prérempli pour un palier (ou un passage au palier supérieur, en payant la différence)
export function tierWhatsappLink(couple: string, marriageId: string | null | undefined, target: TierId | 'sur_mesure', current?: TierId | null, persons?: number) {
  const who = `pour le mariage${couple ? ` de ${couple}` : ''}${refOf(marriageId)}`;
  if (target === 'sur_mesure') {
    return waLink(`Bonjour, je souhaite un devis WeddingStudio pour plus de 300 invités${persons ? ` (environ ${persons})` : ''} ${who}.`);
  }
  const t = tierById(target)!;
  if (current && tierById(current)) {
    return waLink(`Bonjour, je souhaite passer du palier ${tierById(current)!.label} au palier ${t.label} (jusqu'à ${t.max} invités, différence de ${formatXof(upgradePrice(current, target))}) ${who}.`);
  }
  return waLink(`Bonjour, je souhaite le palier ${t.label} de WeddingStudio (jusqu'à ${t.max} invités, ${formatXof(t.price)}) ${who}.`);
}

export const PREMIUM_FEATURES = [
  'Jusqu’à 300 invités selon votre palier (plus sur devis)',
  'Import CSV sans limite',
  'Invitations WhatsApp et RSVP pour tous vos proches',
  'Plan de table, exports traiteur et listes à imprimer',
  'Faire-part, album photos et livre d’or',
] as const;

type PlanLike = { plan?: string | null; premium_until?: string | null; tier?: string | null; guest_limit?: number | null; legacy_free_fiches?: boolean | null } | null | undefined;

export function isPremium(m: PlanLike) {
  if (m?.plan !== 'premium') return false;
  return !m.premium_until || new Date(m.premium_until).getTime() > Date.now();
}

export const formatXof = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;

export const tierById = (id?: string | null) => TIERS.find((t) => t.id === id);

// Palier conseillé pour un nombre de personnes (null : plus de 300, sur devis)
export function recommendedTier(persons: number) {
  return TIERS.find((t) => persons <= t.max) ?? null;
}

// Passage d'un palier à un autre : on ne paie que la différence
export function upgradePrice(current: string | null | undefined, target: TierId) {
  const t = tierById(target)!;
  const c = tierById(current);
  return Math.max(0, t.price - (c?.price ?? 0));
}

type GuestLike = { guests_count?: number | null };
export const countPersons = (guests: GuestLike[]) => guests.reduce((s, g) => s + Math.max(1, Number(g.guests_count) || 1), 0);

// Limite applicable (même règle que marriage_guest_quota, migration 17)
export function guestQuota(m: PlanLike, guests: GuestLike[]) {
  const premium = isPremium(m);
  // Base pas encore à jour (migration 17) : un compte Premium reste illimité, comme avant
  const limit: number | null = premium ? (m?.guest_limit ?? null) : FREE_GUEST_LIMIT;
  // Gratuit : en personnes pour les comptes créés après la migration 17 (legacy_free_fiches = false), sinon en fiches
  const byPersons = premium ? true : m?.legacy_free_fiches === false;
  const used = byPersons ? countPersons(guests) : guests.length;
  const tier = premium ? (tierById(m?.tier) ?? null) : null;
  return {
    premium,
    tier,
    tierId: (m?.tier ?? null) as string | null,
    limit,
    byPersons,
    used,
    remaining: limit === null ? Infinity : Math.max(0, limit - used),
    unit: byPersons ? 'invités' : 'fiches',
  };
}
export type GuestQuota = ReturnType<typeof guestQuota>;

// Erreur renvoyée par la base quand la limite gratuite est atteinte
export function isGuestLimitError(error: { message?: string; hint?: string } | null | undefined) {
  return Boolean(error && (error.message?.includes('GUEST_LIMIT_REACHED') || error.hint === 'premium'));
}
