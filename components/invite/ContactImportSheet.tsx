"use client";

// Ajout d'invités depuis le répertoire du téléphone : sélecteur natif (Android) ou fichier .vcf (iPhone, ordinateur),
// puis vérification avant l'ajout (doublons, numéro à garder, côté et catégorie).
import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookUser, Check, FileUp, Loader2, Smartphone, X, AlertCircle } from 'lucide-react';
import { contactPickerSupported, parseVCard, pickPhoneContacts, type PickedContact } from '../../lib/contacts';
import { normalizePhone } from '../../lib/phone';

export type ContactRow = { name: string; phone: string; side: string; category: string };

type Row = PickedContact & { checked: boolean; phone: string | null; label: string; duplicate: boolean };

const SIDES = [['partenaire_1', 'Marié'], ['partenaire_2', 'Mariée'], ['commun', 'Commun']] as const;
const CATEGORIES = [['parents', 'Famille'], ['amis', 'Amis'], ['collègues', 'Collègues']] as const;

const formatPhone = (p: string) => p.replace(/^\+225(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');

export default function ContactImportSheet({ existingPhones, room, saving, onClose, onImport }: {
  existingPhones: Set<string>;
  room: number; // places restantes dans la version gratuite (Infinity en Premium)
  saving: boolean;
  onClose: () => void;
  onImport: (rows: ContactRow[]) => void;
}) {
  const supported = useMemo(() => contactPickerSupported(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [side, setSide] = useState('commun');
  const [category, setCategory] = useState('amis');
  const [error, setError] = useState<string | null>(null);

  const load = (contacts: PickedContact[]) => {
    if (!contacts.length) { setError('Aucun contact avec un numéro de téléphone.'); return; }
    setError(null);
    const seen = new Set<string>();
    setRows(contacts.map((c) => {
      const phone = c.phones.map(normalizePhone).find(Boolean) ?? null;
      const duplicate = Boolean(phone && (existingPhones.has(phone) || seen.has(phone)));
      if (phone) seen.add(phone);
      return { ...c, phone, label: c.name, duplicate, checked: Boolean(phone && c.name && !duplicate) };
    }));
  };

  const openPicker = async () => {
    try {
      load(await pickPhoneContacts(true));
    } catch {
      setError("Le répertoire n'a pas pu être ouvert. Autorisez l'accès aux contacts, ou utilisez un fichier .vcf.");
    }
  };

  const openFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text().catch(() => '');
    const contacts = parseVCard(text);
    if (!contacts.length) { setError("Ce fichier ne contient pas de contacts lisibles. Choisissez un fichier .vcf (vCard)."); return; }
    load(contacts);
    if (fileRef.current) fileRef.current.value = '';
  };

  const update = (id: string, patch: Partial<Row>) => setRows((prev) => prev?.map((r) => {
    if (r.id !== id) return r;
    const next = { ...r, ...patch };
    if (patch.phone !== undefined) next.duplicate = Boolean(next.phone && existingPhones.has(next.phone));
    return next;
  }) ?? null);

  const selectable = rows?.filter((r) => r.phone && r.label.trim() && !r.duplicate) ?? [];
  const selected = selectable.filter((r) => r.checked);
  const allChecked = selectable.length > 0 && selected.length === selectable.length;
  const overLimit = Number.isFinite(room) && selected.length > room;

  const confirm = () => onImport(selected.map((r) => ({ name: r.label.trim(), phone: r.phone!, side, category })));

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contacts-title"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-ink"><X className="h-5 w-5" /></button>

        <div className="shrink-0 px-5 pb-3 pt-4 sm:px-7 sm:pt-7">
          <h2 id="contacts-title" className="flex items-center gap-2 pr-10 font-display text-2xl text-ink"><BookUser className="h-6 w-6 text-rose-500" /> Depuis mes contacts</h2>
          <p className="mt-1 text-sm text-slate-500">
            {rows ? 'Vérifiez la sélection avant de l’ajouter à votre liste.' : 'Ajoutez vos proches directement depuis le répertoire de votre téléphone.'}
          </p>
        </div>

        {error && (
          <p role="alert" className="mx-5 mb-2 flex shrink-0 items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200 sm:mx-7">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        <input ref={fileRef} type="file" accept=".vcf,text/vcard,text/x-vcard" className="hidden" onChange={(e) => openFile(e.target.files?.[0])} />

        {!rows ? (
          /* ── Choix de la source ── */
          <div className="space-y-3 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7">
            {supported && (
              <button type="button" onClick={openPicker} className="flex w-full items-center gap-4 rounded-2xl bg-ink p-4 text-left text-white hover:bg-rose-700">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10"><Smartphone className="h-5 w-5" /></span>
                <span><span className="block font-semibold">Ouvrir mon répertoire</span><span className="block text-sm text-white/70">Cochez les contacts à inviter, plusieurs à la fois.</span></span>
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left hover:border-ink">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600"><FileUp className="h-5 w-5" /></span>
              <span><span className="block font-semibold text-ink">Choisir un fichier de contacts (.vcf)</span><span className="block text-sm text-slate-500">Un ou plusieurs contacts partagés depuis votre téléphone.</span></span>
            </button>
            {!supported && (
              <div className="rounded-2xl bg-ivory p-4 text-sm text-slate-600">
                <p className="flex items-center gap-2 font-semibold text-ink"><Smartphone className="h-4 w-4" /> Sur iPhone</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Ouvrez l&apos;app <strong>Contacts</strong>.</li>
                  <li>Pour plusieurs contacts : touchez <strong>Listes</strong>, maintenez le doigt sur une liste (ou « Tous les contacts ») puis <strong>Exporter</strong>. Pour un seul : ouvrez-le puis <strong>Partager le contact</strong>.</li>
                  <li>Choisissez <strong>Enregistrer dans Fichiers</strong>, puis revenez ici et choisissez ce fichier.</li>
                </ol>
                <p className="mt-2 text-xs text-slate-500">Sur Android avec Chrome, le bouton « Ouvrir mon répertoire » s&apos;affiche directement.</p>
              </div>
            )}
          </div>
        ) : (
          /* ── Vérification ── */
          <>
            <div className="shrink-0 space-y-3 border-b border-slate-100 px-5 pb-3 sm:px-7">
              <div className="grid grid-cols-2 gap-2">
                <Segment label="Côté" value={side} options={SIDES} onChange={setSide} />
                <Segment label="Catégorie" value={category} options={CATEGORIES} onChange={setCategory} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
                <input type="checkbox" checked={allChecked} onChange={(e) => setRows((prev) => prev?.map((r) => ({ ...r, checked: e.target.checked && Boolean(r.phone && r.label.trim() && !r.duplicate) })) ?? null)} className="h-4 w-4 accent-rose-500" />
                Tout sélectionner ({selectable.length})
              </label>
            </div>

            <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto px-3 sm:px-5">
              {rows.map((r) => {
                const disabled = !r.phone || r.duplicate;
                return (
                  <li key={r.id} className={`flex items-start gap-3 px-2 py-3 ${disabled ? 'opacity-60' : ''}`}>
                    <input
                      type="checkbox"
                      aria-label={`Inviter ${r.label || 'ce contact'}`}
                      checked={r.checked && !disabled}
                      disabled={disabled || !r.label.trim()}
                      onChange={(e) => update(r.id, { checked: e.target.checked })}
                      className="mt-3 h-5 w-5 shrink-0 accent-rose-500"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        value={r.label}
                        onChange={(e) => update(r.id, { label: e.target.value, checked: e.target.value.trim() ? r.checked : false })}
                        placeholder="Nom du contact"
                        aria-label="Nom"
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[15px] font-semibold text-ink outline-none focus:border-slate-200 focus:bg-white"
                      />
                      {r.phones.length > 1 ? (
                        <select
                          value={r.phone ?? ''}
                          onChange={(e) => update(r.id, { phone: e.target.value || null })}
                          aria-label={`Numéro de ${r.label}`}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
                        >
                          {r.phones.map((p) => { const n = normalizePhone(p); return <option key={p} value={n ?? ''} disabled={!n}>{n ? formatPhone(n) : `${p} (invalide)`}</option>; })}
                        </select>
                      ) : (
                        <p className="px-2 text-sm text-slate-600">{r.phone ? formatPhone(r.phone) : <span className="text-rose-600">Numéro invalide</span>}</p>
                      )}
                      {r.duplicate && <p className="px-2 text-xs font-semibold text-amber-700">Déjà dans votre liste</p>}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="shrink-0 space-y-2 border-t border-slate-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-7">
              {overLimit && (
                <p className="text-xs font-semibold text-amber-700">Version gratuite : seuls les {room} premiers seront ajoutés ({room} place{room > 1 ? 's' : ''} restante{room > 1 ? 's' : ''}).</p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setRows(null); setError(null); }} disabled={saving} className="min-h-[48px] rounded-xl border border-slate-200 px-4 text-sm font-semibold text-ink hover:bg-slate-50">
                  Retour
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={!selected.length || saving}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {saving ? 'Ajout…' : selected.length ? `Ajouter ${selected.length} proche${selected.length > 1 ? 's' : ''}` : 'Aucun contact sélectionné'}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Segment({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink">
        {options.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
      </select>
    </label>
  );
}
