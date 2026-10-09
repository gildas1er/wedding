"use client";

// Parrainage : le couple partage son code ; un couple parrainé a 5 000 F de réduction, le parrain reçoit 5 000 F quand il paie.
import React, { useState } from 'react';
import { Gift, Copy, Check, MessageCircle } from 'lucide-react';
import { formatXof } from '../../lib/plan';
import { REFERRAL_DISCOUNT_XOF, REFERRAL_REWARD_XOF, referralLink } from '../../lib/promo';

export type Referrals = { code: string | null; signed_up: number; paid: number; rewards_paid: number; friends: { name: string | null; paid: boolean }[] };

export default function ReferralCard({ referrals }: { referrals: Referrals }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  if (!referrals.code) return null;
  const link = referralLink(typeof window === 'undefined' ? '' : window.location.origin, referrals.code);
  const message = `On organise notre mariage avec WeddingStudio : faire-part animés envoyés par WhatsApp, réponses des invités, plan de table, budget… Inscris-toi avec notre lien, tu as ${formatXof(REFERRAL_DISCOUNT_XOF)} de réduction sur ton palier : ${link}`;
  const earned = referrals.paid * REFERRAL_REWARD_XOF;
  const toCome = (referrals.paid - referrals.rewards_paid) * REFERRAL_REWARD_XOF;

  const copy = async (what: 'code' | 'link') => {
    try { await navigator.clipboard.writeText(what === 'code' ? referrals.code! : link); setCopied(what); setTimeout(() => setCopied(null), 1800); } catch { /* copie refusée */ }
  };

  return (
    <section aria-labelledby="referral-title" className="rounded-[1.5rem] bg-ink p-5 text-white sm:p-6">
      <h2 id="referral-title" className="flex items-center gap-2 text-sm font-semibold"><Gift className="h-4 w-4 text-amber-300" /> Parrainez un couple</h2>
      <p className="mt-1 text-sm text-white/75">
        Un couple s’inscrit avec votre lien : il a <strong className="text-white">{formatXof(REFERRAL_DISCOUNT_XOF)} de réduction</strong> sur son palier,
        et vous recevez <strong className="text-white">{formatXof(REFERRAL_REWARD_XOF)}</strong> quand il paie (par Wave ou Mobile Money).
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 p-2 pl-4">
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Votre code</span>
          <span className="block truncate font-mono text-xl tracking-wider text-amber-200">{referrals.code}</span>
        </span>
        <button type="button" onClick={() => copy('code')} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-semibold hover:bg-white/10" aria-label="Copier le code">
          {copied === 'code' ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />} {copied === 'code' ? 'Copié' : 'Copier'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-white hover:bg-emerald-400">
          <MessageCircle className="h-4 w-4" /> Partager sur WhatsApp
        </a>
        <button type="button" onClick={() => copy('link')} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/25 text-sm font-semibold hover:bg-white/10">
          {copied === 'link' ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />} {copied === 'link' ? 'Lien copié' : 'Copier le lien'}
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/5 p-3"><dt className="text-[10px] uppercase tracking-wider text-white/50">Inscrits</dt><dd className="font-display text-2xl">{referrals.signed_up}</dd></div>
        <div className="rounded-xl bg-white/5 p-3"><dt className="text-[10px] uppercase tracking-wider text-white/50">Ont payé</dt><dd className="font-display text-2xl">{referrals.paid}</dd></div>
        <div className="rounded-xl bg-white/5 p-3"><dt className="text-[10px] uppercase tracking-wider text-white/50">Gagné</dt><dd className="font-display text-lg leading-8 text-amber-200">{formatXof(earned)}</dd></div>
      </dl>
      {toCome > 0 && <p className="mt-3 text-xs text-white/70">{formatXof(toCome)} vous seront versés : nous vous contactons pour le paiement.</p>}
      {referrals.friends.length > 0 && (
        <p className="mt-2 text-xs text-white/60">Vos filleuls : {referrals.friends.map((f) => `${f.name ?? 'Un couple'}${f.paid ? ' ✓' : ''}`).join(', ')}</p>
      )}
    </section>
  );
}
