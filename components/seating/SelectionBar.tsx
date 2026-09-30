"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Armchair, UserMinus } from 'lucide-react';

type Props = {
  count: number;
  seats: number;
  anySeated: boolean;
  onPlace: () => void;
  onUnseat: () => void;
  onClear: () => void;
};

// Barre flottante qui apparaît dès qu'un invité est sélectionné
export default function SelectionBar({ count, seats, anySeated, onPlace, onUnseat, onClear }: Props) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-ink p-2 pl-4 text-white shadow-2xl lg:bottom-6 lg:left-[calc(17rem+1.5rem)]"
          role="region"
          aria-label="Invités sélectionnés"
        >
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold">{count} invité{count > 1 ? 's' : ''}</span>
            <span className="text-white/60"> · {seats} pers.</span>
          </p>
          {anySeated && (
            <button type="button" onClick={onUnseat} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
              <UserMinus className="h-4 w-4" /> <span className="hidden sm:inline">Retirer</span>
            </button>
          )}
          <button type="button" onClick={onPlace} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-300 px-4 text-sm font-semibold text-ink hover:bg-amber-200">
            <Armchair className="h-4 w-4" /> Placer…
          </button>
          <button type="button" onClick={onClear} aria-label="Annuler la sélection" className="grid h-11 w-11 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
