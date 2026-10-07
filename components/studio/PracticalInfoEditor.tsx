"use client";

import React from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, X } from 'lucide-react';
import { useConfirm } from '../ui/ConfirmDialog';
import { INFO_PRESETS, LIMITS, MAX_INFOS, newInfo, type InfoKind, type PracticalInfo } from '../../lib/practical-info';
import { INFO_ICONS } from '../practical-info-icons';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400';

type Props = { value: PracticalInfo[]; onChange: (infos: PracticalInfo[]) => void };

export default function PracticalInfoEditor({ value, onChange }: Props) {
  const update = (id: string, patch: Partial<PracticalInfo>) => onChange(value.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const { confirm } = useConfirm();
  // Une rubrique remplie demande confirmation ; une rubrique vide part directement
  const remove = async (id: string) => {
    const info = value.find((i) => i.id === id);
    const filled = Boolean(info && (info.text?.trim() || info.name?.trim() || info.phone?.trim() || info.url?.trim() || info.colors?.length));
    if (filled && !(await confirm({ title: 'Supprimer cette rubrique ?', item: info?.title || undefined, tone: 'neutral', confirmLabel: 'Supprimer', message: 'Elle disparaîtra de l’invitation à la prochaine publication.' }))) return;
    onChange(value.filter((i) => i.id !== id));
  };
  const move = (index: number, delta: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  const full = value.length >= MAX_INFOS;

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-ivory p-5 text-center text-sm text-slate-500">
          Aucune rubrique pour l&apos;instant. Ajoutez celles utiles à vos invités ci-dessous.
        </p>
      )}

      {value.map((info, index) => {
        const Icon = INFO_ICONS[info.kind];
        return (
          <div key={info.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-700"><Icon className="h-4 w-4" strokeWidth={1.6} /></span>
              <span className="flex-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{INFO_PRESETS[info.kind].label}</span>
              <IconButton label="Monter" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></IconButton>
              <IconButton label="Descendre" disabled={index === value.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></IconButton>
              <IconButton label="Supprimer la rubrique" danger onClick={() => remove(info.id)}><Trash2 className="h-4 w-4" /></IconButton>
            </div>

            <div className="space-y-2.5">
              <input
                value={info.title}
                maxLength={LIMITS.title}
                onChange={(e) => update(info.id, { title: e.target.value })}
                placeholder="Titre"
                aria-label="Titre de la rubrique"
                className={`${inputClass} font-semibold`}
              />
              <div>
                <textarea
                  value={info.text}
                  maxLength={LIMITS.text}
                  onChange={(e) => update(info.id, { text: e.target.value })}
                  placeholder={INFO_PRESETS[info.kind].placeholder}
                  aria-label="Texte de la rubrique"
                  rows={3}
                  className={`${inputClass} resize-y`}
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">{info.text.length}/{LIMITS.text}</p>
              </div>

              {info.kind === 'contact' && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <input value={info.name ?? ''} maxLength={LIMITS.name} onChange={(e) => update(info.id, { name: e.target.value })} placeholder="Nom (ex : Serge, notre témoin)" aria-label="Nom du contact" className={inputClass} />
                  <input value={info.phone ?? ''} maxLength={LIMITS.phone} inputMode="tel" onChange={(e) => update(info.id, { phone: e.target.value })} placeholder="Téléphone (ex : 07 00 00 00 00)" aria-label="Téléphone du contact" className={inputClass} />
                </div>
              )}

              {(info.kind === 'gifts' || info.kind === 'accommodation' || info.kind === 'access') && (
                <input
                  type="url"
                  value={info.url ?? ''}
                  maxLength={LIMITS.url}
                  onChange={(e) => update(info.id, { url: e.target.value })}
                  placeholder={info.kind === 'gifts' ? 'Lien de la liste ou de la cagnotte (facultatif)' : 'Lien utile (facultatif)'}
                  aria-label="Lien de la rubrique"
                  className={`${inputClass} text-sm`}
                />
              )}

              {info.kind === 'dress_code' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Couleurs suggérées :</span>
                  {(info.colors ?? []).map((color, ci) => (
                    <span key={ci} className="relative">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => update(info.id, { colors: info.colors!.map((c, k) => (k === ci ? e.target.value : c)) })}
                        aria-label={`Couleur ${ci + 1}`}
                        className="h-9 w-9 cursor-pointer rounded-full border border-slate-200 bg-transparent p-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => update(info.id, { colors: info.colors!.filter((_, k) => k !== ci) })}
                        aria-label={`Retirer la couleur ${ci + 1}`}
                        className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-ink text-white"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  {(info.colors?.length ?? 0) < LIMITS.colors && (
                    <button
                      type="button"
                      onClick={() => update(info.id, { colors: [...(info.colors ?? []), '#b38c4a'] })}
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 text-xs font-medium text-slate-600 hover:border-ink"
                    >
                      <Plus className="h-3.5 w-3.5" /> Couleur
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-600">{full ? `Maximum ${MAX_INFOS} rubriques` : 'Ajouter une rubrique'}</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(INFO_PRESETS) as InfoKind[]).map((kind) => {
            const Icon = INFO_ICONS[kind];
            return (
              <button
                key={kind}
                type="button"
                disabled={full}
                onClick={() => onChange([...value, newInfo(kind)])}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-ink disabled:opacity-40"
              >
                <Icon className="h-4 w-4 text-amber-700" strokeWidth={1.6} /> {INFO_PRESETS[kind].label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors disabled:opacity-30 ${danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-ink'}`}
    >
      {children}
    </button>
  );
}
