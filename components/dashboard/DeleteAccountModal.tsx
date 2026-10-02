"use client";

// Suppression définitive du compte : confirmation forte (taper SUPPRIMER), puis déconnexion.
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, Download, Loader2, Trash2, X } from 'lucide-react';
import { supabase } from '../../app/lib/supabase';

const WORD = 'SUPPRIMER';

export default function DeleteAccountModal({ onClose, showDownloadLink = true }: { onClose: () => void; showDownloadLink?: boolean }) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed.trim().toUpperCase() === WORD;

  const confirmDelete = async () => {
    if (!ready || deleting) return;
    setDeleting(true);
    setError(null);
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: WORD }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok) {
      setDeleting(false);
      setError(json?.error ?? 'Connexion impossible. Vérifiez votre réseau puis réessayez.');
      return;
    }
    await supabase.auth.signOut().catch(() => {});
    window.location.href = '/login?compte=supprime';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-desc"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.75rem] sm:p-8"
      >
        <button type="button" onClick={onClose} disabled={deleting} aria-label="Fermer" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-ink"><X className="h-5 w-5" /></button>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertTriangle className="h-6 w-6" /></span>
        <h2 id="delete-title" className="mt-4 font-display text-2xl text-ink">Supprimer définitivement votre compte ?</h2>
        <div id="delete-desc" className="mt-3 space-y-3 text-sm text-slate-600">
          <p>Tout sera effacé, sans retour possible :</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>votre espace, vos invités et leurs réponses ;</li>
            <li>le budget, la checklist, le plan de table et le déroulé ;</li>
            <li>la photo de couverture, la musique et le livre d&apos;or ;</li>
            <li>votre compte : vous ne pourrez plus vous connecter.</li>
          </ul>
          {showDownloadLink && (
            <Link href="/dashboard/souvenir" onClick={onClose} className="inline-flex items-center gap-1.5 font-semibold text-rose-600 underline-offset-4 hover:underline">
              <Download className="h-4 w-4" /> Télécharger mes souvenirs avant
            </Link>
          )}
        </div>

        <label htmlFor="delete-confirm" className="mt-6 block text-sm font-semibold text-ink">
          Pour confirmer, tapez <span className="font-mono text-rose-600">{WORD}</span>
        </label>
        <input
          id="delete-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base uppercase tracking-widest outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          placeholder={WORD}
        />
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" onClick={onClose} disabled={deleting} className="min-h-[48px] flex-1 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-ink hover:bg-slate-50">
            Annuler
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={!ready || deleting}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-40"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
