"use client";

// Saisie d'un code promo ou de parrainage (page Premium). La réduction est appliquée à l'activation du palier.
import React, { useState } from 'react';
import { Ticket, Loader2, X, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../app/lib/supabase';
import { describeDiscount, normalizeCode, type AppliedCode } from '../../lib/promo';

export default function PromoCodeCard({ applied, onChange }: { applied: AppliedCode | null; onChange: () => Promise<void> | void }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeCode(value);
    if (!code) { setError('Saisissez un code.'); return; }
    setBusy(true); setError(null);
    const { data, error: err } = await supabase.rpc('apply_code', { p_code: code });
    setBusy(false);
    if (err) { setError('Le code n’a pas pu être vérifié. Vérifiez votre connexion puis réessayez.'); return; }
    if (!data?.ok) { setError(data?.message ?? 'Code refusé.'); return; }
    setValue('');
    await onChange();
  };

  const remove = async () => {
    setBusy(true);
    await supabase.rpc('remove_code');
    setBusy(false);
    await onChange();
  };

  const usable = applied && applied.valid && !applied.used;

  return (
    <section id="code" aria-labelledby="code-title" className="scroll-mt-24 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 sm:p-6">
      <h2 id="code-title" className="flex items-center gap-2 text-sm font-semibold text-ink"><Ticket className="h-4 w-4 text-amber-600" /> Code promo ou de parrainage</h2>

      {usable ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-900"><span className="font-mono">{applied.code}</span> · {describeDiscount(applied)}</p>
            <p className="text-xs text-emerald-800">{applied.label ?? (applied.kind === 'parrainage' ? 'Parrainage' : 'Code promo')}. La réduction est déjà comptée dans les prix ci-dessus.</p>
          </div>
          <button type="button" onClick={remove} disabled={busy} className="inline-flex min-h-[40px] items-center gap-1 rounded-lg px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Retirer
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">Un partenaire ou un couple vous a donné un code ? Saisissez-le : la réduction s’affiche sur les paliers.</p>
          {applied && !applied.valid && <p className="mt-2 text-xs text-amber-800">Le code {applied.code} n’est plus valable.</p>}
          <form onSubmit={apply} className="mt-3 flex gap-2">
            <label htmlFor="promo-code" className="sr-only">Code</label>
            <input
              id="promo-code"
              value={value}
              onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(null); }}
              placeholder="Ex : LANCEMENT"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={24}
              className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-slate-200 px-3 font-mono text-base uppercase tracking-wider text-ink outline-none focus:border-amber-400 sm:text-sm"
            />
            <button type="submit" disabled={busy || !value.trim()} className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Appliquer
            </button>
          </form>
          {error && <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</p>}
        </>
      )}
    </section>
  );
}
