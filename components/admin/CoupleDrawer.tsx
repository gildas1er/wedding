"use client";

// Fiche d'un couple dans l'administration : informations, formule, invités et actions.
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Mail, Phone, MessageCircle, ExternalLink, Crown, CalendarDays, Clock, Users, Ban, RotateCcw,
  Trash2, Loader2, CalendarPlus, Banknote, ArrowDownCircle, Check,
} from 'lucide-react';
import { TIERS, formatXof, tierById, upgradePrice } from '../../lib/plan';
import { EXTENSION_MONTHS, EXTENSION_PRICE_XOF } from '../../lib/lifecycle';
import { useConfirm } from '../ui/ConfirmDialog';

export type AdminCouple = {
  id: string; ref: string; userId: string | null; couple: string; email: string | null; phone: string | null; provider: string | null;
  createdAt: string | null; lastSignIn: string | null; banned: boolean; weddingDate: string | null; city: string | null;
  phase: 'active' | 'souvenir'; deleteAt: string | null; plan: string; premium: boolean; tier: string | null;
  premiumUntil: string | null; keptUntil: string | null; limit: number | null; byPersons: boolean; used: number;
  fiches: number; persons: number; confirmed: number; declined: number; pending: number; paid: number; template: string;
};

export const tierLabel = (c: Pick<AdminCouple, 'premium' | 'tier'>) =>
  !c.premium ? 'Gratuit' : tierById(c.tier)?.label ?? (c.tier === 'sur_mesure' ? 'Sur mesure' : 'Illimité');

export const fmtDate = (iso: string | null, withTime = false) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '—';

export function daysTo(iso: string | null) {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

const waLink = (phone: string) => `https://api.whatsapp.com/send?phone=${phone.replace(/[^\d]/g, '').replace(/^0(?=\d{9}$)/, '2250')}`;
const input = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-amber-400';

export default function CoupleDrawer({ couple: c, onClose, onAction }: {
  couple: AdminCouple;
  onClose: () => void;
  onAction: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
}) {
  const { confirm } = useConfirm();
  const currentTier = c.premium ? c.tier : null;
  const nextTier = TIERS.find((t) => t.max >= c.persons && (!tierById(currentTier) || t.max > tierById(currentTier)!.max)) ?? TIERS[TIERS.length - 1];
  const [tier, setTier] = useState<string>(nextTier.id);
  const [limit, setLimit] = useState('400');
  const [amount, setAmount] = useState(String(upgradePrice(currentTier, nextTier.id)));
  const [note, setNote] = useState('');
  const [extAmount, setExtAmount] = useState(String(EXTENSION_PRICE_XOF));
  const [payAmount, setPayAmount] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteWord, setDeleteWord] = useState('');

  const run = async (key: string, action: string, payload?: Record<string, unknown>) => {
    setBusy(key);
    await onAction(action, payload);
    setBusy(null);
  };

  const pickTier = (id: string) => {
    setTier(id);
    const t = tierById(id);
    setAmount(t ? String(upgradePrice(currentTier, t.id)) : '');
  };

  const days = daysTo(c.weddingDate);
  const pct = c.limit ? Math.min(100, (c.used / c.limit) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-ink/40 backdrop-blur-[2px]" onClick={onClose}>
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-ivory shadow-2xl"
      >
        {/* En-tête */}
        <header className="shrink-0 border-b border-slate-200/80 bg-white px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-slate-400">Réf. {c.ref}</p>
              <h2 id="drawer-title" className="mt-0.5 truncate font-display text-2xl text-ink">{c.couple}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                <span className={`rounded-full px-2.5 py-1 ${c.premium ? 'bg-ink text-amber-300' : 'bg-slate-100 text-slate-600'}`}>{tierLabel(c)}</span>
                <span className={`rounded-full px-2.5 py-1 ${c.phase === 'souvenir' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{c.phase === 'souvenir' ? 'Mode souvenir' : 'Actif'}</span>
                {c.banned && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">Compte désactivé</span>}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-ink"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
          {/* Contact */}
          <section className="grid gap-2 sm:grid-cols-2">
            {c.email && <a href={`mailto:${c.email}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-slate-200 hover:ring-amber-300"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{c.email}</span></a>}
            {c.phone && (
              <div className="flex gap-2">
                <a href={`tel:${c.phone}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-slate-200 hover:ring-amber-300"><Phone className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{c.phone}</span></a>
                <a href={waLink(c.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="grid w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"><MessageCircle className="h-4 w-4" /></a>
              </div>
            )}
            <a href={`/rsvp/${c.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-slate-200 hover:ring-amber-300 sm:col-span-2"><ExternalLink className="h-4 w-4 text-slate-400" /> Voir son invitation</a>
          </section>

          {/* Repères */}
          <section className="grid grid-cols-2 gap-2 text-sm">
            <Fact icon={CalendarDays} label="Mariage" value={c.weddingDate ? `${fmtDate(c.weddingDate)}${days !== null ? ` · ${days > 0 ? `J-${days}` : days === 0 ? 'aujourd’hui' : `passé de ${-days} j`}` : ''}` : '—'} />
            <Fact icon={Clock} label="Dernière connexion" value={fmtDate(c.lastSignIn, true)} />
            <Fact icon={CalendarPlus} label="Inscription" value={`${fmtDate(c.createdAt)}${c.provider && c.provider !== 'email' ? ` · ${c.provider}` : ''}`} />
            <Fact icon={Banknote} label="Total encaissé" value={formatXof(c.paid)} />
            {c.premium && c.premiumUntil && <Fact icon={Crown} label="Accès Premium jusqu’au" value={fmtDate(c.premiumUntil)} />}
            {c.deleteAt && <Fact icon={Trash2} label="Suppression automatique" value={fmtDate(c.deleteAt)} />}
          </section>

          {/* Invités */}
          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Users className="h-4 w-4 text-rose-500" /> Invités</p>
            <p className="mt-2 font-display text-3xl text-ink">{c.used}<span className="text-lg text-slate-400"> / {c.limit ?? '∞'} {c.byPersons ? 'personnes' : 'fiches'}</span></p>
            {c.limit !== null && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">{c.fiches} fiches · {c.persons} personnes · {c.confirmed} confirmées · {c.pending} en attente · {c.declined} déclinées</p>
          </section>

          {/* Formule */}
          <Panel title="Activer ou changer de palier" icon={Crown}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[...TIERS.map((t) => ({ id: t.id, label: t.label, sub: `${t.max} inv. · ${formatXof(t.price)}` })), { id: 'sur_mesure', label: 'Sur mesure', sub: '+ de 300, sur devis' }, { id: 'illimite', label: 'Illimité', sub: 'sans limite' }].map((o) => (
                <button key={o.id} type="button" onClick={() => pickTier(o.id)} aria-pressed={tier === o.id}
                  className={`rounded-xl px-3 py-2 text-left ring-1 transition-colors ${tier === o.id ? 'bg-amber-50 ring-2 ring-amber-400' : 'bg-white ring-slate-200 hover:ring-amber-300'} ${currentTier === o.id ? 'opacity-60' : ''}`}>
                  <span className="flex items-center gap-1 text-sm font-semibold text-ink">{o.label}{currentTier === o.id && <Check className="h-3.5 w-3.5 text-emerald-600" />}</span>
                  <span className="block text-[11px] text-slate-500">{o.sub}</span>
                </button>
              ))}
            </div>
            {tier === 'sur_mesure' && (
              <label className="mt-3 block text-xs font-semibold text-slate-600">Limite d’invités
                <input type="number" min={301} value={limit} onChange={(e) => setLimit(e.target.value)} className={`${input} mt-1`} />
              </label>
            )}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-600">Montant encaissé (FCFA)
                <input type="number" min={0} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={`${input} mt-1`} />
              </label>
              <label className="block text-xs font-semibold text-slate-600">Note (mode de paiement…)
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : Wave, réf. 12345" className={`${input} mt-1`} />
              </label>
            </div>
            {currentTier && tierById(tier) && <p className="mt-2 text-xs text-slate-500">Différence avec le palier actuel ({tierLabel(c)}) : {formatXof(upgradePrice(currentTier, tier as never))}</p>}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('tier', 'tier', { tier, limit: Number(limit), amount: Number(amount) || 0, note })}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {busy === 'tier' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4 text-amber-300" />} Activer ce palier
            </button>
            {c.premium && (
              <button type="button" disabled={busy !== null}
                onClick={async () => { if (await confirm({ title: 'Revenir à la version gratuite ?', item: c.couple, tone: 'neutral', icon: ArrowDownCircle, confirmLabel: 'Revenir au gratuit', message: 'Ses invités sont conservés, mais il ne pourra plus en ajouter au-delà de la limite gratuite.' })) run('free', 'free'); }}
                className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-ink">
                {busy === 'free' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />} Revenir à la version gratuite
              </button>
            )}
          </Panel>

          <div className="grid gap-5 sm:grid-cols-2">
            <Panel title={`Prolonger de ${EXTENSION_MONTHS} mois`} icon={CalendarPlus}>
              <p className="text-xs text-slate-500">{c.keptUntil ? `Prolongé jusqu’au ${fmtDate(c.keptUntil)}.` : 'L’espace redevient complet et sa suppression est repoussée.'}</p>
              <input type="number" min={0} value={extAmount} onChange={(e) => setExtAmount(e.target.value)} aria-label="Montant encaissé pour la prolongation" className={`${input} mt-2`} />
              <button type="button" disabled={busy !== null} onClick={() => run('extend', 'extend', { amount: Number(extAmount) || 0 })}
                className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-ink hover:border-ink disabled:opacity-50">
                {busy === 'extend' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Prolonger
              </button>
            </Panel>
            <Panel title="Enregistrer un paiement" icon={Banknote}>
              <p className="text-xs text-slate-500">Un acompte ou un complément, sans changer la formule.</p>
              <input type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Montant (FCFA)" aria-label="Montant encaissé" className={`${input} mt-2`} />
              <button type="button" disabled={busy !== null || !Number(payAmount)} onClick={async () => { await run('payment', 'payment', { amount: Number(payAmount), note }); setPayAmount(''); }}
                className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-ink hover:border-ink disabled:opacity-50">
                {busy === 'payment' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />} Enregistrer
              </button>
            </Panel>
          </div>

          {/* Compte */}
          <Panel title="Compte" icon={c.banned ? RotateCcw : Ban}>
            <p className="text-xs text-slate-500">{c.banned ? 'Le couple ne peut plus se connecter. Ses invités voient toujours son invitation.' : 'Désactiver empêche le couple de se connecter, sans rien supprimer.'}</p>
            <button
              type="button"
              disabled={busy !== null || !c.userId}
              onClick={async () => {
                if (c.banned) return run('ban', 'enable');
                if (await confirm({ title: 'Désactiver ce compte ?', item: c.couple, tone: 'neutral', icon: Ban, confirmLabel: 'Désactiver', message: 'Le couple ne pourra plus se connecter tant que vous ne réactivez pas son compte. Rien n’est supprimé.' })) run('ban', 'disable');
              }}
              className={`mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${c.banned ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'}`}
            >
              {busy === 'ban' ? <Loader2 className="h-4 w-4 animate-spin" /> : c.banned ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              {c.banned ? 'Réactiver le compte' : 'Désactiver le compte'}
            </button>
          </Panel>

          <section className="rounded-2xl border border-rose-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-rose-700"><Trash2 className="h-4 w-4" /> Supprimer définitivement</p>
            <p className="mt-1 text-xs text-slate-500">Espace, invités, fichiers et compte de connexion. Les paiements restent dans l’historique. Tapez <strong>SUPPRIMER</strong> pour confirmer.</p>
            <div className="mt-2 flex gap-2">
              <input value={deleteWord} onChange={(e) => setDeleteWord(e.target.value)} placeholder="SUPPRIMER" aria-label="Confirmation" className={`${input} uppercase`} autoCapitalize="characters" />
              <button type="button" disabled={busy !== null || deleteWord.trim().toUpperCase() !== 'SUPPRIMER'}
                onClick={() => run('delete', 'delete', { confirm: deleteWord })}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40">
                {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Supprimer
              </button>
            </div>
          </section>
        </div>
      </motion.aside>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Mail; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><Icon className="h-4 w-4 text-amber-600" /> {title}</p>
      {children}
    </section>
  );
}
