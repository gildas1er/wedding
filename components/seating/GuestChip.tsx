"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Check, Crown, GripVertical } from 'lucide-react';
import { seats, sideLabel, type SeatGuest } from '../../lib/seating';

const SIDE_DOT: Record<string, string> = { partenaire_1: 'bg-blue-400', partenaire_2: 'bg-rose-400', commun: 'bg-slate-300' };

type Props = {
  guest: SeatGuest;
  selected: boolean;
  onToggle: (id: string) => void;
  showCategory?: boolean;
  dragOverlay?: boolean;
};

// Un invité (ou un groupe : « ×2 ») : touchez pour sélectionner, faites glisser pour placer
export default function GuestChip({ guest, selected, onToggle, showCategory = true, dragOverlay = false }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `guest:${guest.id}`, data: { guestId: guest.id }, disabled: dragOverlay });
  const n = seats(guest);

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      role="button"
      aria-pressed={selected}
      aria-label={`${guest.name}, ${n} personne${n > 1 ? 's' : ''}, ${sideLabel(guest.side)}${selected ? ', sélectionné' : ''}`}
      onClick={() => onToggle(guest.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(guest.id); } }}
      className={`group flex min-h-[44px] w-full cursor-pointer touch-manipulation select-none items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all ${
        selected ? 'border-ink bg-ink text-white shadow-md' : 'border-slate-200 bg-white text-ink hover:border-slate-400'
      } ${isDragging ? 'opacity-30' : ''} ${dragOverlay ? 'rotate-1 cursor-grabbing shadow-xl ring-2 ring-amber-300' : ''}`}
    >
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected ? 'border-white/40 bg-white/15' : 'border-slate-300'}`}>
        {selected ? <Check className="h-3.5 w-3.5" /> : <span className={`h-2 w-2 rounded-full ${SIDE_DOT[guest.side ?? 'commun'] ?? SIDE_DOT.commun}`} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {guest.is_vip && <Crown className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-amber-300' : 'text-amber-500'}`} />}
          <span className="truncate text-sm font-semibold">{guest.name}</span>
        </span>
        {showCategory && (
          <span className={`block truncate text-[11px] ${selected ? 'text-white/70' : 'text-slate-500'}`}>
            {sideLabel(guest.side)}{guest.category ? ` · ${guest.category}` : ''}{guest.status === 'en_attente' ? ' · réponse en attente' : ''}
          </span>
        )}
      </span>
      {n > 1 && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${selected ? 'bg-white/15' : 'bg-slate-100 text-slate-600'}`}>×{n}</span>
      )}
      <GripVertical className={`hidden h-4 w-4 shrink-0 lg:block ${selected ? 'text-white/40' : 'text-slate-300 group-hover:text-slate-400'}`} aria-hidden />
    </div>
  );
}
