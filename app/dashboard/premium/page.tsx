"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { Crown, Check, Loader2, ShieldCheck, AlertCircle, Smartphone, CreditCard, MessageCircle, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  FREE_GUEST_LIMIT, ONLINE_PAYMENT_ENABLED, PREMIUM_ACCESS_MONTHS_AFTER_WEDDING, PREMIUM_CONTACT, PREMIUM_FEATURES, PREMIUM_PRICE_XOF,
  formatXof, isPremium, premiumWhatsappLink,
} from '../../../lib/plan';

type Phase = 'idle' | 'redirecting' | 'verifying' | 'success' | 'failed';

export default function PremiumPage() {
  const [marriage, setMarriage] = useState<{ id: string; partner_1_name?: string | null; partner_2_name?: string | null; plan?: string | null; premium_until?: string | null } | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: m } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
    setMarriage(m);
    if (m) {
      const { count } = await supabase.from('invite').select('id', { count: 'exact', head: true }).eq('marriage_id', m.id);
      setGuestCount(count ?? 0);
    }
    setLoading(false);
  }, []);

  // Retour de la page de paiement : vérification auprès du serveur (plusieurs essais, le paiement peut prendre quelques secondes)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    Promise.resolve().then(load);
    if (params.get('echec')) {
      Promise.resolve().then(() => { setPhase('failed'); setMessage("Le paiement n'a pas abouti. Aucun montant n'a été débité, vous pouvez réessayer."); });
      return;
    }
    if (!params.get('retour')) return;
    let cancelled = false;
    const verify = async () => {
      setPhase('verifying');
      for (let i = 0; i < 8 && !cancelled; i++) {
        const res = await fetch('/api/premium/verify', { method: 'POST' }).catch(() => null);
        const { status } = (await res?.json().catch(() => ({}))) ?? {};
        if (status === 'activated' || status === 'already') {
          setPhase('success');
          confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
          load();
          return;
        }
        if (status === 'failed') break;
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) {
        setPhase('failed');
        setMessage("Nous n'avons pas encore reçu la confirmation du paiement. Si vous avez été débité, l'activation se fera automatiquement d'ici quelques minutes.");
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [load]);

  const startCheckout = async () => {
    setPhase('redirecting');
    setMessage(null);
    const res = await fetch('/api/premium/checkout', { method: 'POST' }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.url) { window.location.href = json.url; return; }
    setPhase('idle');
    setMessage(json?.error ?? 'Connexion impossible. Vérifiez votre réseau puis réessayez.');
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>;

  const premium = isPremium(marriage);
  const until = marriage?.premium_until ? new Date(marriage.premium_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const pct = Math.min(100, (guestCount / FREE_GUEST_LIMIT) * 100);

  return (
    <div className="min-h-screen bg-ivory">
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10 lg:py-12">
        <header className="mb-8">
          <p className="eyebrow">Votre formule</p>
          <h1 className="mt-2 text-3xl font-normal text-ink sm:text-4xl">WeddingStudio <span className="italic text-rose-500">Premium</span></h1>
        </header>

        {phase === 'verifying' && (
          <Banner tone="info"><Loader2 className="h-5 w-5 shrink-0 animate-spin" /> Vérification de votre paiement auprès de GeniusPay…</Banner>
        )}
        {phase === 'success' && (
          <Banner tone="success"><Check className="h-5 w-5 shrink-0" /> Paiement confirmé : votre espace est Premium. Merci et belle préparation !</Banner>
        )}
        {message && phase !== 'success' && <Banner tone="error"><AlertCircle className="h-5 w-5 shrink-0" /> {message}</Banner>}

        {premium ? (
          <section className="rounded-[1.75rem] bg-ink p-6 text-white shadow-xl sm:p-10">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300"><Crown className="h-4 w-4" /> Premium actif</p>
            <p className="mt-3 font-display text-3xl">Invités illimités</p>
            <p className="mt-2 text-white/70">{until ? `Accès complet jusqu'au ${until}.` : 'Accès complet sans limite de durée.'} {guestCount} fiche{guestCount > 1 ? 's' : ''} invités aujourd&apos;hui.</p>
            <Link href="/dashboard/invite" className="mt-6 inline-flex min-h-[48px] items-center rounded-xl bg-amber-300 px-5 text-sm font-semibold text-ink hover:bg-amber-200">Gérer mes invités</Link>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-3 sm:p-8">
              <p className="text-sm font-semibold text-ink">Version gratuite</p>
              <p className="mt-1 text-sm text-slate-500">{guestCount} / {FREE_GUEST_LIMIT} fiches invités utilisées</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {guestCount >= FREE_GUEST_LIMIT
                  ? 'Vous avez atteint la limite gratuite : vos invités et vos réglages restent intacts, seul l’ajout de nouveaux invités est bloqué.'
                  : `Vous pouvez encore ajouter ${FREE_GUEST_LIMIT - guestCount} invité${FREE_GUEST_LIMIT - guestCount > 1 ? 's' : ''} gratuitement.`}
              </p>

              <div className="gold-rule my-6" />
              <p className="mb-3 text-sm font-semibold text-ink">Le Premium comprend</p>
              <ul className="space-y-2.5">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-3 w-3" /></span>{f}
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col rounded-[1.5rem] bg-ink p-6 text-white shadow-xl lg:col-span-2 sm:p-8">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300"><Crown className="h-4 w-4" /> Premium</p>
              <p className="mt-4 font-display text-4xl">{formatXof(PREMIUM_PRICE_XOF)}</p>
              <p className="mt-1 text-sm text-white/70">Paiement unique · accès jusqu&apos;à {PREMIUM_ACCESS_MONTHS_AFTER_WEDDING} mois après votre mariage</p>

              {ONLINE_PAYMENT_ENABLED ? (
                <>
                  <button
                    type="button"
                    onClick={startCheckout}
                    disabled={phase === 'redirecting' || phase === 'verifying'}
                    className="mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-amber-300 text-sm font-semibold text-ink transition-colors hover:bg-amber-200 disabled:opacity-60"
                  >
                    {phase === 'redirecting' ? <><Loader2 className="h-4 w-4 animate-spin" /> Ouverture du paiement…</> : `Payer ${formatXof(PREMIUM_PRICE_XOF)}`}
                  </button>
                  <div className="mt-5 space-y-2 text-xs text-white/70">
                    <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-amber-300" /> Wave, Orange Money, MTN MoMo, Moov Money</p>
                    <p className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-amber-300" /> Carte bancaire</p>
                    <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" /> Paiement sécurisé par GeniusPay</p>
                  </div>
                </>
              ) : (
                // Activation par contact direct (paiement en ligne désactivé pour l'instant)
                <>
                  <p className="mt-6 text-sm text-white/80">Contactez-nous pour activer le Premium : nous vous indiquons comment régler et activons votre espace dès réception.</p>
                  <a
                    href={premiumWhatsappLink([marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & '), marriage?.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-amber-300 text-sm font-semibold text-ink transition-colors hover:bg-amber-200"
                  >
                    <MessageCircle className="h-4 w-4" /> Écrire sur WhatsApp
                  </a>
                  <a
                    href={`tel:${PREMIUM_CONTACT.phone}`}
                    className="mt-2 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/25 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Phone className="h-4 w-4" /> Appeler le {PREMIUM_CONTACT.display}
                  </a>
                  <div className="mt-5 space-y-2 text-xs text-white/70">
                    <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-amber-300" /> Wave, Orange Money, MTN MoMo ou Moov Money</p>
                    {marriage?.id && (
                      <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" /> Votre référence : <span className="font-mono text-white">{marriage.id.slice(0, 8)}</span></p>
                    )}
                  </div>
                </>
              )}
              <p className="mt-auto pt-6 text-[11px] leading-relaxed text-white/50">
                {ONLINE_PAYMENT_ENABLED ? 'En payant' : 'En passant au Premium'}, vous acceptez nos <Link href="/conditions#vente" className="underline hover:text-white">conditions de vente</Link>.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'info' | 'success' | 'error'; children: React.ReactNode }) {
  const cls = tone === 'success' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : tone === 'error' ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-white text-ink ring-slate-200';
  return <div role="status" className={`mb-6 flex items-start gap-3 rounded-2xl p-4 text-sm ring-1 ${cls}`}>{children}</div>;
}
