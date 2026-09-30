"use client";

import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Search, Sparkles, CheckCheck, PartyPopper } from 'lucide-react';
import GuestChip from './GuestChip';
import { normalize, sumSeats, type SeatGuest } from '../../lib/seating';

const SIDES = [
  { id: 'all', label: 'Tous' },
  { id: 'partenaire_1', label: 'Marié' },
  { id: 'partenaire_2', label: 'Mariée' },
  { id: 'commun', label: 'Commun' },
];

type Props = {
  guests: SeatGuest[];          // invités sans table
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectMany: (ids: string[]) => void;
  onAutoPlace: () => void;
  hasTables: boolean;
  includePending: boolean;
  onIncludePending: (v: boolean) => void;
};

export default function UnassignedPanel({ guests, selectedIds, onToggle, onSelectMany, onAutoPlace, hasTables, includePending, onIncludePending }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned' });
  const [query, setQuery] = useState('');
  const [side, setSide] = useState('all');
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => [...new Set(guests.map((g) => g.category).filter(Boolean))] as string[], [guests]);
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return guests
      .filter((g) => (side === 'all' || (g.side ?? 'commun') === side) && (category === 'all' || g.category === category) && (!q || normalize(g.name).includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [guests, query, side, category]);

  const allSelected = filtered.length > 0 && filtered.every((g) => selectedIds.has(g.id));

  return (
    <div ref={setNodeRef} className={`flex h-full min-h-0 flex-col overflow-y-auto pb-24 transition-colors lg:overflow-hidden lg:pb-0 ${isOver ? 'bg-amber-50/60' : ''}`}>
      <div className="space-y-3 border-b border-slate-200/80 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-xl text-ink">À placer</h2>
          <span className="text-sm text-slate-500">{guests.length} fiche{guests.length > 1 ? 's' : ''} · {sumSeats(guests)} pers.</span>
        </div>

        <button
          type="button"
          onClick={onAutoPlace}
          disabled={!guests.length || !hasTables}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4 text-amber-300" /> Placement automatique
        </button>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un invité"
            aria-label="Rechercher un invité"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[15px] outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Côté">
          {SIDES.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={side === s.id} onClick={() => setSide(s.id)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${side === s.id ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {['all', ...categories].map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === c ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}>
                {c === 'all' ? 'Toutes catégories' : c}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={includePending} onChange={(e) => onIncludePending(e.target.checked)} className="h-4 w-4 accent-rose-500" />
            Inclure les réponses en attente
          </label>
          {filtered.length > 0 && (
            <button type="button" onClick={() => onSelectMany(allSelected ? [] : filtered.map((g) => g.id))} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700">
              <CheckCheck className="h-3.5 w-3.5" /> {allSelected ? 'Désélectionner' : 'Tout sélectionner'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5 p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {guests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <PartyPopper className="h-8 w-8 text-amber-500" strokeWidth={1.5} />
            <p className="font-display text-lg text-ink">Tout le monde a sa place</p>
            <p className="text-sm text-slate-500">Glissez un invité ici pour le retirer de sa table.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Aucun invité ne correspond à ces filtres.</p>
        ) : (
          filtered.map((g) => <GuestChip key={g.id} guest={g} selected={selectedIds.has(g.id)} onToggle={onToggle} />)
        )}
      </div>
    </div>
  );
}
