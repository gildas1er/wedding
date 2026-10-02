"use client";

// Pop-up affiché à la connexion quand l'espace est passé en mode souvenir.
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Download, Heart, MessageCircle, Trash2, X } from 'lucide-react';
import { formatXof } from '../../lib/plan';
import { EXTENSION_MONTHS, EXTENSION_PRICE_XOF, extensionWhatsappLink, formatLongDate } from '../../lib/lifecycle';

export default function SouvenirModal({ couple, marriageId, deleteAt, daysBeforeDeletion, onClose, onDelete }: {
  couple: string;
  marriageId: string;
  deleteAt: Date | null;
  daysBeforeDeletion: number | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  const soon = daysBeforeDeletion !== null && daysBeforeDeletion <= 30;
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="souvenir-title"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]"
      >
        <div className="relative overflow-hidden bg-ink px-6 pb-6 pt-7 text-white sm:px-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl" />
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300"><Heart className="h-4 w-4" /> Mode souvenir</p>
          <h2 id="souvenir-title" className="mt-3 font-display text-[1.7rem] leading-tight">Votre mariage a eu lieu, félicitations&nbsp;!</h2>
          <p className="mt-2 text-sm text-white/75">
            {couple ? `${couple}, votre` : 'Votre'} espace est maintenant en lecture seule : vous pouvez consulter et télécharger vos souvenirs, mais plus les modifier.
          </p>
        </div>

        <div className="space-y-5 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8">
          {deleteAt && (
            <p className={`rounded-2xl p-4 text-sm ring-1 ${soon ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-ivory text-slate-700 ring-slate-200'}`}>
              Il sera <strong>supprimé automatiquement le {formatLongDate(deleteAt)}</strong>
              {daysBeforeDeletion !== null && ` (dans ${daysBeforeDeletion} jour${daysBeforeDeletion > 1 ? 's' : ''})`}.
              {soon && ' Pensez à télécharger vos souvenirs dès maintenant.'}
            </p>
          )}

          <div className="grid gap-2.5">
            <Link href="/dashboard/souvenir" onClick={onClose} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700">
              <Download className="h-4 w-4" /> Télécharger mes souvenirs
            </Link>
            <a
              href={extensionWhatsappLink(couple, marriageId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-semibold text-ink hover:bg-amber-100"
            >
              <MessageCircle className="h-4 w-4 text-amber-700" /> Prolonger de {EXTENSION_MONTHS} mois · {formatXof(EXTENSION_PRICE_XOF)}
            </a>
            <button type="button" onClick={onDelete} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> Supprimer définitivement mon compte
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
