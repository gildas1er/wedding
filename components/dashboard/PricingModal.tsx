"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Crown, X } from 'lucide-react';
import { FREE_GUEST_LIMIT, PREMIUM_ACCESS_MONTHS_AFTER_WEDDING, PREMIUM_FEATURES, PREMIUM_PRICE_XOF, formatXof } from '../../lib/plan';

type Props = { onClose: () => void; reason?: 'limit' | 'discover' };

// Présentation de l'offre : ce qu'elle apporte vraiment, son prix, et l'accès au paiement
export default function PricingModal({ onClose, reason = 'discover' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Offre Premium"
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] bg-white p-6 shadow-2xl sm:rounded-[1.75rem] sm:p-8"
      >
        <button onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-ink">
          <X size={18} />
        </button>

        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600"><Crown size={14} /> Premium</p>
        <h2 className="mt-2 text-2xl font-normal text-ink sm:text-3xl">
          {reason === 'limit' ? `Vous avez atteint ${FREE_GUEST_LIMIT} invités` : 'Recevez tous vos proches'}
        </h2>
        <p className="mt-2 text-slate-500">
          {reason === 'limit'
            ? 'Vos invités, votre plan de table et vos réglages restent intacts. Passez au Premium pour continuer à ajouter des invités.'
            : `La version gratuite accueille jusqu'à ${FREE_GUEST_LIMIT} fiches invités. Le Premium lève cette limite.`}
        </p>

        <ul className="mt-6 space-y-2.5">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={12} /></span>{f}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-baseline justify-between gap-3 rounded-2xl bg-ivory px-4 py-3">
          <span className="shrink-0 whitespace-nowrap font-display text-2xl text-ink">{formatXof(PREMIUM_PRICE_XOF)}</span>
          <span className="text-right text-xs text-slate-500">paiement unique · jusqu&apos;à {PREMIUM_ACCESS_MONTHS_AFTER_WEDDING} mois après le mariage</span>
        </div>

        <Link href="/dashboard/premium" onClick={onClose} className="mt-5 flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white hover:bg-rose-700">
          Passer au Premium
        </Link>
        <p className="mt-3 text-center text-xs text-slate-500">Wave, Orange Money, MTN, Moov ou carte bancaire</p>
        <button onClick={onClose} className="mt-2 w-full py-2 text-sm font-medium text-slate-500 hover:text-ink">Plus tard</button>
      </motion.div>
    </motion.div>
  );
}
