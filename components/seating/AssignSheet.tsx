"use client";

import React from 'react';
import { Crown, Plus, Check } from 'lucide-react';
import Sheet from './Sheet';
import { capacityOf, type SeatTable } from '../../lib/seating';

type Props = {
  open: boolean;
  onClose: () => void;
  tables: SeatTable[];
  occupancy: Map<string, number>;
  seatsNeeded: number;
  label: string;          // « Aya Bamba » ou « 3 invités »
  currentTableId: string | null; // table commune de la sélection, s'il y en a une
  onPick: (tableId: string) => void;
  onCreateTable: () => void;
};

// Choix de la table pour la sélection : les tables qui peuvent accueillir tout le groupe d'abord
export default function AssignSheet({ open, onClose, tables, occupancy, seatsNeeded, label, currentTableId, onPick, onCreateTable }: Props) {
  const rows = tables
    .map((t) => ({ t, free: capacityOf(t) - (occupancy.get(t.id) ?? 0) }))
    .sort((a, b) => Number(b.free >= seatsNeeded) - Number(a.free >= seatsNeeded) || a.free - b.free);

  return (
    <Sheet open={open} onClose={onClose} title={`Placer ${label}`} subtitle={`${seatsNeeded} place${seatsNeeded > 1 ? 's' : ''} nécessaire${seatsNeeded > 1 ? 's' : ''}`}>
      <div className="space-y-2">
        {rows.map(({ t, free }) => {
          const fits = free >= seatsNeeded;
          const here = t.id === currentTableId;
          const cap = capacityOf(t);
          return (
            <button
              key={t.id}
              type="button"
              disabled={!fits || here}
              onClick={() => onPick(t.id)}
              className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                here ? 'border-ink bg-ivory' : fits ? 'border-slate-200 bg-white hover:border-ink' : 'border-slate-100 bg-slate-50 opacity-60'
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center border-2 text-xs font-semibold ${t.shape === 'rectangle' ? 'rounded-lg' : 'rounded-full'} ${t.is_vip ? 'border-amber-400 text-amber-800' : 'border-slate-200 text-slate-600'}`}>
                {cap}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  {t.is_vip && <Crown className="h-3.5 w-3.5 text-amber-500" />}<span className="truncate">{t.name}</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, ((cap - free) / cap) * 100)}%` }} />
                </span>
              </span>
              <span className={`shrink-0 text-sm font-semibold ${fits ? 'text-emerald-600' : 'text-slate-400'}`}>
                {here ? <Check className="h-5 w-5 text-ink" /> : `${Math.max(0, free)} libre${free > 1 ? 's' : ''}`}
              </span>
            </button>
          );
        })}
        <button type="button" onClick={onCreateTable} className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:border-ink hover:text-ink">
          <Plus className="h-4 w-4" /> Nouvelle table
        </button>
      </div>
    </Sheet>
  );
}
