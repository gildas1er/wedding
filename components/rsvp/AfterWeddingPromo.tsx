"use client";

// Après le mariage (mode souvenir), sous « Merci · Le mariage a eu lieu » : WeddingStudio se présente
// aux invités. D'abord pour celui qui se marie bientôt (5 000 F offerts par les mariés, avec leur code
// de parrainage déjà appliqué), puis pour ceux qui connaissent des fiancés (message WhatsApp tout prêt).
// Couleurs fixes de la marque : c'est WeddingStudio qui parle, pas la palette du couple.
import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Heart } from 'lucide-react';
import AlliancesMark, { BRAND } from '../brand/AlliancesMark';
import { PREMIUM_CONTACT, formatXof } from '../../lib/plan';
import { REFERRAL_DISCOUNT_XOF, referralLink } from '../../lib/promo';

const nbsp = (s: string) => s.replace(/ /g, ' ');

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3z" />
    </svg>
  );
}

export default function AfterWeddingPromo({ couple, referralCode }: { couple: string; referralCode?: string | null }) {
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false); // copie impossible : le lien s'affiche, à copier à la main
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const code = referralCode?.trim() || null;
  const signup = code ? referralLink(origin, code) : `${origin}/register`;
  const gift = nbsp(formatXof(REFERRAL_DISCOUNT_XOF));
  const from = couple || 'les mariés';

  const shareText = [
    'Coucou ! 💍 Pour ton mariage, regarde *WeddingStudio* : faire-part en ligne au nom de chaque invité, réponses et plan de table depuis le téléphone.',
    code ? `${formatXof(REFERRAL_DISCOUNT_XOF)} offerts avec ce lien : ${signup}` : signup,
  ].join('\n\n');
  const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const contactUrl = `https://api.whatsapp.com/send?phone=${PREMIUM_CONTACT.phone.replace('+', '')}&text=${encodeURIComponent(`Bonjour WeddingStudio, j'étais invité(e) au mariage de ${from} et je voudrais des informations pour mon mariage.`)}`;

  // Certains navigateurs intégrés (WhatsApp, Facebook) refusent le presse-papiers : méthode de secours,
  // puis, si elle échoue aussi, le lien s'affiche pour être sélectionné à la main
  const copy = async () => {
    let done = false;
    try { await navigator.clipboard.writeText(signup); done = true; } catch {
      try {
        const area = document.createElement('textarea');
        area.value = signup; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
        document.body.appendChild(area); area.select();
        done = document.execCommand('copy');
        area.remove();
      } catch { done = false; }
    }
    if (done) { setCopied(true); setTimeout(() => setCopied(false), 2000); } else setShowLink(true);
  };

  return (
    <section aria-label="WeddingStudio pour votre mariage" className="mt-6 space-y-4">
      {/* 1. Pour l'invité qui se marie bientôt */}
      <div className="relative overflow-hidden rounded-[1.75rem] px-5 pb-6 pt-7 text-center text-white"
        style={{ background: 'radial-gradient(130% 90% at 50% 0%, #5a1f31, #2a1219 60%, #1a0e12)' }}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.24em]" style={{ color: BRAND.goldLight }}>Et pour votre mariage ?</p>
        <h3 className="mt-2 font-display text-[1.6rem] leading-[1.15] text-balance">
          Le prochain faire-part portera peut-être <em style={{ color: BRAND.goldLight }}>vos prénoms</em>
        </h3>

        <div className="relative mx-auto mb-4 mt-5 aspect-[7/5] w-[min(220px,70%)] rounded-[9px] shadow-[0_18px_30px_-14px_rgba(0,0,0,0.6)]" style={{ backgroundColor: '#7d2c43' }} aria-hidden="true">
          <svg viewBox="0 0 140 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <path d="M0,0 L70,56 L0,100 Z" fill="#9e3a55" />
            <path d="M140,0 L70,56 L140,100 Z" fill="#9e3a55" />
            <path d="M0,100 L70,50 L140,100 Z" fill="#b5506c" />
            <path d="M0,0 L140,0 L70,58 Z" fill="#862d47" />
          </svg>
          <span className="absolute left-1/2 top-[42%] grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
            style={{ background: 'radial-gradient(circle at 35% 30%, #f0d9a0, #b38c4a 60%, #8a6a30)' }}>
            <Heart size={16} className="text-[#5a3f15]" />
          </span>
          <span className="absolute inset-x-0 bottom-2.5 font-display text-sm italic text-white/90">Pour vos invités</span>
        </div>

        {code && (
          <div className="mb-4 rounded-2xl border border-dashed px-4 py-3" style={{ borderColor: 'rgba(220,194,138,0.6)', backgroundColor: 'rgba(220,194,138,0.1)' }}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: BRAND.goldLight }}>Un cadeau de {from}</p>
            <p className="mt-0.5 font-display text-[1.3rem] leading-tight">{gift} de réduction</p>
            <p className="text-[13px] text-white/75">sur votre formule, avec leur code <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[13px] tracking-wider text-white">{code}</span></p>
          </div>
        )}

        <a href={signup}
          className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold"
          style={{ background: `linear-gradient(90deg, ${BRAND.goldLight}, ${BRAND.gold})`, color: '#2a1219' }}>
          Créer mon faire-part <ArrowRight size={17} />
        </a>
      </div>

      {/* Séparation */}
      <div className="flex items-center gap-3 px-1 text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: '#977339' }} aria-hidden="true">
        <span className="h-px flex-1 bg-[#eadfd3]" /> ou <span className="h-px flex-1 bg-[#eadfd3]" />
      </div>

      {/* 2. Pour l'invité qui connaît des fiancés */}
      <div className="rounded-[1.75rem] border border-[#efe7e0] bg-[#fffaf5] px-5 py-5 text-left">
        <h3 className="font-display text-xl leading-snug text-[#1f1b18]">Un ami, une sœur, un collègue se marie bientôt ?</h3>
        <p className="mt-1.5 text-sm text-slate-600">
          {code ? <>Envoyez-lui WeddingStudio : il profite lui aussi des {gift} offerts par {from}.</> : <>Envoyez-lui WeddingStudio : son mariage, organisé depuis son téléphone.</>}
        </p>
        <p className="mt-3 rounded-2xl rounded-bl-md bg-[#e7f6ea] px-3.5 py-3 text-[13px] leading-relaxed text-[#1d3b24]">
          Coucou ! 💍 Pour ton mariage, regarde <strong>WeddingStudio</strong> : faire-part en ligne au nom de chaque invité, réponses et plan de table depuis le téléphone.{code ? <> {gift} offerts avec ce lien.</> : null}
        </p>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer"
          className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1fa855] text-[15px] font-bold text-white">
          <WhatsAppIcon /> L&apos;envoyer sur WhatsApp
        </a>
        <button type="button" onClick={copy}
          className="mt-2 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[#e2c9d1] bg-white text-sm font-bold" style={{ color: BRAND.bordeaux }}>
          {copied ? <><Check size={16} /> Lien copié</> : <><Copy size={16} /> Copier le lien</>}
        </button>
        {showLink && (
          <input readOnly value={signup} aria-label="Lien à copier" onFocus={(e) => e.currentTarget.select()} autoFocus
            className="mt-2 w-full rounded-xl border border-[#e2c9d1] bg-white px-3 py-2.5 text-[13px] text-[#1f1b18]" />
        )}

        <div className="mt-4 flex items-center gap-3 border-t border-[#f0e6da] pt-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#faf3ec]"><AlliancesMark size={30} /></span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-[#1f1b18]">WeddingStudio</span>
            <span className="block text-xs text-slate-500">{PREMIUM_CONTACT.display} · WhatsApp</span>
          </span>
          <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-sm font-extrabold" style={{ color: BRAND.bordeaux }}>Écrire</a>
        </div>
      </div>
    </section>
  );
}
