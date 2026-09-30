"use client";

import React, { useState } from 'react';
import { Crown, Minus, Plus, Trash2, UserMinus, Circle, RectangleHorizontal } from 'lucide-react';
import Sheet from './Sheet';
import { DEFAULT_CAPACITY, capacityOf, seats, type SeatGuest, type SeatTable } from '../../lib/seating';

export type EditorMode = { type: 'create' } | { type: 'edit'; tableId: string } | null;

type Props = {
  mode: EditorMode;
  tables: SeatTable[];
  occupancy: Map<string, number>;
  guests: SeatGuest[];
  onClose: () => void;
  onCreate: (rows: Partial<SeatTable>[]) => Promise<unknown>;
  onUpdate: (id: string, patch: Partial<SeatTable>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onUnseat: (guestId: string) => void;
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-amber-400';

export default function TableEditor(props: Props) {
  const { mode } = props;
  // Remonte le formulaire à chaque ouverture pour repartir des bonnes valeurs
  const key = mode ? (mode.type === 'edit' ? mode.tableId : 'create') : 'closed';
  return <EditorBody key={key} {...props} />;
}

function EditorBody({ mode, tables, occupancy, guests, onClose, onCreate, onUpdate, onDelete, onUnseat }: Props) {
  const editing = mode?.type === 'edit' ? tables.find((t) => t.id === mode.tableId) ?? null : null;
  const [multi, setMulti] = useState(false);
  const [count, setCount] = useState(5);
  const [name, setName] = useState(editing?.name ?? '');
  const [capacity, setCapacity] = useState(editing ? capacityOf(editing) : DEFAULT_CAPACITY);
  const [shape, setShape] = useState(editing?.shape === 'rectangle' ? 'rectangle' : 'circle');
  const [vip, setVip] = useState(Boolean(editing?.is_vip));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const seated = editing ? guests.filter((g) => g.table_id === editing.id) : [];
  const occupied = editing ? occupancy.get(editing.id) ?? 0 : 0;
  const minCapacity = Math.max(1, occupied);

  const submit = async () => {
    setBusy(true);
    if (editing) {
      const ok = await onUpdate(editing.id, { name: name.trim() || editing.name, capacity, shape, is_vip: vip });
      setBusy(false);
      if (ok) onClose();
      return;
    }
    const rows = multi
      ? Array.from({ length: count }, () => ({ capacity, shape, is_vip: vip }))
      : [{ name, capacity, shape, is_vip: vip }];
    const created = await onCreate(rows);
    setBusy(false);
    if (Array.isArray(created) && created.length) onClose();
  };

  const title = editing ? editing.name : multi ? 'Créer plusieurs tables' : 'Nouvelle table';

  return (
    <Sheet
      open={Boolean(mode)}
      onClose={onClose}
      title={title}
      subtitle={editing ? `${occupied} / ${capacityOf(editing)} places occupées` : undefined}
      footer={
        <div className="flex items-center gap-3">
          {editing && (
            confirmDelete ? (
              <button type="button" onClick={async () => { setBusy(true); const ok = await onDelete(editing.id); setBusy(false); if (ok) onClose(); }}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">
                <Trash2 className="h-4 w-4" /> Confirmer
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
            )
          )}
          <button type="button" onClick={submit} disabled={busy}
            className="ml-auto inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 sm:flex-none">
            {editing ? 'Enregistrer' : multi ? `Créer ${count} tables` : 'Créer la table'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {confirmDelete && editing && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
            Supprimer « {editing.name} » ? {seated.length ? `Ses ${seated.length} invité${seated.length > 1 ? 's' : ''} retourneront dans « À placer ».` : ''}
          </p>
        )}

        {!editing && (
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {[false, true].map((m) => (
              <button key={String(m)} type="button" onClick={() => setMulti(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${multi === m ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>
                {m ? 'Plusieurs tables' : 'Une table'}
              </button>
            ))}
          </div>
        )}

        {multi && !editing ? (
          <Field label="Nombre de tables" hint={`Elles seront nommées « Table ${tables.length + 1} » à « Table ${tables.length + count} » (modifiable ensuite).`}>
            <Stepper value={count} min={1} max={40} onChange={setCount} />
          </Field>
        ) : (
          <Field label="Nom">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={`Ex : Table ${tables.length + 1}, Assinie, Honneur…`} className={inputClass} autoFocus={!editing} />
          </Field>
        )}

        <Field label="Places par table" hint={editing && occupied ? `Au moins ${occupied} : des invités y sont déjà assis.` : undefined}>
          <Stepper value={capacity} min={minCapacity} max={50} onChange={setCapacity} />
        </Field>

        <Field label="Forme">
          <div className="grid grid-cols-2 gap-2">
            {([['circle', 'Ronde', Circle], ['rectangle', 'Rectangulaire', RectangleHorizontal]] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setShape(id)} aria-pressed={shape === id}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${shape === id ? 'border-ink bg-ivory text-ink' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </Field>

        <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4">
          <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} className="h-5 w-5 accent-amber-500" />
          <Crown className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-900">Table d&apos;honneur (VIP)</span>
        </label>

        {editing && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Invités à cette table</p>
            {seated.length === 0 ? (
              <p className="rounded-xl bg-ivory p-3 text-sm text-slate-500">Personne pour l&apos;instant.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {seated.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                      {g.is_vip && <Crown className="mr-1 inline h-3.5 w-3.5 text-amber-500" />}{g.name}
                    </span>
                    {seats(g) > 1 && <span className="text-xs text-slate-500">×{seats(g)}</span>}
                    <button type="button" onClick={() => onUnseat(g.id)} aria-label={`Retirer ${g.name} de la table`}
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="Moins"
        className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 text-ink hover:border-ink disabled:opacity-30"><Minus className="h-4 w-4" /></button>
      <input type="number" inputMode="numeric" value={value} min={min} max={max}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || min))}
        className="h-12 w-20 rounded-xl border border-slate-200 text-center font-display text-xl text-ink outline-none focus:border-amber-400" aria-label="Valeur" />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Plus"
        className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 text-ink hover:border-ink disabled:opacity-30"><Plus className="h-4 w-4" /></button>
    </div>
  );
}
