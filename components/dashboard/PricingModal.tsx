"use client";

// Présentation des paliers : le palier conseillé selon la liste actuelle, le prix (ou la différence
// à payer pour monter de palier) et l'activation par WhatsApp.
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Crown, MessageCircle, Sparkles, X } from 'lucide-react';
import {
  FREE_GUEST_LIMIT, ONLINE_PAYMENT_ENABLED, PREMIUM_ACCESS_MONTHS_AFTER_WEDDING, PREMIUM_CONTACT, TIERS,
  formatXof, recommendedTier, tierById, tierWhatsappLink, upgradePrice,
} from '../../lib/plan';

type Props = {
  onClose: () => void;
  reason?: 'limit' | 'discover';
  persons?: number;              // personnes déjà prévues (fiches + accompagnants)
  byPersons?: boolean;
  currentTier?: string | null;   // palier déjà acheté
  marriageId?: string | null;
  couple?: string;
};

export default function PricingModal({ onClose, reason = 'discover', persons = 0, currentTier = null, marriageId = null, couple = '' }: Props) {
  const current = tierById(currentTier);
  // Palier conseillé : celui qui accueille la liste actuelle plus au moins une personne
  const need = reason === 'limit' ? persons + 1 : Math.max(persons, 1);
  const advised = recommendedTier(Math.max(need, (current?.max ?? 0) + 1));

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="pricing-title"
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.75rem] sm:p-8"
      >
        <button onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-ink">
          <X size={18} />
        </button>

        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600"><Crown size={14} /> Premium</p>
        <h2 id="pricing-title" className="mt-2 pr-10 text-2xl font-normal text-ink sm:text-3xl">
          {reason === 'limit' ? (current ? `Votre palier ${current.label} est complet` : 'Votre liste gratuite est complète') : 'Choisissez votre palier'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {reason === 'limit'
            ? 'Vos invités, votre plan de table et vos réglages restent intacts. Choisissez un palier pour continuer à ajouter des proches.'
            : `La version gratuite accueille ${FREE_GUEST_LIMIT} invités. Choisissez le palier qui correspond à la taille de votre mariage, accompagnants compris.`}
          {persons > 0 && <> Votre liste compte aujourd&apos;hui <strong className="text-ink">{persons} invité{persons > 1 ? 's' : ''}</strong>.</>}
        </p>

        <ul className="mt-5 space-y-2" aria-label="Paliers">
          {TIERS.map((t) => {
            const isCurrent = current?.id === t.id;
            const below = current ? t.max <= current.max && !isCurrent : false;
            const tooSmall = !isCurrent && t.max < need;
            const isAdvised = advised?.id === t.id;
            const price = current ? upgradePrice(current.id, t.id) : t.price;
            const disabled = isCurrent || below || tooSmall;
            return (
              <li key={t.id}>
                <a
                  href={disabled ? undefined : tierWhatsappLink(couple, marriageId, t.id, current?.id, persons)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={disabled}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                    isAdvised ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-200' : 'border-slate-200 bg-white'
                  } ${disabled ? 'pointer-events-none opacity-50' : 'hover:border-amber-400'}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-display text-lg text-ink">{t.label}</span>
                      {isAdvised && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"><Sparkles size={10} /> Conseillé</span>}
                      {isCurrent && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Votre palier</span>}
                    </span>
                    <span className="block text-xs text-slate-500">jusqu&apos;à {t.max} invités</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block whitespace-nowrap font-semibold text-ink">{current && !isCurrent && !below ? `+ ${formatXof(price)}` : formatXof(t.price)}</span>
                    {current && !isCurrent && !below && <span className="block text-[11px] text-slate-500">la différence</span>}
                  </span>
                </a>
              </li>
            );
          })}
          <li>
            <a
              href={tierWhatsappLink(couple, marriageId, 'sur_mesure', current?.id, persons)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3 hover:border-amber-400 ${!advised ? 'border-amber-400 bg-amber-50/70' : 'border-slate-300'}`}
            >
              <span className="min-w-0 flex-1">
                <span className="font-display text-lg text-ink">Sur mesure</span>
                <span className="block text-xs text-slate-500">plus de 300 invités</span>
              </span>
              <span className="shrink-0 font-semibold text-ink">Sur devis</span>
            </a>
          </li>
        </ul>

        <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
          <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
          Paiement unique · toutes les fonctionnalités · accès jusqu&apos;à {PREMIUM_ACCESS_MONTHS_AFTER_WEDDING} mois après le mariage. Vous pourrez monter de palier plus tard en payant seulement la différence.
        </p>

        {advised && (
          <a
            href={tierWhatsappLink(couple, marriageId, advised.id, current?.id, persons)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white hover:bg-rose-700"
          >
            <MessageCircle size={16} /> Choisir le palier {advised.label}
          </a>
        )}
        <Link href="/dashboard/premium" onClick={onClose} className="mt-2 flex min-h-[44px] items-center justify-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-ink">
          Voir le détail des paliers <ArrowRight size={14} />
        </Link>
        <Link href="/dashboard/premium#code" onClick={onClose} className="flex min-h-[40px] items-center justify-center text-xs font-semibold text-amber-700 hover:text-amber-900">
          J&apos;ai un code promo ou de parrainage
        </Link>
        <p className="mt-1 text-center text-xs text-slate-500">
          {ONLINE_PAYMENT_ENABLED ? 'Wave, Orange Money, MTN, Moov ou carte bancaire' : `Activation par appel ou WhatsApp au ${PREMIUM_CONTACT.display}`}
        </p>
      </motion.div>
    </motion.div>
  );
}
