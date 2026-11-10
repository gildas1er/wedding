"use client";

// Les deux modèles au format statut WhatsApp (9:16) :
//   « Le Générique de fin » : le mariage se termine comme un film, le nom de l'invité en vedette ;
//   « Le Statut » : trois écrans qui défilent comme un statut (photo du couple, merci, souvenir).
import React, { useEffect, useState } from 'react';
import { formatWeddingDay, type ThanksCardData } from '../../lib/thanks';
import { GOLD, GOLD_LIGHT, NIGHT, THANKS_SCRIPT, cap, coupleOf, signatureFont, thanksColors } from './style';
import Photo from './Photo';

const DISPLAY = 'var(--font-fraunces), Georgia, serif';
const nf = (n: number) => n.toLocaleString('fr-FR');

// Chaque ligne du générique apparaît l'une après l'autre ; au repos, tout est visible
function Line({ i, children, className = '', style }: { i: number; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`thanks-credit ${className}`} style={{ animationDelay: `${0.35 + i * 0.45}s`, ...style }}>{children}</div>;
}

export function Generique({ card }: { card: ThanksCardData }) {
  const couple = coupleOf(card);
  const s = card.stats;
  let i = 0;
  return (
    <article className="relative mx-auto grid aspect-[9/16] w-full max-w-[360px] content-between overflow-hidden rounded-[1.75rem] px-6 py-8 text-center"
      style={{ background: NIGHT, color: '#efe4d0', boxShadow: '0 30px 60px -30px rgba(0,0,0,.7)' }}>
      <style>{`
        .thanks-credit { animation: thanks-rise .9s cubic-bezier(.22,1,.36,1) both; }
        @keyframes thanks-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .thanks-credit { animation: none; } }
      `}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(214,170,90,.2), transparent 60%)' }} />

      <Line i={i++} className="relative">
        <p className="text-[.6rem] font-semibold uppercase tracking-[.3em] text-[#a9997f]">{couple} présentent</p>
        <p className="mt-1 text-[2.8rem] italic leading-none" style={{ fontFamily: DISPLAY, color: GOLD }}>Fin</p>
        <p className="mt-1 text-[.6rem] font-semibold uppercase tracking-[.3em] text-[#a9997f]">de la saison 1</p>
      </Line>

      <div className="relative grid gap-4">
        <Line i={i++}>
          <p className="text-[.58rem] font-semibold uppercase tracking-[.24em] text-[#a9997f]">Avec la participation exceptionnelle de</p>
          <p className="mt-1 break-words text-[2rem] leading-tight" style={{ fontFamily: THANKS_SCRIPT, color: GOLD_LIGHT }}>{card.guestName}</p>
        </Line>
        {card.tableRole && (
          <Line i={i++}>
            <p className="text-[.58rem] font-semibold uppercase tracking-[.24em] text-[#a9997f]">Dans le rôle de</p>
            <p className="mt-0.5 text-lg" style={{ fontFamily: DISPLAY }}>{card.tableRole}</p>
          </Line>
        )}
        {card.tableMates.length > 0 && (
          <Line i={i++}>
            <p className="text-[.58rem] font-semibold uppercase tracking-[.24em] text-[#a9997f]">Aux côtés de</p>
            <p className="mt-0.5 text-base" style={{ fontFamily: DISPLAY }}>{card.tableMates.join(' · ')}</p>
          </Line>
        )}
        <Line i={i++}>
          <p className="mx-auto max-w-[17rem] text-[.92rem] italic leading-snug text-[#d8ccb6] line-clamp-4" style={{ fontFamily: DISPLAY }}>{card.message}</p>
        </Line>
      </div>

      <div className="relative grid gap-3">
        {s && (
          <Line i={i++} className="grid grid-cols-3 gap-2 border-y py-2.5" style={{ borderColor: 'rgba(217,177,107,.35)' }}>
            {[[s.guests, 'invités'], [s.ceremonies, s.ceremonies > 1 ? 'cérémonies' : 'cérémonie'], [s.photos || s.messages, s.photos ? 'photos' : 'messages']].map(([n, label]) => (
              <div key={String(label)}>
                <b className="block text-[1.4rem] font-normal tabular-nums" style={{ fontFamily: DISPLAY, color: GOLD_LIGHT }}>{nf(Number(n))}</b>
                <span className="text-[.55rem] font-semibold uppercase tracking-[.14em] text-[#a9997f]">{label}</span>
              </div>
            ))}
          </Line>
        )}
        <Line i={i++}>
          <p className="text-[2.3rem] leading-none" style={{ fontFamily: THANKS_SCRIPT }}>Merci</p>
          <p className="mt-2 text-[.55rem] font-semibold uppercase tracking-[.22em] text-[#7d705f]">{[formatWeddingDay(card.weddingDate), card.city].filter(Boolean).join(' · ')}</p>
        </Line>
      </div>
    </article>
  );
}

const STATUS_SCREENS = 3;
const STATUS_MS = 5000;

export function Statut({ card, autoPlay = true }: { card: ThanksCardData; autoPlay?: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!autoPlay) return;
    const t = setTimeout(() => setIndex((n) => (n + 1) % STATUS_SCREENS), STATUS_MS);
    return () => clearTimeout(t);
  }, [index, autoPlay]);
  const go = (n: number) => setIndex((n + STATUS_SCREENS) % STATUS_SCREENS);
  const couple = coupleOf(card);

  return (
    <article className="relative mx-auto aspect-[9/16] w-full max-w-[340px] select-none overflow-hidden rounded-[1.75rem] bg-black text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)]"
      aria-roledescription="statut" aria-label={`Statut de ${couple}, écran ${index + 1} sur ${STATUS_SCREENS}`}>
      <style>{`
        @keyframes thanks-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) { .thanks-bar-run { animation: none !important; transform: scaleX(1) !important; } }
      `}</style>
      <StatusScreen card={card} index={index} />

      <div className="absolute inset-x-3 top-3 grid grid-cols-3 gap-1">
        {Array.from({ length: STATUS_SCREENS }, (_, n) => (
          <span key={n} className="h-[3px] overflow-hidden rounded-full bg-white/35">
            <span key={`${n}-${index}`} className={`block h-full origin-left bg-white ${n === index && autoPlay ? 'thanks-bar-run' : ''}`}
              style={n < index || (n === index && !autoPlay) ? {} : n === index ? { animation: `thanks-bar ${STATUS_MS}ms linear both` } : { transform: 'scaleX(0)' }} />
          </span>
        ))}
      </div>
      <div className="absolute inset-x-3.5 top-6 flex items-center gap-2 text-xs font-bold drop-shadow">
        <span className="grid h-7 w-7 place-items-center rounded-full text-[.6rem]" style={{ background: thanksColors(card).wine }}>{[card.partner1, card.partner2].map((p) => p?.[0] ?? '').join('&')}</span>
        {couple}
      </div>
      <button type="button" aria-label="Écran précédent" onClick={() => go(index - 1)} className="absolute inset-y-0 left-0 w-1/3" />
      <button type="button" aria-label="Écran suivant" onClick={() => go(index + 1)} className="absolute inset-y-0 right-0 w-2/3" />
    </article>
  );
}

// Un écran du statut, aussi utilisé tel quel pour l'aperçu de chaque image
export function StatusScreen({ card, index }: { card: ThanksCardData; index: number }) {
  const { wine } = thanksColors(card);
  const couple = coupleOf(card);
  if (index === 0) {
    return (
      <div className="absolute inset-0">
        <Photo src={card.coverUrl} label={`Photo de ${couple}`} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />
        <div className="absolute inset-x-5 bottom-8 grid gap-1 text-center">
          <p className="text-[.6rem] font-semibold uppercase tracking-[.28em] text-white/80">Notre mariage</p>
          <p className="text-[2.6rem] leading-tight" style={{ fontFamily: signatureFont(card.namesFont) }}>{couple}</p>
          <p className="text-sm text-white/85" style={{ fontFamily: DISPLAY }}>{[formatWeddingDay(card.weddingDate), card.city].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="absolute inset-0 grid place-items-center px-7 text-center" style={{ background: `radial-gradient(circle at 50% 30%, ${wine}, #1a0c10 85%)` }}>
        <div className="grid gap-5">
          <p className="break-words text-[2.7rem] leading-[1.05]" style={{ fontFamily: THANKS_SCRIPT }}>Merci {card.guestName}</p>
          <p className="text-[1.02rem] leading-relaxed text-white/90 line-clamp-[7]" style={{ fontFamily: DISPLAY }}>{card.message}</p>
          {card.ceremonies && <p className="text-sm italic text-white/70" style={{ fontFamily: DISPLAY }}>{cap(`avec vous ${card.ceremonies}`)}.</p>}
          <p className="text-[2rem] leading-none" style={{ fontFamily: signatureFont(card.namesFont), color: GOLD_LIGHT }}>{couple}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0">
      <Photo src={card.photoUrl ?? card.coverUrl} label={card.photoUrl ? `Photo envoyée par ${card.guestName}` : `Photo de ${couple}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
      <div className="absolute inset-x-5 bottom-8 grid gap-3 text-center">
        {card.quote ? (
          <>
            <p className="text-[.6rem] font-semibold uppercase tracking-[.24em] text-white/75">Vous nous avez écrit</p>
            <p className="text-lg italic leading-snug line-clamp-5" style={{ fontFamily: DISPLAY }}>« {card.quote.text} »</p>
          </>
        ) : (
          <p className="text-[2rem] leading-tight" style={{ fontFamily: THANKS_SCRIPT }}>Un jour inoubliable</p>
        )}
        <p className="text-[.55rem] font-semibold uppercase tracking-[.22em] text-white/60">Carte créée avec WeddingStudio</p>
      </div>
    </div>
  );
}

