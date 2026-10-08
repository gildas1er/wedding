"use client";

// Votre formule : version gratuite ou palier, et choix d'un palier selon le nombre d'invités.
// Activation par appel ou WhatsApp (paiement en ligne désactivé, voir lib/plan.ts).
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Check, Loader2, ShieldCheck, Smartphone, MessageCircle, Phone, Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  PREMIUM_ACCESS_MONTHS_AFTER_WEDDING, PREMIUM_CONTACT, TIERS,
  countPersons, formatXof, guestQuota, recommendedTier, tierWhatsappLink, upgradePrice,
} from '../../../lib/plan';

type Marriage = Record<string, unknown> & {
  id: string; partner_1_name?: string | null; partner_2_name?: string | null;
  plan?: string | null; premium_until?: string | null; tier?: string | null; guest_limit?: number | null; legacy_free_fiches?: boolean | null;
};

const INCLUDED = [
  'Invitations WhatsApp et RSVP pour tous vos proches',
  'Faire-part animés (Enveloppe, Story), musique et infos pratiques',
  'Plan de table, plan de salle et listes à imprimer',
  'Budget, checklist et déroulé du Jour J',
  'Album photos et livre d’or',
];

export default function PremiumPage() {
  const [marriage, setMarriage] = useState<Marriage | null>(null);
  const [guests, setGuests] = useState<{ guests_count: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: m } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
    setMarriage(m);
    if (m) {
      const { data } = await supabase.from('invite').select('guests_count').eq('marriage_id', m.id);
      setGuests(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>;

  const quota = guestQuota(marriage, guests);
  const persons = countPersons(guests);
  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  const current = quota.tier;
  const unlimited = quota.premium && quota.limit === null;
  // Palier conseillé : celui qui accueille la liste ; déjà sur un palier, seulement quand il est presque plein (80 %)
  const nearlyFull = quota.limit !== null && quota.used >= quota.limit * 0.8;
  const advised = current && !nearlyFull ? null : recommendedTier(Math.max(persons, current ? current.max + 1 : 1));
  const until = marriage?.premium_until ? new Date(marriage.premium_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const pct = quota.limit ? Math.min(100, (quota.used / quota.limit) * 100) : 0;

  return (
    <div className="min-h-screen bg-ivory">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10 lg:py-12">
        <header className="mb-8">
          <p className="eyebrow">Votre formule</p>
          <h1 className="mt-2 text-3xl font-normal text-ink sm:text-4xl">WeddingStudio <span className="italic text-rose-500">Premium</span></h1>
          <p className="mt-2 max-w-2xl text-slate-500">Un paiement unique, selon la taille de votre mariage (accompagnants compris). Toutes les fonctionnalités sont incluses dans chaque palier.</p>
        </header>

        {/* Formule actuelle */}
        <section className={`mb-8 rounded-[1.75rem] p-6 shadow-sm sm:p-8 ${quota.premium ? 'bg-ink text-white' : 'border border-slate-200/80 bg-white'}`}>
          <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${quota.premium ? 'text-amber-300' : 'text-amber-700'}`}>
            <Crown className="h-4 w-4" /> {quota.premium ? 'Premium actif' : 'Version gratuite'}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-display text-3xl">{unlimited ? 'Invités illimités' : current ? `Palier ${current.label}` : `${quota.limit} ${quota.unit} ${quota.byPersons ? 'offerts' : 'offertes'}`}</p>
              <p className={`mt-1 text-sm ${quota.premium ? 'text-white/70' : 'text-slate-500'}`}>
                {unlimited
                  ? `${persons} invités aujourd'hui${until ? ` · accès complet jusqu'au ${until}` : ''}.`
                  : <>{quota.used} / {quota.limit} {quota.byPersons ? 'invités (accompagnants compris)' : 'fiches'} utilisés{until ? ` · accès jusqu'au ${until}` : ''}.</>}
              </p>
            </div>
            <Link href="/dashboard/invite" className={`inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold ${quota.premium ? 'bg-amber-300 text-ink hover:bg-amber-200' : 'border border-slate-200 text-ink hover:border-ink'}`}>Gérer mes invités</Link>
          </div>
          {!unlimited && quota.limit !== null && (
            <div className={`mt-4 h-2 overflow-hidden rounded-full ${quota.premium ? 'bg-white/15' : 'bg-slate-100'}`}>
              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
            </div>
          )}
          {!quota.premium && !quota.byPersons && (
            <p className="mt-3 text-xs text-slate-500">Votre compte a été créé avant les paliers : la version gratuite compte vos fiches. Un palier compte les personnes (fiche + accompagnants) : votre liste en compte {persons}.</p>
          )}
        </section>

        {/* Paliers */}
        {!unlimited && (
          <section aria-labelledby="tiers-title" className="mb-8">
            <h2 id="tiers-title" className="mb-4 font-display text-2xl text-ink">{current ? 'Passer à un palier supérieur' : 'Choisissez votre palier'}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TIERS.map((t, i) => {
                const isCurrent = current?.id === t.id;
                const lower = Boolean(current && t.max < current.max);
                const tooSmall = !isCurrent && t.max < persons;
                const isAdvised = advised?.id === t.id;
                const disabled = isCurrent || lower || tooSmall;
                const diff = current ? upgradePrice(current.id, t.id) : t.price;
                const from = i === 0 ? 1 : TIERS[i - 1].max + 1;
                return (
                  <article key={t.id} className={`flex flex-col rounded-[1.5rem] border p-5 ${isAdvised ? 'border-amber-400 bg-white shadow-lg ring-2 ring-amber-200' : 'border-slate-200/80 bg-white'} ${disabled && !isCurrent ? 'opacity-55' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-2xl text-ink">{t.label}</h3>
                      {isAdvised && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white"><Sparkles className="h-3 w-3" /> Conseillé</span>}
                      {isCurrent && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Votre palier</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">De {from} à {t.max} invités</p>
                    <p className="mt-4 font-display text-3xl text-ink">{current && !isCurrent && !lower ? `+ ${formatXof(diff)}` : formatXof(t.price)}</p>
                    <p className="text-xs text-slate-500">{current && !isCurrent && !lower ? `la différence avec le palier ${current.label}` : `soit ${formatXof(Math.round(t.price / t.max))} par invité`}</p>
                    {disabled ? (
                      <span className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500">
                        {isCurrent ? <><Check className="mr-1.5 h-4 w-4" /> Palier actuel</> : lower ? 'Palier inférieur' : `Votre liste dépasse ${t.max}`}
                      </span>
                    ) : (
                      <a href={tierWhatsappLink(couple, marriage?.id, t.id, current?.id, persons)} target="_blank" rel="noopener noreferrer"
                        className={`mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-sm font-semibold ${isAdvised ? 'bg-ink text-white hover:bg-rose-700' : 'border border-slate-200 text-ink hover:border-ink'}`}>
                        <MessageCircle className="h-4 w-4" /> {current ? 'Passer à ce palier' : 'Choisir ce palier'}
                      </a>
                    )}
                  </article>
                );
              })}
              <article className={`flex flex-col rounded-[1.5rem] border border-dashed p-5 ${!advised && persons > 300 ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300 bg-white/60'}`}>
                <h3 className="font-display text-2xl text-ink">Sur mesure</h3>
                <p className="mt-1 text-sm text-slate-500">Plus de 300 invités</p>
                <p className="mt-4 font-display text-3xl text-ink">Sur devis</p>
                <p className="text-xs text-slate-500">Un tarif adapté à votre mariage</p>
                <a href={tierWhatsappLink(couple, marriage?.id, 'sur_mesure', current?.id, persons)} target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-semibold text-ink hover:border-ink">
                  <MessageCircle className="h-4 w-4" /> Demander un devis
                </a>
              </article>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink">Inclus dans chaque palier</h2>
            <ul className="space-y-2.5">
              {INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-3 w-3" /></span>{f}
                </li>
              ))}
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><InfinityIcon className="h-3 w-3" /></span>
                Accès jusqu&apos;à {PREMIUM_ACCESS_MONTHS_AFTER_WEDDING} mois après le mariage, puis mode souvenir
              </li>
            </ul>
          </section>

          <section className="rounded-[1.5rem] bg-ink p-6 text-white">
            <h2 className="text-sm font-semibold">Comment payer ?</h2>
            <p className="mt-2 text-sm text-white/75">Choisissez votre palier ci-dessus ou contactez-nous : nous vous indiquons comment régler et activons votre palier dès réception. Pour monter de palier plus tard, vous ne payez que la différence.</p>
            <a href={`tel:${PREMIUM_CONTACT.phone}`} className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/25 text-sm font-semibold hover:bg-white/10">
              <Phone className="h-4 w-4" /> Appeler le {PREMIUM_CONTACT.display}
            </a>
            <div className="mt-4 space-y-2 text-xs text-white/70">
              <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-amber-300" /> Wave, Orange Money, MTN MoMo ou Moov Money</p>
              {marriage?.id && <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" /> Votre référence : <span className="font-mono text-white">{marriage.id.slice(0, 8)}</span></p>}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-white/50">
              En passant au Premium, vous acceptez nos <Link href="/conditions#vente" className="underline hover:text-white">conditions de vente</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
