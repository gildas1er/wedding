// Offre de lancement : -30 % sur la PREMIÈRE formule d'un couple (Intime à Royal),
// pour une formule activée au plus tard le 20 décembre 2026 (fin de journée, heure d'Abidjan = UTC).
// - Sans code à saisir : la réduction est calculée toute seule.
// - Pas pour une montée de palier (le couple a déjà une formule), ni la prolongation, ni le sur-mesure.
// - Non cumulable avec un code promo ou de parrainage : la réduction la plus avantageuse s'applique.
// - Date qui compte : celle de l'activation de la formule dans l'administration.
// Après la date, tout disparaît sans redéploiement (calcul à l'heure de la visite).
import { discountFor, type AppliedCode } from './promo';

export const LAUNCH_OFFER = {
  percent: 30,
  endsAt: Date.parse('2026-12-21T00:00:00Z'), // le 20 décembre 2026 compris
  endLabel: '20 décembre 2026',
  shortEnd: '20 décembre',
} as const;

export const launchOfferActive = (now: number = Date.now()) => now < LAUNCH_OFFER.endsAt;

// Montant de la réduction, arrondi à la centaine (50 000 F → 15 000 F)
export const launchDiscount = (price: number) => (price > 0 ? Math.round((price * LAUNCH_OFFER.percent) / 100 / 100) * 100 : 0);

// Premier paiement : le couple n'a encore aucune formule payée
export const isFirstPurchase = (m: { tier?: string | null; plan?: string | null } | null | undefined) =>
  !m?.tier && m?.plan !== 'premium';

export type Reduction = { kind: 'launch'; discount: number } | { kind: 'code'; discount: number; code: string };

// Meilleure réduction pour un prix : offre de lancement (si elle s'applique) ou code saisi, jamais les deux
export function bestReduction(price: number, { launch, code }: { launch: boolean; code?: Pick<AppliedCode, 'code' | 'discount_type' | 'discount_value'> | null }): Reduction | null {
  const fromLaunch = launch ? launchDiscount(price) : 0;
  const fromCode = code ? discountFor(price, code) : 0;
  if (fromLaunch <= 0 && fromCode <= 0) return null;
  return fromLaunch >= fromCode ? { kind: 'launch', discount: fromLaunch } : { kind: 'code', discount: fromCode, code: code!.code };
}
