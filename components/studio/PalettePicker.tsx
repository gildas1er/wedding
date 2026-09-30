"use client";

import React, { useState } from 'react';
import { Check, SlidersHorizontal } from 'lucide-react';
import { PALETTES, contrastRatio, findPalette, readableTextOn } from '../../lib/palettes';

type Props = {
  primary: string;
  accent: string;
  onChange: (primary: string, accent: string) => void;
};

export default function PalettePicker({ primary, accent, onChange }: Props) {
  const current = findPalette(primary, accent);
  const [customOpen, setCustomOpen] = useState(!current);
  const lightPrimary = contrastRatio(primary, '#ffffff') < 3;

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Palette de l'invitation" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PALETTES.map((p) => {
          const selected = current?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => { onChange(p.primary, p.accent); setCustomOpen(false); }}
              className={`group relative rounded-2xl border bg-white p-3 text-left transition-all ${
                selected ? 'border-ink ring-1 ring-ink' : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <span className="flex items-center">
                <span className="h-8 w-8 rounded-full ring-2 ring-white" style={{ backgroundColor: p.primary }} />
                <span className="-ml-2.5 h-8 w-8 rounded-full ring-2 ring-white" style={{ backgroundColor: p.accent }} />
                {selected && (
                  <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-ink text-white"><Check className="h-3 w-3" /></span>
                )}
              </span>
              <span className="mt-2.5 block text-[13px] font-semibold leading-tight text-ink">{p.name}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-slate-500">{p.mood}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setCustomOpen((v) => !v)}
        aria-expanded={customOpen}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
          !current ? 'border-ink text-ink' : 'border-slate-200 text-slate-600 hover:border-slate-400'
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {current ? 'Personnaliser les couleurs' : 'Couleurs personnalisées'}
      </button>

      {customOpen && (
        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-ivory p-4 sm:grid-cols-2">
          <ColorInput label="Couleur principale" hint="Boutons, prénoms, détails" value={primary} onChange={(v) => onChange(v, accent)} />
          <ColorInput label="Couleur d'accent" hint="Filets, esperluette, dates" value={accent} onChange={(v) => onChange(primary, v)} />
          {lightPrimary && (
            <p className="text-xs text-amber-800 sm:col-span-2">
              Couleur principale claire : le texte des boutons passera en foncé pour rester lisible.
            </p>
          )}
        </div>
      )}

      {/* Mini aperçu du rendu */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 p-4" style={{ backgroundColor: `color-mix(in oklab, ${primary}, #fdfbf8 96%)` }}>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>Vous êtes invités</p>
          <p className="mt-1 truncate font-display text-xl text-ink">
            Awa <span className="italic" style={{ color: accent }}>&amp;</span> Yao
          </p>
        </div>
        <span className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold" style={{ backgroundColor: primary, color: readableTextOn(primary) }}>
          Je serai là
        </span>
      </div>
    </div>
  );
}

function ColorInput({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border-none bg-transparent" aria-label={label} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block truncate text-xs text-slate-500">{hint} · <span className="font-mono">{value}</span></span>
      </span>
    </label>
  );
}
