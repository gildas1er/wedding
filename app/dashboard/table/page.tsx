"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Printer, FileText, MoreHorizontal, Loader2, LayoutList, Map as MapIcon, Users, UserX, Undo2 } from 'lucide-react';
import FloorPlanPrint from '../../../components/seating/FloorPlanPrint';
import { useSeating } from '../../../components/seating/useSeating';
import GuestChip from '../../../components/seating/GuestChip';
import TableCard from '../../../components/seating/TableCard';
import UnassignedPanel from '../../../components/seating/UnassignedPanel';
import SelectionBar from '../../../components/seating/SelectionBar';
import AssignSheet from '../../../components/seating/AssignSheet';
import TableEditor, { type EditorMode } from '../../../components/seating/TableEditor';
import FloorPlan from '../../../components/seating/FloorPlan';
import { downloadWordPCO, PrintZone } from '../../../components/seating/exports';
import { sumSeats, type SeatGuest } from '../../../lib/seating';

type View = 'guests' | 'tables' | 'plan';

// Annonces du glisser-déposer pour les lecteurs d'écran, en français
const label = (id: string | number | undefined) => String(id ?? '').startsWith('table:') ? 'la table' : String(id) === 'unassigned' ? 'la liste « À placer »' : 'une zone';
const announcements = {
  onDragStart: () => 'Invité saisi. Utilisez les flèches pour le déplacer, Espace pour le déposer, Échap pour annuler.',
  onDragOver: ({ over }: { over: { id: string | number } | null }) => (over ? `Au-dessus de ${label(over.id)}.` : 'Hors des zones de dépôt.'),
  onDragEnd: ({ over }: { over: { id: string | number } | null }) => (over ? `Invité déposé sur ${label(over.id)}.` : 'Invité relâché hors des zones de dépôt.'),
  onDragCancel: () => 'Déplacement annulé.',
};
const screenReaderInstructions = { draggable: 'Appuyez sur Espace pour saisir cet invité, puis déplacez-le avec les flèches.' };

export default function SeatingPage() {
  const s = useSeating();
  const [view, setView] = useState<View>('guests');
  const [rawSelected, setSelected] = useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [editor, setEditor] = useState<EditorMode>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Document imprimé : listes pour le traiteur ou plan de salle
  const [printMode, setPrintMode] = useState<'lists' | 'plan'>('lists');
  const printDoc = (mode: 'lists' | 'plan') => {
    setMenuOpen(false);
    setPrintMode(mode);
    setTimeout(() => window.print(), 150);
  };
  const [dragIds, setDragIds] = useState<string[]>([]);

  const guestById = useMemo(() => new Map(s.guests.map((g) => [g.id, g])), [s.guests]);
  const unassigned = useMemo(() => s.guests.filter((g) => !g.table_id), [s.guests]);
  const byTable = useMemo(() => {
    const map = new Map<string, SeatGuest[]>();
    for (const g of s.guests) if (g.table_id) map.set(g.table_id, [...(map.get(g.table_id) ?? []), g]);
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return map;
  }, [s.guests]);

  // La sélection ne garde que des invités encore affichés
  const selected = useMemo(() => new Set([...rawSelected].filter((id) => guestById.has(id))), [rawSelected, guestById]);
  const selectedGuests = useMemo(() => [...selected].map((id) => guestById.get(id)).filter(Boolean) as SeatGuest[], [selected, guestById]);
  const selectionSeats = sumSeats(selectedGuests);
  const selectionTables = new Set(selectedGuests.map((g) => g.table_id));
  const commonTable = selectionTables.size === 1 ? [...selectionTables][0] ?? null : null;
  const dragGuests = dragIds.map((id) => guestById.get(id)).filter(Boolean) as SeatGuest[];

  const toggle = useCallback((id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);
  const clearSelection = () => setSelected(new Set());

  const placeSelection = async (tableId: string | null) => {
    const ok = await s.placeGuests([...selected], tableId);
    if (ok) { clearSelection(); setAssignOpen(false); }
  };

  const onTableTap = (tableId: string) => {
    if (selected.size) placeSelection(tableId);
    else setEditor({ type: 'edit', tableId });
  };

  /* ── Glisser-déposer : souris immédiate, doigt après un appui long ── */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const onDragStart = (e: DragStartEvent) => {
    const id = e.active.data.current?.guestId as string;
    setDragIds(selected.has(id) ? [...selected] : [id]);
  };
  const onDragEnd = async (e: DragEndEvent) => {
    const ids = dragIds;
    setDragIds([]);
    const overId = e.over?.id?.toString();
    if (!overId || !ids.length) return;
    const target = overId === 'unassigned' ? null : overId.startsWith('table:') ? overId.slice(6) : undefined;
    if (target === undefined) return;
    const ok = await s.placeGuests(ids, target);
    if (ok && ids.some((id) => selected.has(id))) clearSelection();
  };

  if (s.loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>;
  }

  const pct = s.stats.total ? Math.round((s.stats.placed / s.stats.total) * 100) : 0;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-ivory lg:h-screen print:h-auto print:bg-white">
      {/* ── EN-TÊTE ── */}
      <header className="relative z-30 shrink-0 border-b border-slate-200/80 bg-white/80 px-4 pb-3 pt-4 backdrop-blur sm:px-6 lg:px-8 print:hidden">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Plan de table</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-display text-2xl font-normal text-ink sm:text-3xl">
                {s.stats.placed}<span className="text-slate-400"> / {s.stats.total}</span> <span className="text-lg text-slate-500 sm:text-xl">placés</span>
              </h1>
              <span className="text-sm text-slate-500">{s.tables.length} table{s.tables.length > 1 ? 's' : ''} · {s.stats.capacity} places</span>
            </div>
            <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden rounded-xl bg-slate-100 p-1 lg:flex">
              {([['tables', 'Tables', LayoutList], ['plan', 'Plan de salle', MapIcon]] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" onClick={() => setView(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${(view === id || (id === 'tables' && view === 'guests')) ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setEditor({ type: 'create' })}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-ink px-3 text-sm font-semibold text-white hover:bg-rose-700 sm:px-4">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Table</span>
            </button>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Exporter" aria-expanded={menuOpen}
                className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-ink hover:text-ink">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
                    <MenuItem icon={MapIcon} onClick={() => printDoc('plan')}>Imprimer le plan de salle</MenuItem>
                    <MenuItem icon={Printer} onClick={() => printDoc('lists')}>Imprimer pour le traiteur</MenuItem>
                    <MenuItem icon={FileText} onClick={() => { setMenuOpen(false); downloadWordPCO(s.marriage, s.tables, s.guests); }}>Télécharger en Word</MenuItem>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Onglets mobile */}
        <div className="mt-3 flex rounded-xl bg-slate-100 p-1 lg:hidden" role="tablist">
          {([['guests', `À placer${unassigned.length ? ` (${unassigned.length})` : ''}`], ['tables', 'Tables'], ['plan', 'Plan']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${view === id ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {s.declinedPlaced > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:px-6 lg:px-8 print:hidden">
          <UserX className="h-4 w-4 shrink-0" />
          <p className="flex-1">{s.declinedPlaced} invité{s.declinedPlaced > 1 ? 's' : ''} ayant décliné occupe{s.declinedPlaced > 1 ? 'nt' : ''} encore une place.</p>
          <button type="button" onClick={s.clearDeclined} className="rounded-lg bg-white px-3 py-1.5 font-semibold ring-1 ring-amber-300 hover:bg-amber-100">Libérer</button>
        </div>
      )}

      {/* ── CONTENU ── */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragIds([])} accessibility={{ announcements, screenReaderInstructions }}>
        <div className="flex min-h-0 flex-1 print:hidden">
          <aside className={`${view === 'guests' ? 'flex' : 'hidden'} min-h-0 w-full flex-col bg-white lg:flex lg:w-80 lg:shrink-0 lg:border-r lg:border-slate-200/80 xl:w-96`}>
            <UnassignedPanel
              guests={unassigned}
              selectedIds={selected}
              onToggle={toggle}
              onSelectMany={(ids) => setSelected(new Set(ids))}
              onAutoPlace={s.autoPlaceAll}
              hasTables={s.tables.length > 0}
              includePending={s.includePending}
              onIncludePending={s.setIncludePending}
            />
          </aside>

          <main className={`${view === 'guests' ? 'hidden' : 'flex'} min-h-0 min-w-0 flex-1 flex-col lg:flex`}>
            {view === 'plan' ? (
              <FloorPlan
                marriageId={s.marriage?.id ?? 'x'}
                tables={s.tables}
                occupancy={s.occupancy}
                selectionSeats={selectionSeats}
                dragSeats={sumSeats(dragGuests)}
                onTableTap={onTableTap}
                onSavePositions={s.savePositions}
              />
            ) : s.tables.length === 0 ? (
              <EmptyTables onCreate={() => setEditor({ type: 'create' })} />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-28 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {s.tables.map((t) => (
                    <TableCard
                      key={t.id}
                      table={t}
                      guests={byTable.get(t.id) ?? []}
                      occupied={s.occupancy.get(t.id) ?? 0}
                      selectedIds={selected}
                      selectionSeats={selectionSeats}
                      selectionHere={commonTable === t.id}
                      dragSeats={sumSeats(dragGuests)}
                      onToggleGuest={toggle}
                      onPlaceHere={(id) => placeSelection(id)}
                      onEdit={(id) => setEditor({ type: 'edit', tableId: id })}
                    />
                  ))}
                  <button type="button" onClick={() => setEditor({ type: 'create' })}
                    className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 transition-colors hover:border-ink hover:text-ink">
                    <Plus className="h-6 w-6" /> <span className="text-sm font-semibold">Ajouter des tables</span>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>

        <DragOverlay dropAnimation={null}>
          {dragGuests.length > 0 && (
            <div className="w-64">
              <GuestChip guest={dragGuests[0]} selected={false} onToggle={() => {}} dragOverlay />
              {dragGuests.length > 1 && (
                <span className="absolute -right-2 -top-2 grid h-7 min-w-7 place-items-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">{dragGuests.length}</span>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <SelectionBar
        count={selected.size}
        seats={selectionSeats}
        anySeated={selectedGuests.some((g) => g.table_id)}
        onPlace={() => setAssignOpen(true)}
        onUnseat={() => placeSelection(null)}
        onClear={clearSelection}
      />

      <AssignSheet
        open={assignOpen && selected.size > 0}
        onClose={() => setAssignOpen(false)}
        tables={s.tables}
        occupancy={s.occupancy}
        seatsNeeded={selectionSeats}
        label={selectedGuests.length === 1 ? selectedGuests[0].name : `${selectedGuests.length} invités`}
        currentTableId={commonTable}
        onPick={(id) => placeSelection(id)}
        onCreateTable={() => { setAssignOpen(false); setEditor({ type: 'create' }); }}
      />

      <TableEditor
        mode={editor}
        tables={s.tables}
        occupancy={s.occupancy}
        guests={s.guests}
        onClose={() => setEditor(null)}
        onCreate={s.createTables}
        onUpdate={s.updateTable}
        onDelete={s.deleteTable}
        onUnseat={(id) => s.placeGuests([id], null)}
      />

      <ToastView toast={s.toast} onClose={() => s.setToast(null)} raised={selected.size > 0} />
      {printMode === 'plan'
        ? <FloorPlanPrint marriage={s.marriage} tables={s.tables} guests={s.guests} occupancy={s.occupancy} />
        : <PrintZone marriage={s.marriage} tables={s.tables} guests={s.guests} />}
    </div>
  );
}

function MenuItem({ icon: Icon, onClick, children }: { icon: typeof Printer; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-ink hover:bg-ivory">
      <Icon className="h-4 w-4 text-slate-500" /> {children}
    </button>
  );
}

function EmptyTables({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-amber-300 text-amber-700"><Users className="h-7 w-7" strokeWidth={1.5} /></span>
      <h2 className="font-display text-2xl text-ink">Créez vos tables</h2>
      <p className="max-w-sm text-slate-500">Ajoutez-les une par une, ou d&apos;un coup (par exemple 12 tables rondes de 10 places).</p>
      <button type="button" onClick={onCreate} className="mt-2 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700">
        <Plus className="h-4 w-4" /> Créer des tables
      </button>
    </div>
  );
}

function ToastView({ toast, onClose, raised }: { toast: ReturnType<typeof useSeating>['toast']; onClose: () => void; raised: boolean }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.undo ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          role="status"
          className={`fixed inset-x-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-xl transition-[bottom] lg:left-[calc(17rem+1.5rem)] ${raised ? 'bottom-24' : 'bottom-4 lg:bottom-6'} ${
            toast.tone === 'error' ? 'bg-red-600 text-white' : 'bg-white text-ink ring-1 ring-slate-200'
          }`}
        >
          <p className="min-w-0 flex-1">{toast.text}</p>
          {toast.undo && (
            <button type="button" onClick={() => { toast.undo!(); onClose(); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-semibold text-rose-600 hover:bg-rose-50">
              <Undo2 className="h-4 w-4" /> Annuler
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
