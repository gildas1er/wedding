"use client";

// Carte de remerciements affichée à l'invité (/merci/[id]) et en aperçu dans l'espace du couple.
// Quatre modèles : « La Lettre » (photo du couple, mot, cachet de cire), « Le Souvenir » (photo de
// l'invité dans l'album, son message du livre d'or), « Le Générique de fin » et « Le Statut »
// (format statut WhatsApp, dans ThanksStoryCards.tsx).
import React from 'react';
import { coupleInitials } from '../../lib/invitation-templates';
import { formatWeddingDay, type ThanksCardData } from '../../lib/thanks';
import { CREAM, INK, PAPER, SOFT, THANKS_SCRIPT, cap, signatureFont, thanksColors } from './style';
import { Generique, Statut } from './ThanksStoryCards';
import Photo from './Photo';

export default function ThanksCard({ card, autoPlay = true }: { card: ThanksCardData; autoPlay?: boolean }) {
  if (card.template === 'souvenir') return <Souvenir card={card} />;
  if (card.template === 'generique') return <Generique card={card} />;
  if (card.template === 'statut') return <Statut card={card} autoPlay={autoPlay} />;
  return <Lettre card={card} />;
}

function Lettre({ card }: { card: ThanksCardData }) {
  const { wine } = thanksColors(card);
  const couple = [card.partner1, card.partner2].filter(Boolean).join(' & ');
  const initials = coupleInitials(card.partner1, card.partner2).join('&');
  const place = [card.city, formatWeddingDay(card.weddingDate)].filter(Boolean).join(' · ');
  return (
    <article className="relative mx-auto grid w-full max-w-[380px] gap-4 rounded-md p-5 pb-6" style={{ background: PAPER, color: INK, boxShadow: '0 24px 50px -24px rgba(60,40,20,.45), 0 0 0 1px #eadfcd' }}>
      <div className="absolute -top-4 right-5 grid h-14 w-14 place-items-center rounded-full text-base italic shadow-lg" style={{ background: `radial-gradient(circle at 35% 30%, ${wine}, #3b0f1d 85%)`, color: '#f3d9c0', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
        {initials || '♥'}
      </div>
      <div className="aspect-[4/3] overflow-hidden rounded-sm"><Photo src={card.coverUrl} label={`Photo de ${couple}`} /></div>
      <p className="leading-none" style={{ fontFamily: THANKS_SCRIPT, fontSize: '2.3rem', color: wine }}>Merci {card.guestName},</p>
      <div className="space-y-3 text-[1.05rem] leading-relaxed" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
        <p className="whitespace-pre-line">{card.message}</p>
        {card.ceremonies && <p className="text-[.95rem] italic" style={{ color: SOFT }}>Avec vous {card.ceremonies}.</p>}
        {card.note && <p className="whitespace-pre-line">{card.note}</p>}
      </div>
      <p className="text-right leading-none" style={{ fontFamily: signatureFont(card.namesFont), fontSize: '2rem' }}>{couple}</p>
      {place && <p className="border-t pt-3 text-center text-[.62rem] font-semibold uppercase tracking-[.24em]" style={{ borderColor: '#e7dccb', color: SOFT }}>{place}</p>}
    </article>
  );
}

function Souvenir({ card }: { card: ThanksCardData }) {
  const { wine } = thanksColors(card);
  const couple = [card.partner1, card.partner2].filter(Boolean).join(' & ');
  const ownPhoto = Boolean(card.photoUrl);
  return (
    <article className="mx-auto grid w-full max-w-[380px] gap-4 rounded-[1.5rem] p-4 pb-5" style={{ background: CREAM, color: INK, boxShadow: '0 24px 50px -26px rgba(60,40,20,.5)' }}>
      <figure className="relative -rotate-2 rounded-sm bg-white p-2.5 pb-11 shadow-[0_10px_24px_-12px_rgba(0,0,0,.35)]">
        <div className="aspect-square overflow-hidden"><Photo src={card.photoUrl ?? card.coverUrl} label={ownPhoto ? `Photo envoyée par ${card.guestName}` : `Photo de ${couple}`} /></div>
        <figcaption className="absolute inset-x-0 bottom-2 text-center" style={{ fontFamily: THANKS_SCRIPT, fontSize: '1.45rem', color: '#4a3b30' }}>
          {ownPhoto ? 'Votre plus beau moment' : couple}
        </figcaption>
      </figure>
      {card.quote && (
        <blockquote className="m-0 rounded-xl px-3.5 py-3 italic" style={{ background: 'rgba(255,255,255,.6)', fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '1.02rem', lineHeight: 1.45 }}>
          <span className="mb-1 block text-[.62rem] font-semibold not-italic uppercase tracking-[.16em]" style={{ color: SOFT, fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>Vous nous avez écrit</span>
          « {card.quote.text} »
        </blockquote>
      )}
      <div className="space-y-3 text-[1.02rem] leading-relaxed" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
        <p>
          Merci <strong className="font-semibold" style={{ color: wine }}>{card.guestName}</strong>{card.quote ? ' pour ces mots qui nous ont tant touchés.' : '.'}
        </p>
        <p className="whitespace-pre-line">{card.message}</p>
        {card.note && <p className="whitespace-pre-line">{card.note}</p>}
      </div>
      {(card.ceremonies || card.table) && (
        <p className="text-[.9rem] italic" style={{ color: SOFT, fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
          {cap([card.ceremonies && `avec vous ${card.ceremonies}`, card.table && `table ${card.table.replace(/^table\s+/i, '')}`].filter(Boolean).join(', '))}.
        </p>
      )}
      <p className="text-right leading-none" style={{ fontFamily: signatureFont(card.namesFont), fontSize: '1.9rem', color: wine }}>{couple}</p>
    </article>
  );
}
