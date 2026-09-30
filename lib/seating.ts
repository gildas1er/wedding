// Plan de table : logique pure (sans React ni base de données).

export type SeatGuest = {
  id: string;
  name: string;
  guests_count: number | null;
  table_id: string | null;
  side?: string | null;
  category?: string | null;
  is_vip?: boolean | null;
  status?: string | null;
};

export type SeatTable = {
  id: string;
  name: string;
  capacity: number | null;
  shape?: string | null; // 'circle' | 'rectangle'
  is_vip?: boolean | null;
  position_x?: number | null;
  position_y?: number | null;
};

export const DEFAULT_CAPACITY = 10;

export const seats = (g: Pick<SeatGuest, 'guests_count'>) => Math.max(1, Number(g.guests_count) || 1);
export const capacityOf = (t: Pick<SeatTable, 'capacity'>) => Math.max(1, Number(t.capacity) || DEFAULT_CAPACITY);
export const sumSeats = (list: SeatGuest[]) => list.reduce((s, g) => s + seats(g), 0);

export const SIDE_LABELS: Record<string, string> = { partenaire_1: 'Marié', partenaire_2: 'Mariée', commun: 'Commun' };
export const sideLabel = (side?: string | null) => SIDE_LABELS[side ?? ''] ?? 'Commun';

const CATEGORY_LABELS: Record<string, string> = { amis: 'Amis', parents: 'Famille', 'collègues': 'Collègues' };
export const categoryLabel = (c?: string | null) => (c ? CATEGORY_LABELS[c] ?? c.charAt(0).toUpperCase() + c.slice(1) : 'Invité');

export function occupancyMap(guests: SeatGuest[]) {
  const map = new Map<string, number>();
  for (const g of guests) if (g.table_id) map.set(g.table_id, (map.get(g.table_id) ?? 0) + seats(g));
  return map;
}

export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export type AutoPlaceResult = { assignments: { guestId: string; tableId: string }[]; unplaced: SeatGuest[] };

// Placement automatique :
// 1. les invités sont regroupés par côté + catégorie (famille du marié, amis communs…) ;
// 2. les groupes les plus nombreux passent d'abord, en visant une seule table qui peut tous les accueillir ;
// 3. sinon chacun est placé à la table la plus ajustée ; les VIP visent d'abord les tables VIP.
export function autoPlace(guests: SeatGuest[], tables: SeatTable[]): AutoPlaceResult {
  const remaining = new Map<string, number>();
  const occ = occupancyMap(guests);
  for (const t of tables) remaining.set(t.id, capacityOf(t) - (occ.get(t.id) ?? 0));

  const toPlace = guests.filter((g) => !g.table_id);
  const clusters = new Map<string, SeatGuest[]>();
  for (const g of toPlace) {
    const key = `${g.is_vip ? 'vip' : ''}|${g.side ?? 'commun'}|${g.category ?? ''}`;
    clusters.set(key, [...(clusters.get(key) ?? []), g]);
  }
  const ordered = [...clusters.values()].sort((a, b) => sumSeats(b) - sumSeats(a));

  const assignments: AutoPlaceResult['assignments'] = [];
  const unplaced: SeatGuest[] = [];
  const vipTables = new Set(tables.filter((t) => t.is_vip).map((t) => t.id));

  const bestFit = (need: number, preferVip: boolean) => {
    const candidates = tables
      .filter((t) => (remaining.get(t.id) ?? 0) >= need)
      .sort((a, b) => {
        const va = preferVip && vipTables.has(a.id) ? 0 : 1;
        const vb = preferVip && vipTables.has(b.id) ? 0 : 1;
        return va - vb || (remaining.get(a.id)! - remaining.get(b.id)!);
      });
    return candidates[0]?.id ?? null;
  };

  for (const cluster of ordered) {
    const members = [...cluster].sort((a, b) => seats(b) - seats(a));
    const preferVip = Boolean(members[0]?.is_vip);
    const whole = bestFit(sumSeats(members), preferVip);
    if (whole) {
      for (const g of members) assignments.push({ guestId: g.id, tableId: whole });
      remaining.set(whole, remaining.get(whole)! - sumSeats(members));
      continue;
    }
    for (const g of members) {
      const tableId = bestFit(seats(g), preferVip);
      if (!tableId) { unplaced.push(g); continue; }
      assignments.push({ guestId: g.id, tableId });
      remaining.set(tableId, remaining.get(tableId)! - seats(g));
    }
  }
  return { assignments, unplaced };
}

// Positions par défaut sur le plan de salle (grille autour de la piste)
export function defaultPosition(index: number) {
  const perRow = 4;
  return { x: 160 + (index % perRow) * 300, y: 520 + Math.floor(index / perRow) * 280 };
}
