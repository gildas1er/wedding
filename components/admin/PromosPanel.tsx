"use client";

// Administration : codes promo (création, suivi, commissions des partenaires) et parrainages.
import React, { useState } from 'react';
import { Ticket, Plus, Loader2, Gift, Power, Trash2, Copy, Check, ChevronRight } from 'lucide-react';
import { formatXof } from '../../lib/plan';
import { describeDiscount, normalizeCode, type PromoCode } from '../../lib/promo';
import { useConfirm } from '../ui/ConfirmDialog';
import { fmtDate } from './CoupleDrawer';

export type AdminPromo = PromoCode & { used: number; pending: number; commissionDue: number };
export type AdminReferral = { id: string; couple?: string; parrainId: string; parrain: string; createdAt: string | null; paid: boolean; rewardPaidAt: string | null; reward: number };

const input = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-amber-400';
const label = 'block text-xs font-semibold text-slate-600';
const EMPTY = { code: '', label: '', discount_type: 'amount' as 'amount' | 'percent', discount_value: '10000', valid_until: '', max_uses: '', partner_name: '', partner_phone: '', commission_xof: '' };

export default function PromosPanel({ promos, referrals, ready, generatedAt, onSave, onOpen }: {
  promos: AdminPromo[];
  generatedAt: string; // heure des données : référence stable pour « expiré »
  referrals: AdminReferral[];
  ready: boolean;
  onSave: (body: Record<string, unknown>) => Promise<boolean>;
  onOpen: (id: string) => void;
}) {
  const { confirm } = useConfirm();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: k === 'code' ? normalizeCode(e.target.value) : e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('save');
    const ok = await onSave({
      op: 'save', ...form,
      discount_value: Number(form.discount_value), max_uses: form.max_uses ? Number(form.max_uses) : null,
      commission_xof: Number(form.commission_xof) || 0, valid_until: form.valid_until || null,
    });
    setBusy(null);
    if (ok) setForm(EMPTY);
  };
  const edit = (p: AdminPromo) => setForm({
    code: p.code, label: p.label ?? '', discount_type: p.discount_type, discount_value: String(p.discount_value),
    valid_until: p.valid_until ? p.valid_until.slice(0, 10) : '', max_uses: p.max_uses ? String(p.max_uses) : '',
    partner_name: p.partner_name ?? '', partner_phone: p.partner_phone ?? '', commission_xof: p.commission_xof ? String(p.commission_xof) : '',
  });
  const copy = async (code: string) => { try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1500); } catch { /* refusé */ } };

  const now = new Date(generatedAt).getTime();
  const rewardsDue = referrals.filter((r) => r.paid && !r.rewardPaidAt);
  const commissions = promos.reduce((s, p) => s + p.commissionDue, 0);

  if (!ready) {
    return <p className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">Les codes promo et le parrainage seront disponibles après la migration « 20261009_19_codes_promo_parrainage.sql ».</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Codes actifs" value={promos.filter((p) => p.active && (!p.valid_until || new Date(p.valid_until).getTime() > now)).length} />
        <Stat label="Ventes avec un code" value={promos.reduce((s, p) => s + p.used, 0) + referrals.filter((r) => r.paid).length} />
        <Stat label="Commissions partenaires" value={formatXof(commissions)} />
        <Stat label="Récompenses à verser" value={formatXof(rewardsDue.reduce((s, r) => s + r.reward, 0))} tone={rewardsDue.length ? 'gold' : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Création / modification */}
        <form onSubmit={save} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink"><Plus className="h-4 w-4 text-amber-600" /> {promos.some((p) => p.code === form.code) ? `Modifier ${form.code}` : 'Nouveau code promo'}</h2>
          <div className="space-y-3">
            <label className={label} htmlFor="pc-code">Code
              <input id="pc-code" value={form.code} onChange={set('code')} placeholder="Ex : LANCEMENT" required maxLength={24} className={`${input} mt-1 font-mono uppercase`} />
            </label>
            <label className={label} htmlFor="pc-label">Nom de l’offre (vu par le couple)
              <input id="pc-label" value={form.label} onChange={set('label')} placeholder="Ex : Offre de lancement" className={`${input} mt-1`} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={label} htmlFor="pc-type">Réduction
                <select id="pc-type" value={form.discount_type} onChange={set('discount_type')} className={`${input} mt-1`}>
                  <option value="amount">Montant (F)</option><option value="percent">Pourcentage (%)</option>
                </select>
              </label>
              <label className={label} htmlFor="pc-value">{form.discount_type === 'percent' ? 'Pourcentage' : 'Montant (F)'}
                <input id="pc-value" type="number" min={1} max={form.discount_type === 'percent' ? 100 : undefined} value={form.discount_value} onChange={set('discount_value')} required className={`${input} mt-1`} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className={label} htmlFor="pc-until">Valable jusqu’au
                <input id="pc-until" type="date" value={form.valid_until} onChange={set('valid_until')} className={`${input} mt-1`} />
              </label>
              <label className={label} htmlFor="pc-max">Utilisations max.
                <input id="pc-max" type="number" min={1} value={form.max_uses} onChange={set('max_uses')} placeholder="Illimité" className={`${input} mt-1`} />
              </label>
            </div>
            <p className="pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Partenaire (facultatif)</p>
            <div className="grid grid-cols-2 gap-2">
              <label className={label} htmlFor="pc-partner">Nom
                <input id="pc-partner" value={form.partner_name} onChange={set('partner_name')} placeholder="Ex : Salle Latrille" className={`${input} mt-1`} />
              </label>
              <label className={label} htmlFor="pc-phone">Téléphone
                <input id="pc-phone" value={form.partner_phone} onChange={set('partner_phone')} inputMode="tel" className={`${input} mt-1`} />
              </label>
            </div>
            <label className={label} htmlFor="pc-com">Commission par vente (F)
              <input id="pc-com" type="number" min={0} value={form.commission_xof} onChange={set('commission_xof')} placeholder="Ex : 10000" className={`${input} mt-1`} />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy !== null} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4 text-amber-300" />} Enregistrer le code
            </button>
            {form.code && <button type="button" onClick={() => setForm(EMPTY)} className="min-h-[44px] rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-50">Annuler</button>}
          </div>
        </form>

        {/* Liste des codes */}
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 lg:col-span-3">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><Ticket className="h-4 w-4 text-amber-600" /> Codes promo</h2>
          {!promos.length ? <p className="py-6 text-center text-sm text-slate-500">Aucun code pour l’instant. Créez-en un pour un partenaire ou une offre de lancement.</p> : (
            <ul className="divide-y divide-slate-100">
              {promos.map((p) => {
                const expired = Boolean(p.valid_until && new Date(p.valid_until).getTime() < now);
                const full = Boolean(p.max_uses && p.used >= p.max_uses);
                const state = !p.active ? 'Désactivé' : expired ? 'Expiré' : full ? 'Épuisé' : 'Actif';
                return (
                  <li key={p.code} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => copy(p.code)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 font-mono text-sm font-semibold text-ink hover:bg-slate-100" aria-label={`Copier ${p.code}`}>
                        {p.code} {copied === p.code ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                      </button>
                      <span className="text-sm font-semibold text-emerald-700">{describeDiscount(p)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${state === 'Actif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{state}</span>
                      <span className="ml-auto flex gap-1">
                        <button type="button" onClick={() => edit(p)} className="min-h-[36px] rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Modifier</button>
                        <button type="button" disabled={busy !== null} onClick={async () => { setBusy(p.code); await onSave({ op: 'toggle', code: p.code, active: !p.active }); setBusy(null); }}
                          aria-label={p.active ? 'Désactiver' : 'Activer'} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-ink">
                          {busy === p.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                        </button>
                        <button type="button" disabled={busy !== null} aria-label="Supprimer"
                          onClick={async () => { if (await confirm({ title: 'Supprimer ce code ?', item: p.code, confirmLabel: 'Supprimer', message: p.used || p.pending ? 'Des couples l’ont déjà saisi : il sera seulement désactivé, pour garder l’historique.' : 'Les couples ne pourront plus le saisir.' })) onSave({ op: 'delete', code: p.code }); }}
                          className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {p.label ? `${p.label} · ` : ''}{p.used} vente{p.used > 1 ? 's' : ''}{p.max_uses ? ` sur ${p.max_uses}` : ''} · {p.pending} en attente
                      {p.valid_until ? ` · jusqu’au ${fmtDate(p.valid_until)}` : ''}
                    </p>
                    {p.partner_name && (
                      <p className="mt-0.5 text-xs text-slate-600">Partenaire : <strong>{p.partner_name}</strong>{p.partner_phone ? ` (${p.partner_phone})` : ''}{p.commission_xof ? ` · ${formatXof(p.commission_xof)} par vente · dû : ${formatXof(p.commissionDue)}` : ''}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Parrainages */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Gift className="h-4 w-4 text-amber-600" /> Parrainages</h2>
        <p className="mb-3 mt-0.5 text-xs text-slate-500">Chaque couple a son code. Quand un filleul paie, versez la récompense au parrain puis notez-la dans la fiche du filleul.</p>
        {!referrals.length ? <p className="py-6 text-center text-sm text-slate-500">Aucun couple parrainé pour l’instant.</p> : (
          <ul className="divide-y divide-slate-100">
            {referrals.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onOpen(r.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 py-3 text-left hover:bg-slate-50/60">
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{r.couple}</span><span className="block truncate text-xs text-slate-500">parrainé par {r.parrain} · inscrit le {fmtDate(r.createdAt)}</span></span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.rewardPaidAt ? 'bg-emerald-50 text-emerald-700' : r.paid ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                    {r.rewardPaidAt ? `Récompense versée ${fmtDate(r.rewardPaidAt)}` : r.paid ? `${formatXof(r.reward)} à verser` : 'Pas encore payé'}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label: l, value, tone }: { label: string; value: React.ReactNode; tone?: 'gold' }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${tone === 'gold' ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-slate-200'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{l}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
    </div>
  );
}
