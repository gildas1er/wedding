"use client";

// Administration WeddingStudio : vue d'ensemble, couples, paiements et journal des actions.
// Accès réservé aux adresses de ADMIN_EMAILS (vérifié par le serveur à chaque requête).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AlliancesMark from '../../components/brand/AlliancesMark';
import { AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Banknote, ScrollText, RefreshCw, Search, Loader2, ShieldAlert, LogOut,
  Crown, CalendarDays, AlertTriangle, TrendingUp, Heart, UserPlus, ChevronRight, Ticket,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TIERS, formatXof } from '../../lib/plan';
import { ConfirmProvider, useConfirm } from '../../components/ui/ConfirmDialog';
import CoupleDrawer, { daysTo, fmtDate, tierLabel, type AdminCouple } from '../../components/admin/CoupleDrawer';
import PromosPanel, { type AdminPromo, type AdminReferral } from '../../components/admin/PromosPanel';

type Payment = { id: string; created_at: string; completed_at: string | null; marriage_id: string; couple: string | null; amount: number; status: string; provider: string; note: string | null };
type Action = { id: string; created_at: string; admin_email: string; couple: string | null; action: string; details: Record<string, unknown> | null };
type Data = { generatedAt: string; couples: AdminCouple[]; payments: Payment[]; actions: Action[]; journalReady: boolean; promos?: AdminPromo[]; referrals?: AdminReferral[]; promosReady?: boolean };
type Tab = 'overview' | 'couples' | 'promos' | 'payments' | 'journal';

const ACTION_LABELS: Record<string, string> = {
  palier: 'Palier activé', gratuit: 'Retour au gratuit', prolongation: 'Prolongation', paiement: 'Paiement enregistré',
  desactivation: 'Compte désactivé', reactivation: 'Compte réactivé', suppression: 'Couple supprimé',
  recompense: 'Récompense de parrainage versée', code_promo: 'Code promo enregistré', code_active: 'Code promo activé',
  code_desactive: 'Code promo désactivé', code_supprime: 'Code promo supprimé',
};

export default function AdminPage() {
  return <ConfirmProvider><AdminContent /></ConfirmProvider>;
}

function AdminContent() {
  const { notify } = useConfirm();
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState<{ code: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [openId, setOpenId] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  // Filtres de la liste
  const [query, setQuery] = useState('');
  const [formula, setFormula] = useState('all');
  const [state, setState] = useState('all');
  const [sort, setSort] = useState<'recent' | 'wedding' | 'guests' | 'paid'>('recent');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/overview', { cache: 'no-store' }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok) setStatus({ code: res?.status ?? 0, message: json?.error ?? 'Connexion impossible.' });
    else { setStatus(null); setData(json); }
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
    supabase.auth.getUser().then(({ data: { user } }) => setMe(user?.email ?? null));
  }, [load]);

  const act = useCallback(async (id: string, action: string, payload?: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/couples/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok) { notify(json?.error ?? 'L’action a échoué.', 'error'); return false; }
    notify({ tier: 'Palier activé', free: 'Couple repassé en version gratuite', extend: 'Espace prolongé', payment: 'Paiement enregistré', disable: 'Compte désactivé', enable: 'Compte réactivé', delete: 'Couple supprimé', referral_paid: 'Récompense notée' }[action] ?? 'C’est fait');
    if (action === 'delete') setOpenId(null);
    await load();
    return true;
  }, [load, notify]);

  const savePromo = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/promos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok) { notify(json?.error ?? 'L’action a échoué.', 'error'); return false; }
    notify(json?.kept ? 'Code déjà utilisé : il est désactivé' : body.op === 'save' ? 'Code enregistré' : body.op === 'delete' ? 'Code supprimé' : body.active ? 'Code activé' : 'Code désactivé');
    await load();
    return true;
  }, [load, notify]);

  const couples = useMemo(() => data?.couples ?? [], [data]);
  const stats = useMemo(() => {
    // Référence : l'heure de génération des données (calcul stable pendant l'affichage)
    const now = data ? new Date(data.generatedAt).getTime() : 0;
    const week = now - 7 * 86_400_000;
    const month = new Date(now); month.setDate(1); month.setHours(0, 0, 0, 0);
    const completed = (data?.payments ?? []).filter((p) => p.status === 'completed');
    return {
      total: couples.length,
      newWeek: couples.filter((c) => c.createdAt && new Date(c.createdAt).getTime() > week).length,
      active: couples.filter((c) => c.phase === 'active').length,
      souvenir: couples.filter((c) => c.phase === 'souvenir').length,
      banned: couples.filter((c) => c.banned).length,
      premium: couples.filter((c) => c.premium).length,
      persons: couples.reduce((s, c) => s + c.persons, 0),
      confirmed: couples.reduce((s, c) => s + c.confirmed, 0),
      revenue: completed.reduce((s, p) => s + (Number(p.amount) || 0), 0),
      revenueMonth: completed.filter((p) => new Date(p.completed_at ?? p.created_at) >= month).reduce((s, p) => s + (Number(p.amount) || 0), 0),
      byTier: [
        { id: 'free', label: 'Gratuit', n: couples.filter((c) => !c.premium).length },
        ...TIERS.map((t) => ({ id: t.id, label: t.label, n: couples.filter((c) => c.premium && c.tier === t.id).length })),
        { id: 'sur_mesure', label: 'Sur mesure', n: couples.filter((c) => c.premium && c.tier === 'sur_mesure').length },
        { id: 'illimite', label: 'Illimité', n: couples.filter((c) => c.premium && (c.tier === 'illimite' || !c.tier)).length },
      ],
      upcoming: couples.filter((c) => { const d = daysTo(c.weddingDate); return d !== null && d >= 0 && d <= 45; }).sort((a, b) => (daysTo(a.weddingDate) ?? 0) - (daysTo(b.weddingDate) ?? 0)),
      nearLimit: couples.filter((c) => c.limit !== null && c.phase === 'active' && c.used >= c.limit * 0.8).sort((a, b) => b.used / (b.limit || 1) - a.used / (a.limit || 1)),
      weeks: Array.from({ length: 8 }, (_, i) => {
        const end = now - i * 7 * 86_400_000;
        const start = end - 7 * 86_400_000;
        return { label: i === 0 ? 'Cette sem.' : `S-${i}`, n: couples.filter((c) => c.createdAt && new Date(c.createdAt).getTime() > start && new Date(c.createdAt).getTime() <= end).length };
      }).reverse(),
    };
  }, [couples, data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return couples
      .filter((c) => !q || [c.couple, c.email, c.phone, c.ref, c.city].some((v) => v?.toLowerCase().includes(q)))
      .filter((c) => formula === 'all' || (formula === 'free' ? !c.premium : formula === 'illimite' ? c.premium && (c.tier === 'illimite' || !c.tier) : c.premium && c.tier === formula))
      .filter((c) => state === 'all' || (state === 'active' && c.phase === 'active' && !c.banned) || (state === 'souvenir' && c.phase === 'souvenir') || (state === 'banned' && c.banned) || (state === 'near' && c.limit !== null && c.used >= c.limit * 0.8))
      .sort((a, b) => {
        if (sort === 'wedding') return (a.weddingDate ?? '9999').localeCompare(b.weddingDate ?? '9999');
        if (sort === 'guests') return b.persons - a.persons;
        if (sort === 'paid') return b.paid - a.paid;
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      });
  }, [couples, query, formula, state, sort]);

  const open = couples.find((c) => c.id === openId) ?? null;

  if (loading && !data) return <div className="flex min-h-screen items-center justify-center bg-ivory"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div>;

  if (status && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory p-6">
        <div className="max-w-md rounded-[1.75rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600"><ShieldAlert className="h-7 w-7" /></span>
          <h1 className="mt-4 font-display text-2xl text-ink">{status.code === 403 ? 'Accès réservé' : status.code === 401 ? 'Connexion requise' : 'Administration indisponible'}</h1>
          <p className="mt-2 text-sm text-slate-600">{status.message}</p>
          <div className="mt-6 flex flex-col gap-2">
            {status.code === 401 && <Link href="/login?next=/admin" className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700">Se connecter</Link>}
            <Link href="/dashboard" className="inline-flex min-h-[44px] items-center justify-center text-sm font-semibold text-slate-500 hover:text-ink">Retour à l’espace des mariés</Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Users; n?: number }[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { id: 'couples', label: 'Couples', icon: Users, n: couples.length },
    { id: 'promos', label: 'Promos & parrainage', icon: Ticket, n: data?.promos?.length },
    { id: 'payments', label: 'Paiements', icon: Banknote, n: data?.payments.length },
    { id: 'journal', label: 'Journal', icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <title>Administration | WeddingStudio</title>
      {/* En-tête */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex min-w-0 items-baseline gap-0.5">
            <AlliancesMark size={30} className="mr-1.5 shrink-0 self-center" />
            <span className="font-display text-xl text-ink">Wedding</span><span className="font-display text-xl italic text-rose-500">Studio</span>
            <span className="ml-2 hidden rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 sm:inline">Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden truncate text-xs text-slate-500 md:inline">{me}</span>
            <button type="button" onClick={load} disabled={loading} aria-label="Actualiser" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-ink">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} aria-label="Déconnexion" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-rose-600"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 sm:px-5 [scrollbar-width:none]" role="tablist">
          {tabs.map(({ id, label, icon: Icon, n }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${tab === id ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'}`}>
              <Icon className="h-4 w-4" /> {label}{n !== undefined && <span className={`rounded-full px-1.5 text-xs ${tab === id ? 'bg-white/20' : 'bg-slate-100'}`}>{n}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon={Heart} label="Couples inscrits" value={stats.total} sub={`+${stats.newWeek} cette semaine`} />
              <Kpi icon={Crown} label="Paliers payants" value={stats.premium} sub={`${stats.total ? Math.round((stats.premium / stats.total) * 100) : 0} % des couples`} tone="gold" />
              <Kpi icon={Banknote} label="Encaissé" value={formatXof(stats.revenue)} sub={`${formatXof(stats.revenueMonth)} ce mois-ci`} tone="green" />
              <Kpi icon={Users} label="Invités gérés" value={stats.persons.toLocaleString('fr-FR')} sub={`${stats.confirmed.toLocaleString('fr-FR')} fiches confirmées`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="Inscriptions (8 semaines)" icon={TrendingUp} className="lg:col-span-2">
                <div className="flex h-40 items-end gap-2">
                  {stats.weeks.map((w) => {
                    const max = Math.max(1, ...stats.weeks.map((x) => x.n));
                    return (
                      <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5">
                        <span className="text-xs font-semibold tabular-nums text-ink">{w.n}</span>
                        <div className="w-full rounded-t-lg bg-rose-400/80" style={{ height: `${Math.max(4, (w.n / max) * 110)}px` }} />
                        <span className="text-[10px] text-slate-500">{w.label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-500">{stats.active} espaces actifs · {stats.souvenir} en mode souvenir · {stats.banned} désactivés</p>
              </Card>
              <Card title="Répartition par formule" icon={Crown}>
                <ul className="space-y-2">
                  {stats.byTier.filter((t) => t.n > 0 || t.id === 'free').map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => { setFormula(t.id); setState('all'); setTab('couples'); }} className="w-full text-left">
                        <span className="flex justify-between text-sm"><span className="font-semibold text-ink">{t.label}</span><span className="tabular-nums text-slate-600">{t.n}</span></span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${t.id === 'free' ? 'bg-slate-400' : 'bg-amber-500'}`} style={{ width: `${stats.total ? (t.n / stats.total) * 100 : 0}%` }} /></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Proches de leur limite" icon={AlertTriangle} hint="Bon moment pour proposer le palier supérieur">
                <CoupleList list={stats.nearLimit.slice(0, 8)} empty="Aucun couple proche de sa limite." onOpen={setOpenId}
                  right={(c) => <span className={`text-sm font-semibold tabular-nums ${c.used >= (c.limit ?? 0) ? 'text-rose-600' : 'text-amber-700'}`}>{c.used} / {c.limit}</span>} />
              </Card>
              <Card title="Mariages des 45 prochains jours" icon={CalendarDays}>
                <CoupleList list={stats.upcoming.slice(0, 8)} empty="Aucun mariage à venir." onOpen={setOpenId}
                  right={(c) => <span className="text-sm font-semibold text-rose-600">{daysTo(c.weddingDate) === 0 ? 'Aujourd’hui' : `J-${daysTo(c.weddingDate)}`}</span>} />
              </Card>
            </div>

            <Card title="Derniers inscrits" icon={UserPlus}>
              <CoupleList list={couples.slice(0, 6)} empty="Aucun couple inscrit." onOpen={setOpenId}
                right={(c) => <span className="text-xs text-slate-500">{fmtDate(c.createdAt)}</span>} />
            </Card>
          </div>
        )}

        {tab === 'couples' && (
          <div>
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Rechercher un couple</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, e-mail, téléphone, référence…" className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-base outline-none focus:border-amber-400 sm:text-sm" />
              </label>
              <div className="grid grid-cols-3 gap-2 lg:flex">
                <select value={formula} onChange={(e) => setFormula(e.target.value)} aria-label="Formule" className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="all">Toutes formules</option><option value="free">Gratuit</option>
                  {TIERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  <option value="sur_mesure">Sur mesure</option><option value="illimite">Illimité</option>
                </select>
                <select value={state} onChange={(e) => setState(e.target.value)} aria-label="État" className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="all">Tous états</option><option value="active">Actifs</option><option value="near">Proches limite</option>
                  <option value="souvenir">Mode souvenir</option><option value="banned">Désactivés</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Tri" className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="recent">Plus récents</option><option value="wedding">Date du mariage</option><option value="guests">Plus d’invités</option><option value="paid">Plus payé</option>
                </select>
              </div>
            </div>
            <p className="mb-3 text-sm text-slate-500">{filtered.length} couple{filtered.length > 1 ? 's' : ''}</p>

            {/* Tableau (ordinateur) */}
            <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3">Couple</th><th className="px-4 py-3">Mariage</th><th className="px-4 py-3">Formule</th><th className="px-4 py-3">Invités</th><th className="px-4 py-3">Réponses</th><th className="px-4 py-3 text-right">Encaissé</th><th className="px-4 py-3">Connexion</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer hover:bg-amber-50/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{c.couple} {c.banned && <span className="ml-1 rounded bg-rose-50 px-1.5 text-[10px] font-bold text-rose-700">DÉSACTIVÉ</span>}</p>
                        <p className="text-xs text-slate-500">{c.email ?? '—'} · <span className="font-mono">{c.ref}</span></p>
                      </td>
                      <td className="px-4 py-3"><p>{fmtDate(c.weddingDate)}</p><p className={`text-xs ${c.phase === 'souvenir' ? 'text-amber-700' : 'text-slate-500'}`}>{c.phase === 'souvenir' ? 'Mode souvenir' : (() => { const d = daysTo(c.weddingDate); return d === null ? '' : d >= 0 ? `J-${d}` : 'Passé'; })()}</p></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.premium ? 'bg-ink text-amber-300' : 'bg-slate-100 text-slate-600'}`}>{tierLabel(c)}</span></td>
                      <td className="px-4 py-3"><Gauge c={c} /></td>
                      <td className="px-4 py-3 text-xs text-slate-600"><span className="font-semibold text-emerald-700">{c.confirmed}</span> oui · {c.pending} attente · {c.declined} non</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{c.paid ? formatXof(c.paid) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(c.lastSignIn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <p className="p-10 text-center text-slate-500">Aucun couple ne correspond.</p>}
            </div>

            {/* Cartes (mobile, tablette) */}
            <ul className="space-y-2 lg:hidden">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setOpenId(c.id)} className="w-full rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 active:bg-amber-50/40">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{c.couple}</p>
                        <p className="truncate text-xs text-slate-500">{c.email ?? '—'} · <span className="font-mono">{c.ref}</span></p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${c.premium ? 'bg-ink text-amber-300' : 'bg-slate-100 text-slate-600'}`}>{tierLabel(c)}</span>
                    </div>
                    <div className="mt-3"><Gauge c={c} /></div>
                    <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span>Mariage {fmtDate(c.weddingDate)}</span><span>{c.confirmed} confirmés</span>{c.paid > 0 && <span className="font-semibold text-ink">{formatXof(c.paid)}</span>}
                      {c.banned && <span className="font-bold text-rose-700">Désactivé</span>}{c.phase === 'souvenir' && <span className="text-amber-700">Souvenir</span>}
                    </p>
                  </button>
                </li>
              ))}
              {!filtered.length && <li className="rounded-2xl bg-white p-8 text-center text-slate-500 ring-1 ring-slate-200">Aucun couple ne correspond.</li>}
            </ul>
          </div>
        )}

        {tab === 'promos' && (
          <PromosPanel promos={data?.promos ?? []} referrals={data?.referrals ?? []} ready={Boolean(data?.promosReady)} generatedAt={data?.generatedAt ?? ''} onSave={savePromo} onOpen={setOpenId} />
        )}

        {tab === 'payments' && (
          <Card title="Paiements encaissés" icon={Banknote} hint={`${formatXof(stats.revenue)} au total · ${formatXof(stats.revenueMonth)} ce mois-ci`}>
            {data?.payments.length ? (
              <ul className="divide-y divide-slate-100">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                    <span className="w-28 shrink-0 text-xs text-slate-500">{fmtDate(p.completed_at ?? p.created_at, true)}</span>
                    <button type="button" onClick={() => couples.some((c) => c.id === p.marriage_id) && setOpenId(p.marriage_id)} className="min-w-0 flex-1 truncate text-left font-semibold text-ink hover:underline">
                      {p.couple ?? couples.find((c) => c.id === p.marriage_id)?.couple ?? 'Couple supprimé'}
                    </button>
                    <span className="text-xs text-slate-500">{p.note ?? (p.provider === 'manuel' ? 'Manuel' : p.provider)}</span>
                    <span className={`w-28 shrink-0 text-right font-semibold tabular-nums ${p.status === 'completed' ? 'text-emerald-700' : 'text-slate-400'}`}>{formatXof(Number(p.amount) || 0)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="py-8 text-center text-slate-500">Aucun paiement enregistré. Ils apparaîtront ici quand vous activerez un palier avec un montant.</p>}
          </Card>
        )}

        {tab === 'journal' && (
          <Card title="Journal des actions" icon={ScrollText} hint="Les 60 dernières actions de l’administration">
            {!data?.journalReady && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Le journal sera disponible après la migration « 20261009_18_journal_admin.sql ».</p>}
            {data?.actions.length ? (
              <ul className="divide-y divide-slate-100">
                {data.actions.map((a) => (
                  <li key={a.id} className="py-3">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm"><span className="font-semibold text-ink">{ACTION_LABELS[a.action] ?? a.action}</span><span className="text-slate-500">· {a.couple ?? '—'}</span></p>
                    <p className="text-xs text-slate-500">{fmtDate(a.created_at, true)} · {a.admin_email}{a.details?.amount ? ` · ${formatXof(Number(a.details.amount))}` : ''}{a.details?.tier ? ` · ${String(a.details.tier)}` : ''}{a.details?.code ? ` · code ${String(a.details.code)}` : ''}{a.details?.parrain ? ` · ${String(a.details.parrain)}` : ''}{a.details?.note ? ` · ${String(a.details.note)}` : ''}</p>
                  </li>
                ))}
              </ul>
            ) : data?.journalReady && <p className="py-8 text-center text-slate-500">Aucune action pour l’instant.</p>}
          </Card>
        )}
      </main>

      <AnimatePresence>
        {open && <CoupleDrawer key={open.id} couple={open} onClose={() => setOpenId(null)} onAction={(action, payload) => act(open.id, action, payload)} />}
      </AnimatePresence>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof Users; label: string; value: React.ReactNode; sub: string; tone?: 'gold' | 'green' }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 sm:p-5 ${tone === 'gold' ? 'bg-ink text-white ring-ink' : 'bg-white ring-slate-200'}`}>
      <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone === 'gold' ? 'text-amber-300' : 'text-slate-500'}`}><Icon className="h-4 w-4" /> {label}</p>
      <p className={`mt-2 break-words font-display text-xl leading-tight sm:text-3xl ${tone === "green" ? "text-emerald-700" : ""}`}>{value}</p>
      <p className={`mt-0.5 text-xs ${tone === 'gold' ? 'text-white/60' : 'text-slate-500'}`}>{sub}</p>
    </div>
  );
}

function Card({ title, icon: Icon, hint, className = '', children }: { title: string; icon: typeof Users; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl bg-white p-5 ring-1 ring-slate-200 ${className}`}>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon className="h-4 w-4 text-amber-600" /> {title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function CoupleList({ list, empty, onOpen, right }: { list: AdminCouple[]; empty: string; onOpen: (id: string) => void; right: (c: AdminCouple) => React.ReactNode }) {
  if (!list.length) return <p className="py-4 text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {list.map((c) => (
        <li key={c.id}>
          <button type="button" onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50/60">
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{c.couple}</span><span className="block truncate text-xs text-slate-500">{tierLabel(c)} · {c.persons} invités</span></span>
            {right(c)}
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Gauge({ c }: { c: AdminCouple }) {
  const pct = c.limit ? Math.min(100, (c.used / c.limit) * 100) : 0;
  return (
    <div className="min-w-[8rem]">
      <p className="text-xs"><span className="font-semibold tabular-nums text-ink">{c.used}</span><span className="text-slate-500"> / {c.limit ?? '∞'} {c.byPersons ? 'pers.' : 'fiches'}</span></p>
      {c.limit !== null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
