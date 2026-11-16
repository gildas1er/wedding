"use client";

// Modèles au style africain (migration 37), écran d'ouverture de l'invitation :
//   « Le Pagne »   : un wax aux couleurs du couple, noué à leurs initiales, qui s'ouvre des deux côtés ;
//   « Le Kita »    : bandes tissées royales, or sur fond nuit, symbole adinkra des cœurs liés ;
//   « Le Bogolan » : terre et motifs peints autour d'une carte écru.
// Ce sont les familles qui invitent. La suite de la page (programme, réponse, billet) ne change pas.
import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { nameFontStyle } from '../../lib/name-fonts';
import {
  BOGOLAN_PATTERN, BOGOLAN_RULE, KITA_BACKGROUND, dressTag, familiesPhrase, invitationHeading, mainEvent, waxPattern,
  type AfricanTemplate,
  type InvitationLike,
} from '../../lib/african-invitation';
import { resolveAccent } from '../../lib/palettes';
import { coupleInitials } from '../../lib/invitation-templates';

type Flags = { dot: boolean; civil: boolean; religious: boolean; reception: boolean };

const CAPS = 'var(--font-fraunces), Georgia, serif';

const STYLES = {
  pagne: { card: '#fbf3e4', ink: '#2a1c12', soft: '#6f5a46', kicker: '#c2412b', tagBg: '#fde6b8', tagInk: '#8a4a0c', ctaInk: '#ffffff' },
  kita: { card: '#120d0b', ink: '#f3e4c4', soft: '#c9b48c', kicker: '#e9b81f', tagBg: 'rgba(233,184,31,.15)', tagInk: '#f3cf6a', ctaInk: '#120d0b' },
  bogolan: { card: '#efe4cf', ink: '#3b2214', soft: '#6e4a31', kicker: '#9c5a26', tagBg: '#4a2a17', tagInk: '#efe4cf', ctaInk: '#efe4cf' },
} as const;

export default function AfricanIntro({ style, m, flags, guestName, onOpen, onDone }: {
  style: AfricanTemplate;
  m: InvitationLike;
  flags: Flags;
  guestName?: string;
  onOpen?: () => void; // geste de l'invité : la musique peut démarrer
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [opened, setOpened] = useState(style !== 'pagne');
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);

  // Pas de défilement de la page derrière l'écran d'ouverture
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const touch = () => { if (!started.current) { started.current = true; onOpen?.(); } };
  const openPagne = () => { touch(); setOpened(true); };
  const leave = () => { touch(); setLeaving(true); };

  const primary = m.primary_color || '#9e3a55';
  const accent = resolveAccent(m.primary_color, m.accent_color);
  const s = STYLES[style];
  const ctaBg = style === 'pagne' ? primary : style === 'kita' ? '#e9b81f' : '#4a2a17';
  const couple = [m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & ');
  const initials = coupleInitials(m.partner_1_name, m.partner_2_name).join(' · ');
  const heading = invitationHeading(flags);
  const families = familiesPhrase(m.family_1, m.family_2);
  const when = mainEvent(m, flags);
  const tag = dressTag(m.dress_code);
  const wax = waxPattern(primary, accent);
  const ease = [0.7, 0, 0.2, 1] as const;

  const content = (
    <>
      {families ? (
        <p className="text-[11px] uppercase leading-relaxed tracking-[0.16em]" style={{ color: s.soft, fontFamily: CAPS }}>
          {families.lead}<span className="my-0.5 block text-[15px] font-semibold tracking-[0.12em]" style={{ color: s.ink }}>{families.names}</span>{families.verb} {heading.to}
        </p>
      ) : (
        <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: s.soft, fontFamily: CAPS }}>Vous êtes invités {heading.to}</p>
      )}
      <p className="text-[11px] font-extrabold uppercase tracking-[0.26em]" style={{ color: s.kicker }}>{heading.title}</p>
      <p className="break-words text-[2.3rem] leading-[1.05]" style={{ color: style === 'pagne' ? primary : style === 'kita' ? '#f3cf6a' : '#4a2a17' }}>
        <span style={nameFontStyle(m.names_font && m.names_font !== 'classique' ? m.names_font : 'pinyon_script')}>{couple || 'Les mariés'}</span>
      </p>
      {(when.date || when.hour) && <p className="font-display text-[17px]" style={{ color: s.ink }}>{[when.date, when.hour].filter(Boolean).join(' · ')}</p>}
      {when.location && <p className="text-[13px]" style={{ color: s.soft }}>{when.location}</p>}
      {tag && <span className="justify-self-center rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: s.tagBg, color: s.tagInk, border: style === 'kita' ? '1px solid rgba(233,184,31,.4)' : undefined }}>{tag}</span>}
      <button type="button" onClick={leave}
        className="mt-1 min-h-[48px] w-full rounded-2xl text-sm font-extrabold transition-transform active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: ctaBg, color: style === 'pagne' ? '#ffffff' : s.ctaInk, outlineColor: s.kicker }}>
        Voir l’invitation
      </button>
    </>
  );

  return (
    <motion.div
      role="dialog"
      aria-label={`Invitation de ${couple}`}
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{ background: style === 'kita' ? '#120d0b' : undefined }}
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: reduce ? 0.2 : 0.6 }}
      onAnimationComplete={() => { if (leaving) onDone(); }}
    >
      {/* Fond */}
      {style === 'pagne' && <div aria-hidden className="absolute inset-0" style={{ backgroundImage: wax, backgroundSize: '72px 72px' }} />}
      {style === 'kita' && <div aria-hidden className="absolute inset-x-0 top-0 h-[48%]" style={{ background: KITA_BACKGROUND }} />}
      {style === 'bogolan' && <div aria-hidden className="absolute inset-0" style={{ backgroundImage: BOGOLAN_PATTERN, backgroundSize: '56px 56px' }} />}

      {guestName && (
        <p className="absolute inset-x-0 top-[max(1.25rem,env(safe-area-inset-top))] z-[4] px-6 text-center">
          <span className="inline-block rounded-full px-4 py-1.5 text-[12px] font-bold shadow" style={{ background: 'rgba(0,0,0,.55)', color: '#fff' }}>
            Une invitation pour {guestName}
          </span>
        </p>
      )}

      {/* Le Pagne : deux pans de tissu noués aux initiales, qui s'écartent au toucher */}
      {style === 'pagne' && (
        <>
          {(['l', 'r'] as const).map((side) => (
            <motion.div key={side} aria-hidden
              className={`absolute inset-y-0 z-[3] w-[51%] ${side === 'l' ? 'left-0' : 'right-0'}`}
              style={{ backgroundImage: wax, backgroundSize: '72px 72px', boxShadow: '0 0 34px rgba(0,0,0,.45)' }}
              initial={false}
              animate={{ x: opened ? (side === 'l' ? '-100%' : '100%') : 0 }}
              transition={{ duration: reduce ? 0 : 1.4, ease }}
            />
          ))}
          <motion.button type="button" onClick={openPagne} aria-label="Ouvrir le pagne"
            className="absolute left-1/2 top-[44%] z-[4] grid -translate-x-1/2 -translate-y-1/2 place-items-center gap-3 text-center"
            initial={false} animate={{ opacity: opened ? 0 : 1, scale: opened ? 0.8 : 1 }} transition={{ duration: 0.45 }}
            style={{ pointerEvents: opened ? 'none' : 'auto' }}>
            <motion.span className="grid h-[86px] w-[86px] place-items-center rounded-full text-lg font-bold shadow-[0_10px_24px_rgba(0,0,0,.45)]"
              style={{ background: accent, color: primary, border: '3px solid #fbf3e4', fontFamily: CAPS }}
              animate={reduce || opened ? undefined : { scale: [1, 1.06, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>
              {initials || '♥'}
            </motion.span>
            <span className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-white [text-shadow:0_1px_5px_rgba(0,0,0,.7)]">Toucher pour ouvrir</span>
          </motion.button>
        </>
      )}

      {/* Le Kita : symbole adinkra « Akoma ntoso », les cœurs liés */}
      {style === 'kita' && (
        <div aria-hidden className="absolute left-1/2 top-[48%] z-[2] grid h-[70px] w-[70px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full" style={{ background: '#120d0b', border: '2px solid #e9b81f' }}>
          <svg viewBox="0 0 40 40" className="h-9 w-9" fill="none" stroke="#e9b81f" strokeWidth="2.4">
            <path d="M20 30c-6-4-10-7-10-11a4.5 4.5 0 0 1 10-2 4.5 4.5 0 0 1 10 2c0 4-4 7-10 11z" /><path d="M4 20h6M30 20h6M20 4v6M20 32v4" />
          </svg>
        </div>
      )}

      {/* La carte */}
      {style === 'bogolan' ? (
        <motion.div className="absolute inset-4 z-[1] mx-auto grid max-w-[440px] content-center gap-3 overflow-y-auto rounded-[22px] px-6 py-8 text-center"
          style={{ background: s.card, color: s.ink, border: '2px solid #eadbc0', top: 'max(1rem, env(safe-area-inset-top))', bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
          <div aria-hidden className="h-2.5 opacity-80" style={{ background: `${BOGOLAN_RULE} repeat-x center` }} />
          {content}
          <div aria-hidden className="h-2.5 opacity-80" style={{ background: `${BOGOLAN_RULE} repeat-x center` }} />
        </motion.div>
      ) : (
        <motion.div className={`absolute inset-x-0 bottom-0 z-[1] mx-auto grid max-w-[460px] gap-2.5 px-6 pt-7 text-center ${style === 'pagne' ? 'mx-3 mb-3 rounded-[22px] sm:mx-auto' : 'rounded-t-[26px]'}`}
          style={{ background: s.card, color: s.ink, paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))', borderTop: style === 'kita' ? '3px solid #e9b81f' : undefined, boxShadow: '0 -12px 32px rgba(0,0,0,.28)' }}
          initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: style === 'pagne' ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}>
          {content}
        </motion.div>
      )}
    </motion.div>
  );
}
