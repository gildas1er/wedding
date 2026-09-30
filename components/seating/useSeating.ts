"use client";
// Données et actions du plan de table : mises à jour immédiates à l'écran, enregistrement en
// arrière-plan, retour en arrière si la base refuse, et annulation de la dernière action.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../app/lib/supabase';
import {
  autoPlace, capacityOf, DEFAULT_CAPACITY, occupancyMap, seats, sumSeats, type SeatGuest, type SeatTable,
} from '../../lib/seating';

export type Toast = { id: number; text: string; tone: 'info' | 'error' | 'success'; undo?: () => void };
type Move = { guestId: string; tableId: string | null; from: string | null };

const PENDING_KEY = 'seating:includePending';

export function useSeating() {
  const [marriage, setMarriage] = useState<any>(null);
  const [tables, setTables] = useState<SeatTable[]>([]);
  const [guests, setGuests] = useState<SeatGuest[]>([]);
  const [declinedPlaced, setDeclinedPlaced] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  // Préférence mémorisée dans ce navigateur (confort d'affichage)
  const [includePending, setIncludePendingState] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem(PENDING_KEY) === '1'; } catch { return false; }
  });
  const guestsRef = useRef(guests);
  useEffect(() => { guestsRef.current = guests; }, [guests]);

  const notify = useCallback((t: Omit<Toast, 'id'>) => setToast({ ...t, id: Date.now() }), []);

  const setIncludePending = (v: boolean) => {
    setIncludePendingState(v);
    try { localStorage.setItem(PENDING_KEY, v ? '1' : '0'); } catch {}
  };

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: m } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
    if (!m) { setLoading(false); return; }
    setMarriage(m);
    const [t, g, d] = await Promise.all([
      supabase.from('tables').select('*').eq('marriage_id', m.id).order('created_at', { ascending: true }),
      supabase.from('invite')
        .select('id, name, guests_count, table_id, side, category, is_vip, status, attending_reception')
        .eq('marriage_id', m.id)
        .in('status', ['confirmé', 'en_attente']),
      supabase.from('invite').select('id', { count: 'exact', head: true })
        .eq('marriage_id', m.id).eq('status', 'décliné').not('table_id', 'is', null),
    ]);
    setTables((t.data as SeatTable[]) ?? []);
    // Seuls les invités attendus à la réception se placent
    setGuests(((g.data as any[]) ?? []).filter((x) => x.attending_reception !== false));
    setDeclinedPlaced(d.count ?? 0);
    setLoading(false);
  }, []);

  // Chargement initial (différé : les mises à jour d'état arrivent après le rendu)
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const occupancy = useMemo(() => occupancyMap(guests), [guests]);
  const remainingOf = useCallback((tableId: string) => {
    const t = tables.find((x) => x.id === tableId);
    return t ? capacityOf(t) - (occupancy.get(tableId) ?? 0) : 0;
  }, [tables, occupancy]);

  // Invités affichés (les invités en attente sont optionnels) ; les places déjà réservées comptent toujours
  const visibleGuests = useMemo(
    () => guests.filter((g) => includePending || g.status === 'confirmé' || g.table_id),
    [guests, includePending]
  );

  /* ── Placement ── */
  const persistMoves = async (byTarget: Map<string | null, string[]>) => {
    const results = await Promise.all(
      [...byTarget.entries()].map(([tableId, ids]) => supabase.from('invite').update({ table_id: tableId }).in('id', ids))
    );
    return results.find((r) => r.error)?.error ?? null;
  };

  // Référence stable pour que « Annuler » puisse rejouer un déplacement
  const applyMovesRef = useRef<(t: { guestId: string; tableId: string | null }[], m: string, u?: boolean) => Promise<boolean>>(async () => false);

  const applyMoves = useCallback(async (targets: { guestId: string; tableId: string | null }[], message: string, undoable = true) => {
    const current = guestsRef.current;
    const moves: Move[] = targets
      .map(({ guestId, tableId }) => ({ guestId, tableId, from: current.find((g) => g.id === guestId)?.table_id ?? null }))
      .filter((m) => m.from !== m.tableId);
    if (!moves.length) return true;

    const next = new Map(moves.map((m) => [m.guestId, m.tableId]));
    setGuests((prev) => prev.map((g) => (next.has(g.id) ? { ...g, table_id: next.get(g.id)! } : g)));

    const byTarget = new Map<string | null, string[]>();
    for (const m of moves) byTarget.set(m.tableId, [...(byTarget.get(m.tableId) ?? []), m.guestId]);
    const error = await persistMoves(byTarget);
    if (error) {
      const back = new Map(moves.map((m) => [m.guestId, m.from]));
      setGuests((prev) => prev.map((g) => (back.has(g.id) ? { ...g, table_id: back.get(g.id)! } : g)));
      notify({ tone: 'error', text: "L'enregistrement a échoué, rien n'a été modifié. Vérifiez votre connexion." });
      return false;
    }
    notify({
      tone: 'success',
      text: message,
      undo: undoable ? () => { applyMovesRef.current(moves.map((m) => ({ guestId: m.guestId, tableId: m.from })), 'Action annulée.', false); } : undefined,
    });
    return true;
  }, [notify]);
  useEffect(() => { applyMovesRef.current = applyMoves; }, [applyMoves]);

  // Place (ou retire avec tableId = null) un ou plusieurs invités, en vérifiant la place disponible
  const placeGuests = useCallback(async (guestIds: string[], tableId: string | null) => {
    const moving = guestsRef.current.filter((g) => guestIds.includes(g.id) && g.table_id !== tableId);
    if (!moving.length) return true;
    if (tableId) {
      const table = tables.find((t) => t.id === tableId);
      const need = sumSeats(moving);
      const free = remainingOf(tableId);
      if (need > free) {
        notify({ tone: 'error', text: `${table?.name ?? 'Cette table'} n'a plus que ${Math.max(0, free)} place${free > 1 ? 's' : ''} (il en faut ${need}).` });
        return false;
      }
    }
    const who = moving.length === 1 ? moving[0].name : `${moving.length} invités`;
    const where = tableId ? tables.find((t) => t.id === tableId)?.name : null;
    return applyMoves(
      moving.map((g) => ({ guestId: g.id, tableId })),
      tableId ? `${who} → ${where}` : `${who} retiré${moving.length > 1 ? 's' : ''} de sa table`
    );
  }, [tables, remainingOf, applyMoves, notify]);

  const autoPlaceAll = useCallback(async () => {
    const candidates = guestsRef.current.filter((g) => includePending || g.status === 'confirmé' || g.table_id);
    const { assignments, unplaced } = autoPlace(candidates, tables);
    if (!assignments.length) {
      notify({ tone: 'error', text: tables.length ? 'Plus assez de places libres : ajoutez des tables ou augmentez leur capacité.' : "Créez d'abord vos tables." });
      return;
    }
    const placedSeats = sumSeats(candidates.filter((g) => assignments.some((a) => a.guestId === g.id)));
    await applyMoves(assignments, `${placedSeats} personne${placedSeats > 1 ? 's' : ''} placée${placedSeats > 1 ? 's' : ''}${unplaced.length ? ` · ${sumSeats(unplaced)} restent sans place` : ''}`);
  }, [tables, includePending, applyMoves, notify]);

  const clearDeclined = useCallback(async () => {
    if (!marriage) return;
    const { error } = await supabase.from('invite').update({ table_id: null })
      .eq('marriage_id', marriage.id).eq('status', 'décliné').not('table_id', 'is', null);
    if (error) { notify({ tone: 'error', text: "Impossible de libérer ces places pour l'instant." }); return; }
    notify({ tone: 'success', text: `${declinedPlaced} place${declinedPlaced > 1 ? 's' : ''} libérée${declinedPlaced > 1 ? 's' : ''}.` });
    setDeclinedPlaced(0);
  }, [marriage, declinedPlaced, notify]);

  /* ── Tables ── */
  const createTables = useCallback(async (rows: Partial<SeatTable>[]) => {
    if (!marriage) return [];
    const payload = rows.map((r, i) => ({
      marriage_id: marriage.id,
      name: r.name?.trim() || `Table ${tables.length + i + 1}`,
      capacity: Math.max(1, Math.min(50, Number(r.capacity) || DEFAULT_CAPACITY)),
      shape: r.shape ?? 'circle',
      is_vip: Boolean(r.is_vip),
      position_x: r.position_x ?? null,
      position_y: r.position_y ?? null,
    }));
    const { data, error } = await supabase.from('tables').insert(payload).select();
    if (error || !data) { notify({ tone: 'error', text: "La table n'a pas pu être créée. Réessayez." }); return []; }
    setTables((prev) => [...prev, ...(data as SeatTable[])]);
    notify({ tone: 'success', text: data.length > 1 ? `${data.length} tables créées` : `${data[0].name} créée` });
    return data as SeatTable[];
  }, [marriage, tables.length, notify]);

  const updateTable = useCallback(async (id: string, patch: Partial<SeatTable>, { silent = false } = {}) => {
    const before = tables.find((t) => t.id === id);
    if (!before) return false;
    if (patch.capacity != null && patch.capacity < (occupancy.get(id) ?? 0)) {
      notify({ tone: 'error', text: `${occupancy.get(id)} personnes sont déjà assises à cette table : la capacité ne peut pas être inférieure.` });
      return false;
    }
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from('tables').update(patch).eq('id', id);
    if (error) {
      setTables((prev) => prev.map((t) => (t.id === id ? before : t)));
      notify({ tone: 'error', text: "La modification n'a pas été enregistrée." });
      return false;
    }
    if (!silent) notify({ tone: 'success', text: 'Table mise à jour' });
    return true;
  }, [tables, occupancy, notify]);

  const deleteTable = useCallback(async (id: string) => {
    const table = tables.find((t) => t.id === id);
    const seated = guestsRef.current.filter((g) => g.table_id === id).map((g) => g.id);
    if (seated.length) {
      const { error: freeError } = await supabase.from('invite').update({ table_id: null }).in('id', seated);
      if (freeError) { notify({ tone: 'error', text: "La table n'a pas pu être supprimée." }); return false; }
    }
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) { notify({ tone: 'error', text: "La table n'a pas pu être supprimée." }); load(); return false; }
    setTables((prev) => prev.filter((t) => t.id !== id));
    setGuests((prev) => prev.map((g) => (g.table_id === id ? { ...g, table_id: null } : g)));
    notify({ tone: 'info', text: `${table?.name ?? 'Table'} supprimée${seated.length ? ` · ${seated.length} invité${seated.length > 1 ? 's' : ''} à replacer` : ''}` });
    return true;
  }, [tables, notify, load]);

  // Positions sur le plan : plusieurs tables à la fois, en parallèle
  const savePositions = useCallback(async (positions: { id: string; x: number; y: number }[]) => {
    const byId = new Map(positions.map((p) => [p.id, p]));
    setTables((prev) => prev.map((t) => (byId.has(t.id) ? { ...t, position_x: Math.round(byId.get(t.id)!.x), position_y: Math.round(byId.get(t.id)!.y) } : t)));
    const results = await Promise.all(positions.map((p) =>
      supabase.from('tables').update({ position_x: Math.round(p.x), position_y: Math.round(p.y) }).eq('id', p.id)));
    if (results.some((r) => r.error)) notify({ tone: 'error', text: "La disposition n'a pas été entièrement enregistrée." });
  }, [notify]);

  const stats = useMemo(() => {
    const total = sumSeats(visibleGuests);
    const placed = sumSeats(visibleGuests.filter((g) => g.table_id));
    const capacity = tables.reduce((s, t) => s + capacityOf(t), 0);
    return { total, placed, capacity, unassignedCount: visibleGuests.filter((g) => !g.table_id).length };
  }, [visibleGuests, tables]);

  return {
    marriage, tables, guests: visibleGuests, allGuests: guests, loading, toast, setToast,
    includePending, setIncludePending, declinedPlaced, clearDeclined,
    occupancy, remainingOf, stats, seats,
    placeGuests, autoPlaceAll, createTables, updateTable, deleteTable, savePositions,
  };
}

export type Seating = ReturnType<typeof useSeating>;
