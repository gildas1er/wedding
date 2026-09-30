"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Crown, MoreHorizontal, ArrowDownToLine } from 'lucide-react';
import GuestChip from './GuestChip';
import { capacityOf, type SeatGuest, type SeatTable } from '../../lib/seating';

type Props = {
  table: SeatTable;
  guests: SeatGuest[];
  occupied: number;
  selectedIds: Set<string>;
  selectionSeats: number;      // places nécessaires pour la sélection en cours (0 = aucune sélection)
  selectionHere: boolean;      // toute la sélection est déjà à cette table
  dragSeats: number;           // places du groupe en cours de glisser (0 = pas de glisser)
  onToggleGuest: (id: string) => void;
  onPlaceHere: (tableId: string) => void;
  onEdit: (tableId: string) => void;
};

export default function TableCard({ table, guests, occupied, selectedIds, selectionSeats, selectionHere, dragSeats, onToggleGuest, onPlaceHere, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `table:${table.id}`, data: { tableId: table.id } });
  const capacity = capacityOf(table);
  const free = capacity - occupied;
  const pct = Math.min(100, (occupied / capacity) * 100);
  const full = free <= 0;
  const fits = selectionSeats > 0 && selectionSeats <= free;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${table.name}, ${occupied} sur ${capacity} places`}
      className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition-all ${
        isOver && dragSeats
          ? dragSeats <= free ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50/40' : 'border-red-300 ring-2 ring-red-100'
          : table.is_vip ? 'border-amber-300' : 'border-slate-200/80'
      }`}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center border-2 text-xs font-semibold ${table.shape === 'rectangle' ? 'rounded-lg' : 'rounded-full'} ${
            table.is_vip ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 bg-ivory text-slate-600'
          }`}
        >
          {capacity}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-display text-lg leading-tight text-ink">
            {table.is_vip && <Crown className="h-4 w-4 shrink-0 text-amber-500" />}
            <span className="truncate">{table.name}</span>
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all duration-500 ${full ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`shrink-0 text-xs font-semibold ${full ? 'text-emerald-600' : 'text-slate-500'}`}>
              {occupied}/{capacity}{full ? ' · complète' : ''}
            </span>
          </div>
        </div>
        <button type="button" onClick={() => onEdit(table.id)} aria-label={`Modifier ${table.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-ink">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      <div className="mt-3 flex-1 space-y-1.5">
        {guests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
            Glissez un invité ici, ou sélectionnez-le puis « Placer ici »
          </p>
        ) : (
          guests.map((g) => <GuestChip key={g.id} guest={g} selected={selectedIds.has(g.id)} onToggle={onToggleGuest} showCategory={false} />)
        )}
      </div>

      {selectionSeats > 0 && !selectionHere && (
        <button
          type="button"
          onClick={() => onPlaceHere(table.id)}
          disabled={!fits}
          className={`mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
            fits ? 'bg-rose-500 text-white hover:bg-rose-600' : 'cursor-not-allowed bg-slate-100 text-slate-400'
          }`}
        >
          <ArrowDownToLine className="h-4 w-4" />
          {fits ? `Placer ici (${free} libre${free > 1 ? 's' : ''})` : `Pas assez de place (${Math.max(0, free)} libre${free > 1 ? 's' : ''})`}
        </button>
      )}
    </section>
  );
}
