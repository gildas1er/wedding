"use client";

// Studio : les familles qui invitent, la tenue demandée et le pagne de la cérémonie (migration 37).
import React, { useRef } from 'react';
import { Camera, Loader2, Plus, Trash2, X } from 'lucide-react';
import { DRESS_CODES, MAX_DRESS_COLORS, type CeremonyPagne, type DressCode } from '../../lib/african-invitation';

const input = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400';
const SUGGESTED_COLORS = ['#c1440e', '#2f7d4f', '#1e3a5f', '#b8921f', '#7a1f3d', '#f2efe8'];

export type FamilyDressValue = {
  family_1: string;
  family_2: string;
  dress_code: DressCode | '';
  dress_colors: string[];
  ceremony_pagne: CeremonyPagne;
};

export default function FamilyDressEditor({ value, onChange, partner1, partner2, photoBusy, onPickPhoto }: {
  value: FamilyDressValue;
  onChange: (patch: Partial<FamilyDressValue>) => void;
  partner1?: string | null;
  partner2?: string | null;
  photoBusy: string | null;
  onPickPhoto: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pagne = value.ceremony_pagne;
  const setPagne = (patch: Partial<CeremonyPagne>) => onChange({ ceremony_pagne: { ...pagne, ...patch } });
  const showPagne = value.dress_code === 'pagne' || value.dress_code === '';

  return (
    <div className="space-y-6">
      {/* Familles */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">Les familles qui invitent <span className="font-normal text-slate-400">(facultatif)</span></p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="block text-xs text-slate-500">Famille de {partner1 || 'la mariée'}</span>
            <input id="family_1" type="text" maxLength={60} value={value.family_1} onChange={(e) => onChange({ family_1: e.target.value })} placeholder="Ex : Kouassi" className={input} />
          </label>
          <label className="block space-y-1">
            <span className="block text-xs text-slate-500">Famille de {partner2 || 'le marié'}</span>
            <input id="family_2" type="text" maxLength={60} value={value.family_2} onChange={(e) => onChange({ family_2: e.target.value })} placeholder="Ex : Yao" className={input} />
          </label>
        </div>
        <p className="text-xs text-slate-500">L’invitation affichera : « Les familles {value.family_1.trim() || 'Kouassi'} &amp; {value.family_2.trim() || 'Yao'} ont la joie de vous convier… »</p>
      </div>

      {/* Tenue */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">La tenue demandée</p>
        <div role="radiogroup" aria-label="Tenue demandée" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[{ id: '' as const, label: 'Aucune consigne' }, ...DRESS_CODES].map((d) => {
            const active = value.dress_code === d.id;
            return (
              <button key={d.id || 'none'} type="button" role="radio" aria-checked={active} onClick={() => onChange({ dress_code: d.id })}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${active ? 'border-amber-400 bg-amber-50/60 text-ink ring-2 ring-amber-200' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'}`}>
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {value.dress_code === 'couleurs' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">Les couleurs du jour (jusqu’à {MAX_DRESS_COLORS})</p>
          <div className="flex flex-wrap items-center gap-2">
            {value.dress_colors.map((c, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2">
                <input type="color" aria-label={`Couleur ${i + 1}`} value={c} onChange={(e) => onChange({ dress_colors: value.dress_colors.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                <button type="button" aria-label={`Retirer la couleur ${i + 1}`} onClick={() => onChange({ dress_colors: value.dress_colors.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-rose-600">
                  <X className="h-4 w-4" />
                </button>
              </span>
            ))}
            {value.dress_colors.length < MAX_DRESS_COLORS && (
              <button type="button" onClick={() => onChange({ dress_colors: [...value.dress_colors, SUGGESTED_COLORS.find((c) => !value.dress_colors.includes(c)) ?? '#c1440e'] })}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:border-amber-400">
                <Plus className="h-4 w-4" /> Ajouter une couleur
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pagne de la cérémonie */}
      {showPagne && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-ivory/60 p-4">
          <div>
            <p className="text-sm font-semibold text-ink">Le pagne de la cérémonie <span className="font-normal text-slate-400">(facultatif)</span></p>
            <p className="text-xs text-slate-500">Vos invités voient le tissu, son prix, et le commandent sur WhatsApp auprès de la personne que vous choisissez.</p>
          </div>
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(photoBusy)}
              className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white text-slate-500 hover:border-amber-400">
              {photoBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : pagne.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pagne.photo_url} alt="Pagne de la cérémonie" className="h-full w-full object-cover" />
              ) : <span className="grid place-items-center gap-1 text-[11px] font-semibold"><Camera className="h-5 w-5" />Photo</span>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickPhoto(f); e.target.value = ''; }} />
            <div className="min-w-0 flex-1 space-y-2">
              <input id="pagne_label" type="text" maxLength={80} value={pagne.label} onChange={(e) => setPagne({ label: e.target.value })} placeholder="Nom du pagne (ex : Pagne de la dot, 6 yards)" aria-label="Nom du pagne" className={input} />
              <input id="pagne_price" type="number" inputMode="numeric" min={0} step={500} value={pagne.price ?? ''} onChange={(e) => setPagne({ price: e.target.value ? Number(e.target.value) : null })} placeholder="Prix en F CFA (ex : 15000)" aria-label="Prix du pagne en F CFA" className={input} />
              {pagne.photo_url && !photoBusy && (
                <button type="button" onClick={() => setPagne({ photo_url: '' })} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Retirer la photo</button>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input id="pagne_seller" type="text" maxLength={60} value={pagne.seller_name} onChange={(e) => setPagne({ seller_name: e.target.value })} placeholder="À qui commander (ex : Tantie Adjoua)" aria-label="Personne à qui commander le pagne" className={input} />
            <input id="pagne_phone" type="tel" inputMode="tel" maxLength={20} value={pagne.seller_phone} onChange={(e) => setPagne({ seller_phone: e.target.value })} placeholder="Son WhatsApp (ex : 07 08 12 34 56)" aria-label="Numéro WhatsApp pour commander le pagne" className={input} />
          </div>
          <p className="text-xs text-slate-500">Numéro ivoirien sans indicatif, ou numéro étranger avec son indicatif (ex : +33 6 12 34 56 78).</p>
        </div>
      )}
    </div>
  );
}
