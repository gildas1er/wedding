"use client";

// Fenêtre de confirmation commune à l'espace des mariés (remplace window.confirm),
// et petite notification de résultat (« Tâche supprimée »).
//   const { confirm, notify } = useConfirm();
//   if (!(await confirm({ title: 'Supprimer cette tâche ?', item: task.title }))) return;
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Check, Trash2, X, type LucideIcon } from 'lucide-react';

type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  item?: string;                 // nom de l'élément concerné, mis en valeur
  consequences?: string[];       // ce qui sera effacé avec lui
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  icon?: LucideIcon;
};
type Toast = { id: number; text: string; tone: 'success' | 'error' };
type Ctx = { confirm: (o: ConfirmOptions) => Promise<boolean>; notify: (text: string, tone?: Toast['tone']) => void };

const ConfirmContext = createContext<Ctx | null>(null);

// Hors du fournisseur (pages invités), repli sur les fenêtres du navigateur
const fallback: Ctx = {
  confirm: async (o) => window.confirm([o.title, o.item ? `« ${o.item} »` : ''].filter(Boolean).join('\n')),
  notify: () => {},
};

export function useConfirm() {
  return useContext(ConfirmContext) ?? fallback;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })), []);
  const notify = useCallback((text: string, tone: Toast['tone'] = 'success') => setToast({ id: Date.now(), text, tone }), []);

  const close = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ConfirmContext.Provider value={{ confirm, notify }}>
      {children}
      <AnimatePresence>
        {dialog && <Dialog key="confirm" options={dialog} onClose={close} />}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[140] mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-2xl lg:left-[calc(17rem+1rem)] print:hidden"
          >
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${toast.tone === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/25 text-rose-200'}`}>
              {toast.tone === 'success' ? <Check className="h-4 w-4" strokeWidth={3} /> : <AlertCircle className="h-4 w-4" />}
            </span>
            <p className="min-w-0 flex-1">{toast.text}</p>
            <button type="button" onClick={() => setToast(null)} aria-label="Fermer" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

function Dialog({ options, onClose }: { options: ConfirmOptions; onClose: (v: boolean) => void }) {
  const reduce = useReducedMotion();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const danger = options.tone !== 'neutral';
  const Icon = options.icon ?? Trash2;

  // Focus sur « Annuler » (le choix sans risque), Échap pour annuler, focus gardé dans la fenêtre
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(false); }
      if (e.key === 'Tab') {
        const nodes = [...document.querySelectorAll<HTMLElement>('[data-confirm-dialog] button')];
        const i = nodes.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); nodes.at(-1)?.focus(); }
        else if (!e.shiftKey && i === nodes.length - 1) { e.preventDefault(); nodes[0]?.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-ink/55 backdrop-blur-[3px] sm:items-center sm:p-4 print:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(false); }}
    >
      <motion.div
        data-confirm-dialog
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-[26rem] overflow-hidden rounded-t-[2rem] bg-white shadow-[0_40px_80px_-30px_rgba(36,18,24,0.55)] sm:rounded-[2rem]"
      >
        {/* Bandeau décoratif */}
        <div className={`relative flex flex-col items-center px-6 pb-5 pt-8 text-center ${danger ? 'bg-gradient-to-b from-rose-50 to-white' : 'bg-gradient-to-b from-amber-50 to-white'}`}>
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden style={{ position: 'absolute', top: 10 }} />
          <span className="relative grid h-16 w-16 place-items-center">
            {!reduce && (
              <motion.span
                aria-hidden
                className={`absolute inset-0 rounded-full ${danger ? 'bg-rose-200' : 'bg-amber-200'}`}
                initial={{ scale: 0.6, opacity: 0.7 }}
                animate={{ scale: 1.45, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
              />
            )}
            <span className={`relative grid h-16 w-16 place-items-center rounded-full ring-8 ${danger ? 'bg-rose-100 text-rose-600 ring-rose-50' : 'bg-amber-100 text-amber-700 ring-amber-50'}`}>
              <Icon className="h-7 w-7" strokeWidth={1.8} />
            </span>
          </span>
          <h2 id="confirm-title" className="mt-5 font-display text-[1.6rem] leading-tight text-ink text-balance">{options.title}</h2>
          {options.item && (
            <p className="mt-3 max-w-full truncate rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink shadow-sm ring-1 ring-slate-200">
              « {options.item} »
            </p>
          )}
        </div>

        <div id="confirm-desc" className="space-y-3 px-6 pb-2 text-center text-sm leading-relaxed text-slate-600">
          {options.message && <p>{options.message}</p>}
          {options.consequences && options.consequences.length > 0 && (
            <ul className="space-y-1.5 rounded-2xl bg-ivory p-3.5 text-left">
              {options.consequences.map((c) => (
                <li key={c} className="flex items-start gap-2"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${danger ? 'bg-rose-400' : 'bg-amber-500'}`} />{c}</li>
              ))}
            </ul>
          )}
          {danger && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Cette action est définitive</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onClose(false)}
            className="min-h-[50px] flex-1 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            {options.cancelLabel ?? 'Annuler'}
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className={`inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-lg transition-colors focus:outline-none focus-visible:ring-4 ${
              danger ? 'bg-rose-600 shadow-rose-600/25 hover:bg-rose-700 focus-visible:ring-rose-200' : 'bg-ink shadow-ink/20 hover:bg-rose-700 focus-visible:ring-amber-200'
            }`}
          >
            {danger && <Trash2 className="h-4 w-4" />} {options.confirmLabel ?? 'Supprimer'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
