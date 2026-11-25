"use client";

// Votre formule : version gratuite ou palier, et choix d'un palier selon le nombre d'invités.
// Paiement en ligne SasPay (palier activé automatiquement), ou activation par appel ou WhatsApp.
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Check, Loader2, ShieldCheck, Smartphone, MessageCircle, Phone, Sparkles, CreditCard, Infinity as InfinityIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import {
  PREMIUM_ACCESS_MONTHS_AFTER_WEDDING, PREMIUM_CONTACT, TIERS,
  countPersons, formatXof, guestQuota, recommendedTier, tierWhatsappLink, upgradePrice,
} from '../../../lib/plan';
import { activeCode, type AppliedCode } from '../../../lib/promo';
import { LAUNCH_OFFER, bestReduction, isFirstPurchase } from '../../../lib/launch-offer';
import { LaunchRibbon, useLaunchOffer } from '../../../components/promo/LaunchOffer';
import PromoCodeCard from '../../../components/dashboard/PromoCodeCard';
import ReferralCard, { type Referrals } from '../../../components/dashboard/ReferralCard';
import { getSessionUser, loadMarriage } from '../../../lib/current-marriage';

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

// useSearchParams (retour de la page de paiement) demande une frontière Suspense
export default function PremiumPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>}>
      <PremiumContent />
    </Suspense>
  );
}

function PremiumContent() {
  const [marriage, setMarriage] = useState<Marriage | null>(null);
  const [guests, setGuests] = useState<{ guests_count: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  // Codes promo et parrainage : absents tant que la migration 19 n'est pas lancée
  const [applied, setApplied] = useState<AppliedCode | null>(null);
  const [referrals, setReferrals] = useState<Referrals | null>(null);
  const [codesReady, setCodesReady] = useState(false);
  const launchActive = useLaunchOffer();
  // Paiement en ligne (SasPay) : proposé seulement si le serveur est configuré (en mode test : administrateurs)
  const [online, setOnline] = useState<{ enabled: boolean; test: boolean }>({ enabled: false, test: false });
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [payState, setPayState] = useState<'checking' | 'activated' | 'pending' | 'failed' | null>(null);
  const searchParams = useSearchParams();
  const returned = searchParams.get('paiement') === 'retour';

  const loadCodes = useCallback(async () => {
    const [code, refs] = await Promise.all([supabase.rpc('my_code'), supabase.rpc('my_referrals')]);
    setCodesReady(!code.error);
    setApplied(code.error ? null : (code.data as AppliedCode | null));
    setReferrals(refs.error ? null : (refs.data as Referrals));
  }, []);

  const load = useCallback(async () => {
    const { data: { user } } = await getSessionUser();
    if (!user) return;
    const { data: m } = await loadMarriage(user.id);
    setMarriage(m);
    if (m) {
      // Invités et codes (promo, parrainage) lus en même temps
      const [{ data }] = await Promise.all([supabase.from('invite').select('guests_count').eq('marriage_id', m.id), loadCodes()]);
      setGuests(data ?? []);
    }
    setLoading(false);
  }, [loadCodes]);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  useEffect(() => {
    fetch('/api/premium/checkout').then((r) => r.json()).then((d) => setOnline({ enabled: Boolean(d?.enabled), test: Boolean(d?.test) })).catch(() => {});
  }, []);

  // Retour de la page SasPay : vérification toutes les 4 s pendant 2 minutes, puis rechargement de la formule
  useEffect(() => {
    if (!returned) return;
    let stop = false;
    let tries = 0;
    const check = async () => {
      if (stop) return;
      setPayState((s) => s ?? 'checking');
      const res = await fetch('/api/premium/verify', { method: 'POST' }).then((r) => r.json()).catch(() => ({ status: 'pending' }));
      if (stop) return;
      if (res.status === 'activated' || res.status === 'already') { setPayState('activated'); load(); return; }
      if (res.status === 'failed' || res.status === 'none') { setPayState('failed'); return; }
      tries += 1;
      if (tries >= 30) { setPayState('pending'); return; }
      setTimeout(check, 4000);
    };
    check();
    return () => { stop = true; };
  }, [returned, load]);

  const payOnline = async (tier: string) => {
    setPaying(tier);
    setPayError(null);
    try {
      const res = await fetch('/api/premium/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || 'Le paiement n’a pas pu être préparé.');
      window.location.assign(json.url);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Le paiement n’a pas pu être préparé.');
      setPaying(null);
    }
  };

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
  const code = activeCode(applied);
  // Offre de lancement : première formule seulement (pas de montée de palier), non cumulable avec un code
  const launch = launchActive && isFirstPurchase(marriage);
  const promoFor = (price: number) => {
    const best = bestReduction(price, { launch, code });
    if (!best) return null;
    return best.kind === 'launch' ? { code: null, discount: best.discount, launch: true } : { code: best.code, discount: best.discount };
  };

  return (
    <div className="min-h-screen bg-ivory">
      {launch && <LaunchRibbon />}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10 lg:py-12">
        <header className="mb-8">
          <p className="eyebrow">Votre formule</p>
          <h1 className="mt-2 text-3xl font-normal text-ink sm:text-4xl">WeddingStudio <span className="italic text-rose-500">Premium</span></h1>
          <p className="mt-2 max-w-2xl text-slate-500">Un paiement unique, selon la taille de votre mariage (accompagnants compris). Toutes les fonctionnalités sont incluses dans chaque palier.</p>
        </header>

        {payState && (
          <section role="status" className={`mb-6 rounded-[1.5rem] border p-5 ${payState === 'activated' ? 'border-emerald-200 bg-emerald-50' : payState === 'failed' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className="font-display text-xl text-ink">
              {payState === 'activated' ? 'Paiement reçu : votre palier est activé' : payState === 'failed' ? 'Paiement non abouti' : payState === 'pending' ? 'Paiement en attente de confirmation' : 'Vérification de votre paiement…'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {payState === 'activated' ? 'Merci ! Vous pouvez dès maintenant inviter tous vos proches.'
                : payState === 'failed' ? 'Aucun palier n’a été activé. Vous pouvez réessayer ci-dessous, ou nous contacter sur WhatsApp.'
                : payState === 'pending' ? 'La confirmation prend plus de temps que prévu. Votre palier s’activera tout seul dès qu’elle arrive ; revenez sur cette page dans quelques minutes.'
                : 'Si votre téléphone vous demande de valider le paiement, faites-le : cette page se met à jour toute seule.'}
            </p>
          </section>
        )}

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
            {online.test && <p className="mb-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">Paiement en ligne en mode test : visible seulement par les administrateurs. Utilisez les numéros de test SasPay (dernier chiffre 0 : réussite, 1 : échec).</p>}
            {payError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{payError}</p>}
            <h2 id="tiers-title" className="mb-4 font-display text-2xl text-ink">{current ? 'Passer à un palier supérieur' : 'Choisissez votre palier'}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TIERS.map((t, i) => {
                const isCurrent = current?.id === t.id;
                const lower = Boolean(current && t.max < current.max);
                const tooSmall = !isCurrent && t.max < persons;
                const isAdvised = advised?.id === t.id;
                const disabled = isCurrent || lower || tooSmall;
                const diff = current ? upgradePrice(current.id, t.id) : t.price;
                const promo = promoFor(diff);
                const reduced = promo && promo.discount > 0 ? diff - promo.discount : null;
                const from = i === 0 ? 1 : TIERS[i - 1].max + 1;
                return (
                  <article key={t.id} className={`flex flex-col rounded-[1.5rem] border p-5 ${isAdvised ? 'border-amber-400 bg-white shadow-lg ring-2 ring-amber-200' : 'border-slate-200/80 bg-white'} ${disabled && !isCurrent ? 'opacity-55' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-2xl text-ink">{t.label}</h3>
                      {isAdvised && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white"><Sparkles className="h-3 w-3" /> Conseillé</span>}
                      {isCurrent && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Votre palier</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">De {from} à {t.max} invités</p>
                    {reduced !== null && !disabled ? (
                      <>
                        <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                          <span className="font-display text-3xl text-ink">{current ? '+ ' : ''}{formatXof(reduced)}</span>
                          <s className="text-sm text-slate-400">{formatXof(diff)}</s>
                        </p>
                        <p className="text-xs font-semibold text-emerald-700">{promo!.launch ? `Offre de lancement -${LAUNCH_OFFER.percent} % · vous économisez ${formatXof(promo!.discount)}` : `avec le code ${promo!.code}`}{current ? ` · différence avec le palier ${current.label}` : ''}</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-4 font-display text-3xl text-ink">{current && !isCurrent && !lower ? `+ ${formatXof(diff)}` : formatXof(t.price)}</p>
                        <p className="text-xs text-slate-500">{current && !isCurrent && !lower ? `la différence avec le palier ${current.label}` : `soit ${formatXof(Math.round(t.price / t.max))} par invité`}</p>
                      </>
                    )}
                    {disabled ? (
                      <span className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500">
                        {isCurrent ? <><Check className="mr-1.5 h-4 w-4" /> Palier actuel</> : lower ? 'Palier inférieur' : `Votre liste dépasse ${t.max}`}
                      </span>
                    ) : (
                      online.enabled ? (
                        <>
                          <button type="button" onClick={() => payOnline(t.id)} disabled={paying !== null}
                            className={`mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-60 ${isAdvised ? 'bg-ink text-white hover:bg-rose-700' : 'border border-slate-200 text-ink hover:border-ink'}`}>
                            {paying === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Payer maintenant
                          </button>
                          <a href={tierWhatsappLink(couple, marriage?.id, t.id, current?.id, persons, promo)} target="_blank" rel="noopener noreferrer"
                            className="mt-2 text-center text-xs font-semibold text-slate-500 underline-offset-4 hover:text-ink hover:underline">
                            ou payer via WhatsApp
                          </a>
                        </>
                      ) : (
                        <a href={tierWhatsappLink(couple, marriage?.id, t.id, current?.id, persons, promo)} target="_blank" rel="noopener noreferrer"
                          className={`mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-sm font-semibold ${isAdvised ? 'bg-ink text-white hover:bg-rose-700' : 'border border-slate-200 text-ink hover:border-ink'}`}>
                          <MessageCircle className="h-4 w-4" /> {current ? 'Passer à ce palier' : 'Choisir ce palier'}
                        </a>
                      )
                    )}
                  </article>
                );
              })}
              <article className={`flex flex-col rounded-[1.5rem] border border-dashed p-5 ${!advised && persons > 300 ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300 bg-white/60'}`}>
                <h3 className="font-display text-2xl text-ink">Sur mesure</h3>
                <p className="mt-1 text-sm text-slate-500">Plus de 300 invités</p>
                <p className="mt-4 font-display text-3xl text-ink">Sur devis</p>
                <p className="text-xs text-slate-500">Un tarif adapté à votre mariage</p>
                <a href={tierWhatsappLink(couple, marriage?.id, 'sur_mesure', current?.id, persons, code ? { code: code.code, discount: 0 } : null)} target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-semibold text-ink hover:border-ink">
                  <MessageCircle className="h-4 w-4" /> Demander un devis
                </a>
              </article>
            </div>
            {launch && <p className="mt-3 text-center text-xs text-slate-500">Offre de lancement : -{LAUNCH_OFFER.percent} % sur votre première formule activée au plus tard le {LAUNCH_OFFER.endLabel}. Non cumulable avec un code promo ou de parrainage (la réduction la plus avantageuse s&apos;applique).</p>}
          </section>
        )}

        {codesReady && (
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {!unlimited && <PromoCodeCard applied={applied} onChange={loadCodes} launch={launch} />}
            {referrals && <ReferralCard referrals={referrals} />}
          </div>
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
            <p className="mt-2 text-sm text-white/75">{online.enabled ? 'Payez en ligne depuis votre palier : il s’active automatiquement dès que le paiement est confirmé. Vous préférez ? Contactez-nous et nous l’activons à réception.' : 'Choisissez votre palier ci-dessus ou contactez-nous : nous vous indiquons comment régler et activons votre palier dès réception.'} Pour monter de palier plus tard, vous ne payez que la différence.</p>
            <a href={`tel:${PREMIUM_CONTACT.phone}`} className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/25 text-sm font-semibold hover:bg-white/10">
              <Phone className="h-4 w-4" /> Appeler le {PREMIUM_CONTACT.display}
            </a>
            <div className="mt-4 space-y-2 text-xs text-white/70">
              <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-amber-300" /> Wave, Orange Money, MTN MoMo, Moov Money{online.enabled ? ' ou carte bancaire' : ''}</p>
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
