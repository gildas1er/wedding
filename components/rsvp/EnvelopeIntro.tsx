"use client";

// Modèle « L'Enveloppe » : l'invité ouvre une enveloppe scellée à ses initiales,
// la carte en sort puis laisse place à l'invitation. Les couleurs suivent la palette
// du couple (variables rose / amber posées par rsvpThemeStyle sur la page).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { nameFontStyle } from '../../lib/name-fonts';

type Phase = 'closed' | 'seal' | 'flap' | 'card' | 'reveal';

const ORDER: Phase[] = ['closed', 'seal', 'flap', 'card', 'reveal'];
const after = (phase: Phase, step: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(step);

// Cachet de cire : cercle aux bords ondulés
function sealPath(bumps = 16, r = 30, depth = 2.2) {
  const pts: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const t = (i / 160) * Math.PI * 2;
    const rr = r + depth * Math.sin(bumps * t);
    pts.push(`${(32 + rr * Math.cos(t)).toFixed(2)},${(32 + rr * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

export default function EnvelopeIntro({ initials, couple, guestName, dateLabel, namesFont, onOpen, onDone }: {
  initials: string[];
  couple: string;
  guestName?: string;
  dateLabel?: string;
  namesFont?: string | null;
  onOpen?: () => void; // au toucher : l'occasion de lancer la musique (geste de l'utilisateur)
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('closed');
  const timers = useRef<number[]>([]);
  const seal = useMemo(() => sealPath(), []);

  // Pas de défilement de la page derrière l'enveloppe
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const list = timers.current;
    return () => { document.body.style.overflow = previous; list.forEach((t) => clearTimeout(t)); };
  }, []);

  const open = () => {
    if (phase !== 'closed') return;
    onOpen?.();
    if (reduce) { setPhase('reveal'); return; }
    const steps: [Phase, number][] = [['seal', 0], ['flap', 380], ['card', 1050], ['reveal', 2300]];
    timers.current = steps.map(([p, ms]) => window.setTimeout(() => setPhase(p), ms));
  };

  const skip = () => { onOpen?.(); setPhase('reveal'); };

  return (
    <motion.div
      role="dialog"
      aria-label="Invitation à ouvrir"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-6"
      style={{ background: 'radial-gradient(120% 80% at 50% 25%, var(--color-rose-50), var(--color-ivory) 55%, var(--color-amber-50))' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'reveal' ? 0 : 1 }}
      transition={{ duration: reduce ? 0.2 : 0.7, delay: phase === 'reveal' && !reduce ? 0.15 : 0 }}
      onAnimationComplete={() => { if (phase === 'reveal') onDone(); }}
    >
      {/* Paillettes dorées */}
      {!reduce && Array.from({ length: 10 }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute h-1.5 w-1.5 rounded-full bg-amber-400"
          style={{ left: `${8 + ((i * 37) % 84)}%`, top: `${10 + ((i * 53) % 78)}%` }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.4, 1, 0.4] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.45 }}
        />
      ))}

      <motion.div
        className="mb-8 text-center"
        animate={{ opacity: after(phase, 'flap') ? 0 : 1, y: after(phase, 'flap') ? -12 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-700">Une invitation pour vous</p>
        {guestName && <p className="mt-2 font-display text-3xl italic text-ink">{guestName}</p>}
      </motion.div>

      {/* L'enveloppe */}
      <motion.div
        className="relative aspect-[7/5] w-[min(86vw,380px)] cursor-pointer select-none"
        style={{ perspective: 1400 }}
        onClick={open}
        animate={phase === 'closed' && !reduce ? { y: [0, -6, 0] } : { y: after(phase, 'card') ? 60 : 0 }}
        transition={phase === 'closed' ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Dos */}
        <div className="absolute inset-0 rounded-[10px] bg-rose-700 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]" />

        {/* Carte */}
        <motion.div
          className="absolute inset-x-[6%] bottom-[5%] top-[5%] z-10 flex flex-col items-center justify-center rounded-md bg-white px-4 text-center shadow-lg"
          animate={
            phase === 'reveal' ? { y: '-62%', scale: 1.18 }
              : after(phase, 'card') ? { y: '-62%', scale: 1 }
                : { y: 0, scale: 1 }
          }
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">Mariage</span>
          <span className="mt-1 font-display text-2xl leading-tight text-ink sm:text-[1.7rem]"><span style={nameFontStyle(namesFont)}>{couple}</span></span>
          <span className="mt-1.5 h-px w-12 bg-amber-400" />
          {dateLabel && <span className="mt-1.5 text-xs text-slate-500">{dateLabel}</span>}
        </motion.div>

        {/* Poche avant */}
        <svg viewBox="0 0 140 100" preserveAspectRatio="none" className="absolute inset-0 z-20 h-full w-full overflow-visible rounded-[10px]" aria-hidden>
          <path d="M0,0 L70,56 L0,100 Z" className="fill-rose-600" />
          <path d="M140,0 L70,56 L140,100 Z" className="fill-rose-600" />
          <path d="M0,100 L70,50 L140,100 Z" className="fill-rose-500" />
          <path d="M0,100 L70,50 L140,100" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <p className="pointer-events-none absolute inset-x-0 bottom-[9%] z-20 text-center font-display text-lg italic text-white/85">
          {guestName ? `Pour ${guestName}` : couple}
        </p>

        {/* Rabat */}
        <motion.div
          className="absolute inset-x-0 top-0 h-[58%]"
          style={{ transformOrigin: 'top center', zIndex: after(phase, 'card') ? 5 : 30 }}
          animate={{ rotateX: after(phase, 'flap') ? 180 : 0 }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
        >
          <svg viewBox="0 0 140 58" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
            <path
              d="M0,0 L140,0 L70,58 Z"
              className={`transition-[fill] delay-300 duration-200 ${after(phase, 'flap') ? 'fill-rose-300' : 'fill-rose-600'}`}
              style={{ filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.18))' }}
            />
          </svg>
        </motion.div>

        {/* Cachet de cire */}
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); open(); }}
          aria-label="Ouvrir l'invitation"
          className="absolute left-1/2 top-[58%] z-40 h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
          animate={after(phase, 'seal') ? { scale: [1, 1.15, 0], opacity: [1, 1, 0], rotate: -20 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {phase === 'closed' && !reduce && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-amber-300"
              animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          )}
          <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]" aria-hidden>
            <defs>
              <radialGradient id="wax" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="var(--color-amber-300)" />
                <stop offset="55%" stopColor="var(--color-amber-600)" />
                <stop offset="100%" stopColor="var(--color-amber-800)" />
              </radialGradient>
            </defs>
            <path d={seal} fill="url(#wax)" />
            <circle cx="32" cy="32" r="22" fill="none" stroke="var(--color-amber-200)" strokeOpacity="0.6" strokeWidth="1" />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-lg italic text-white drop-shadow">
            {initials.length === 2 ? <span>{initials[0]}<span className="mx-0.5 text-sm">&amp;</span>{initials[1]}</span> : initials[0] ?? '♥'}
          </span>
        </motion.button>
      </motion.div>

      <motion.div
        className="mt-10 flex flex-col items-center gap-4"
        animate={{ opacity: phase === 'closed' ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.p
          className="text-sm font-medium text-slate-600"
          animate={reduce ? undefined : { opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          Touchez le cachet pour ouvrir
        </motion.p>
        <button type="button" onClick={skip} className="min-h-[44px] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 hover:text-slate-600">
          Passer
        </button>
      </motion.div>
    </motion.div>
  );
}
