"use client";

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

type Props = { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode };

// Panneau qui monte du bas sur mobile, fenêtre centrée sur ordinateur
export default function Sheet({ open, title, subtitle, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative flex max-h-[88dvh] w-full flex-col rounded-t-[1.75rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-[1.75rem]"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden />
            <header className="flex items-start gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-6">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
            {footer && <div className="border-t border-slate-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
