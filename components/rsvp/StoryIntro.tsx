"use client";

// Modèle « La Story » : l'invitation en plein écran, écran par écran, comme une story.
// On touche à droite pour avancer, à gauche pour revenir, on maintient pour mettre en pause.
// Le dernier écran mène au formulaire de réponse de la page.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Landmark, Cross, GlassWater, MapPin, X, Pause, Handshake, type LucideIcon } from 'lucide-react';
import { formatDateFr, formatHourFr } from '../../lib/event-datetime';
import { mapsUrl } from '../../lib/ceremonies';
import { daysUntil, formatWeddingDate } from '../../lib/planning';
import type { PracticalInfo } from '../../lib/practical-info';

type Text = string | null | undefined;
type StoryMarriage = {
  partner_1_name?: Text; partner_2_name?: Text; wedding_date?: string | Date | null;
  bg_image_url?: Text; bg_image_position?: Text; invitation_text?: Text;
  dot_date?: Text; dot_hour?: Text; dot_location?: Text; dot_maps_url?: Text;
  mairie_date?: Text; mairie_hour?: Text; mairie_location?: Text; mairie_maps_url?: Text;
  religious_date?: Text; religious_hour?: Text; religious_location?: Text; religious_maps_url?: Text;
  reception_date?: Text; reception_hour?: Text; reception_location?: Text; reception_maps_url?: Text;
};
type Flags = { dot: boolean; civil: boolean; religious: boolean; reception: boolean };

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80';

export default function StoryIntro({ m, flags, infos, guestName, canRespond, closed = false, onInteract, onDone }: {
  m: StoryMarriage;
  flags: Flags;
  infos: PracticalInfo[];
  guestName?: string;
  canRespond: boolean; // lien personnel (ou aperçu) : le formulaire de réponse est disponible
  closed?: boolean; // mode souvenir : le mariage a eu lieu, les réponses sont closes
  onInteract?: () => void; // premier toucher : la musique peut démarrer
  onDone: (goToForm: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const interacted = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const wasHold = useRef(false);

  const couple = [m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & ');
  const wedding = typeof m.wedding_date === 'string' ? m.wedding_date : m.wedding_date instanceof Date ? m.wedding_date.toISOString().slice(0, 10) : null;
  const days = daysUntil(wedding);

  const program: { icon: LucideIcon; title: string; time: string; loc?: Text; maps: string | null }[] = [];
  const when = (date?: Text, hour?: Text) => [date && formatDateFr(date, { withYear: false }), formatHourFr(hour)].filter(Boolean).join(' · ');
  if (flags.dot) program.push({ icon: Handshake, title: 'Cérémonie de dot', time: when(m.dot_date, m.dot_hour), loc: m.dot_location, maps: mapsUrl(m.dot_maps_url, m.dot_location) });
  if (flags.civil) program.push({ icon: Landmark, title: 'Cérémonie civile', time: when(m.mairie_date, m.mairie_hour), loc: m.mairie_location, maps: mapsUrl(m.mairie_maps_url, m.mairie_location) });
  if (flags.religious) program.push({ icon: Cross, title: 'Cérémonie religieuse', time: when(m.religious_date, m.religious_hour), loc: m.religious_location, maps: mapsUrl(m.religious_maps_url, m.religious_location) });
  if (flags.reception) program.push({ icon: GlassWater, title: 'Réception & dîner', time: when(m.reception_date, m.reception_hour), loc: m.reception_location, maps: mapsUrl(m.reception_maps_url, m.reception_location) });

  // Quatre cérémonies : affichage resserré sur les petits écrans
  const dense = program.length > 3;

  const slides = [
    { id: 'cover', ms: 5500 },
    ...(wedding ? [{ id: 'date', ms: 5000 }] : []),
    ...(program.length ? [{ id: 'program', ms: 4000 + program.length * 1500 }] : []),
    ...(infos.length ? [{ id: 'infos', ms: 4000 + Math.min(infos.length, 4) * 1500 }] : []),
    { id: 'answer', ms: 0 }, // dernier écran : reste affiché
  ];
  const last = slides.length - 1;
  const slide = slides[Math.min(index, last)];
  const paused = held || hidden;

  const go = useCallback((delta: number) => setIndex((i) => Math.max(0, Math.min(last, i + delta))), [last]);

  // Pas de défilement derrière la story ; pause quand l'onglet est masqué
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.body.style.overflow = previous; document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onDone(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onDone]);

  const firstTouch = () => {
    if (interacted.current) return;
    interacted.current = true;
    onInteract?.();
  };

  // Toucher court = avancer / revenir ; appui long = pause
  const onPointerDown = () => {
    firstTouch();
    wasHold.current = false;
    holdTimer.current = window.setTimeout(() => { wasHold.current = true; setHeld(true); }, 220);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (wasHold.current) { setHeld(false); return; }
    const box = e.currentTarget.getBoundingClientRect();
    go(e.clientX - box.left < box.width * 0.3 ? -1 : 1);
  };
  const onPointerCancel = () => { if (holdTimer.current) clearTimeout(holdTimer.current); setHeld(false); };

  // Les liens et boutons à l'intérieur des écrans ne font pas avancer la story
  const stop = { onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); firstTouch(); }, onPointerUp: (e: React.PointerEvent) => e.stopPropagation() };

  const fade = reduce ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : { initial: { opacity: 0, scale: 1.02 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0 } };
  const rise = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.25 + i * 0.18, duration: 0.5 } });

  return (
    <motion.div
      role="dialog"
      aria-label={`Invitation de ${couple}`}
      className="fixed inset-0 z-[60] flex justify-center bg-[#0d0a0c]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <style>{`@keyframes ws-story-fill { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
      <div className="relative h-[100dvh] w-full max-w-[450px] select-none overflow-hidden text-white">
        {/* Écrans */}
        <div
          className="absolute inset-0 touch-manipulation"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.section key={slide.id} className="absolute inset-0" {...fade} transition={{ duration: 0.45 }}>
              {slide.id === 'cover' && (
                <div className="absolute inset-0">
                  <motion.img
                    src={m.bg_image_url || FALLBACK_COVER}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: (m.bg_image_url && m.bg_image_position) || 'center' }}
                    initial={{ scale: reduce ? 1 : 1.12 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 6, ease: 'easeOut' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/85" />
                  <div className="absolute inset-x-0 bottom-0 px-7 pb-[max(3.5rem,env(safe-area-inset-bottom))]">
                    <motion.p {...rise(0)} className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200">{m.invitation_text || 'Vous êtes invités'}</motion.p>
                    <motion.h1 {...rise(1)} className="mt-3 font-display text-[clamp(2.6rem,13vw,3.6rem)] font-normal leading-[1.02]">
                      {m.partner_1_name} <span className="italic text-amber-300">&amp;</span><br />{m.partner_2_name}
                    </motion.h1>
                    {guestName && <motion.p {...rise(2)} className="mt-4 text-base text-white/85">{guestName}, cette invitation est pour vous.</motion.p>}
                  </div>
                </div>
              )}

              {slide.id === 'date' && wedding && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" style={{ background: 'radial-gradient(90% 65% at 50% 32%, var(--color-rose-500), var(--color-rose-900) 78%)' }}>
                  <motion.p {...rise(0)} className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">Save the date</motion.p>
                  <motion.p {...rise(1)} className="mt-4 font-display text-[clamp(3.6rem,19vw,5.4rem)] leading-none tabular-nums">
                    {wedding.slice(8, 10)}.{wedding.slice(5, 7)}.{wedding.slice(2, 4)}
                  </motion.p>
                  <motion.p {...rise(2)} className="mt-4 text-lg text-white/90">{formatWeddingDate(wedding)}</motion.p>
                  {days !== null && days >= 0 && (
                    <motion.p {...rise(3)} className="mt-8 rounded-full bg-white/12 px-5 py-2 text-sm font-semibold ring-1 ring-white/25">
                      {days === 0 ? "C'est aujourd'hui !" : days === 1 ? 'Plus qu’un jour' : `Plus que ${days} jours`}
                    </motion.p>
                  )}
                </div>
              )}

              {slide.id === 'program' && (
                <div className="absolute inset-0 flex flex-col justify-center px-5 pb-8 pt-24 [@media(max-height:700px)]:pt-[5.5rem]" style={{ background: 'linear-gradient(170deg, var(--color-rose-900), #120c10 75%)' }}>
                  <motion.p {...rise(0)} className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200">Le programme</motion.p>
                  <ol className={`mt-4 space-y-3 [@media(max-height:700px)]:mt-3 [@media(max-height:700px)]:space-y-2 ${dense ? '[@media(max-height:700px)]:space-y-1.5' : ''}`}>
                    {program.map((p, i) => (
                      <motion.li key={p.title} {...rise(i + 1)} className={`flex items-start gap-3.5 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 [@media(max-height:700px)]:p-3 ${dense ? '[@media(max-height:700px)]:gap-2.5 [@media(max-height:700px)]:py-2' : ''}`}>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400/15 text-amber-200 [@media(max-height:700px)]:h-8 [@media(max-height:700px)]:w-8"><p.icon className="h-[18px] w-[18px]" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-amber-200">{p.time || 'Horaire à venir'}</span>
                          <span className={`block font-display text-xl leading-snug [@media(max-height:700px)]:text-lg ${dense ? '[@media(max-height:700px)]:text-base' : ''}`}>{p.title}</span>
                          {p.loc && <span className={`mt-0.5 block text-sm text-white/70 ${dense ? '[@media(max-height:700px)]:line-clamp-1' : 'line-clamp-2'}`}>{p.loc}</span>}
                        </span>
                        {p.maps && (
                          <a href={p.maps} target="_blank" rel="noopener noreferrer" {...stop} aria-label={`Itinéraire : ${p.title}`} className="flex min-h-[44px] w-12 shrink-0 flex-col items-center justify-center gap-0.5 self-center rounded-xl bg-white/10 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-white/20">
                            <MapPin className="h-4 w-4" /> Plan
                          </a>
                        )}
                      </motion.li>
                    ))}
                  </ol>
                </div>
              )}

              {slide.id === 'infos' && (
                <div className="absolute inset-0 flex flex-col justify-center px-5 pb-8 pt-24 [@media(max-height:700px)]:pt-[5.5rem]" style={{ background: 'linear-gradient(190deg, #17110f, var(--color-amber-900) 140%)' }}>
                  <motion.p {...rise(0)} className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200">Bon à savoir</motion.p>
                  <ul className="mt-4 space-y-3 [@media(max-height:700px)]:space-y-2">
                    {infos.slice(0, 4).map((info, i) => (
                      <motion.li key={info.id} {...rise(i + 1)} className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 [@media(max-height:700px)]:p-3">
                        <span className="block font-display text-lg">{info.title}</span>
                        {info.text && <span className="mt-1 line-clamp-3 block text-sm [@media(max-height:700px)]:line-clamp-2 leading-relaxed text-white/75">{info.text}</span>}
                        {info.colors && info.colors.length > 0 && (
                          <span className="mt-2 flex gap-1.5">{info.colors.map((c) => <span key={c} className="h-5 w-5 rounded-full ring-2 ring-white/30" style={{ background: c }} />)}</span>
                        )}
                      </motion.li>
                    ))}
                  </ul>
                  {infos.length > 4 && <p className="mt-4 text-sm text-white/60">Et d&apos;autres informations dans l&apos;invitation.</p>}
                </div>
              )}

              {slide.id === 'answer' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" style={{ background: 'radial-gradient(100% 60% at 50% 100%, var(--color-rose-600), #150d12 72%)' }}>
                  <motion.h2 {...rise(0)} className="font-display text-[clamp(2.4rem,11vw,3.2rem)] font-normal leading-[1.05]">
                    {closed ? <>Merci d&apos;avoir<br /><span className="italic text-amber-300">partagé ce jour</span></> : <>Serez-vous<br /><span className="italic text-amber-300">des nôtres ?</span></>}
                  </motion.h2>
                  <motion.p {...rise(1)} className="mt-4 max-w-xs text-white/80">
                    {closed ? 'Le mariage a eu lieu : les réponses sont closes.' : canRespond ? 'Votre réponse nous aide à tout préparer.' : 'Répondez depuis le lien personnel reçu par WhatsApp.'}
                  </motion.p>
                  <motion.div {...rise(2)} className="mt-9 grid w-full max-w-xs gap-3">
                    {canRespond && (
                      <button type="button" {...stop} onClick={() => onDone(true)} className="min-h-[52px] rounded-full bg-white px-6 text-base font-semibold text-[#2a1420] shadow-lg active:scale-[0.98]">
                        Répondre à l&apos;invitation
                      </button>
                    )}
                    <button type="button" {...stop} onClick={() => onDone(false)} className="min-h-[52px] rounded-full px-6 text-base font-semibold text-white ring-1 ring-white/40 hover:bg-white/10">
                      Voir toute l&apos;invitation
                    </button>
                  </motion.div>
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </div>

        {/* Barres de progression et en-tête */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/40 to-transparent px-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1" aria-hidden>
            {slides.map((s, i) => (
              <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                {i < index || (i === index && s.ms === 0) ? (
                  <span className="block h-full w-full bg-white" />
                ) : i === index ? (
                  <span
                    key={`${s.id}-${index}`}
                    className="block h-full w-full origin-left bg-white"
                    style={{ animation: `ws-story-fill ${s.ms}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
                    onAnimationEnd={() => go(1)}
                  />
                ) : null}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 font-display text-xs ring-1 ring-white/30">
              {(m.partner_1_name?.[0] ?? '') + (m.partner_2_name?.[0] ?? '')}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold drop-shadow">{couple}</span>
            {held && <Pause className="h-4 w-4 text-white/80" aria-label="En pause" />}
            <button
              type="button"
              {...stop}
              onClick={() => onDone(false)}
              aria-label="Fermer et voir l'invitation"
              className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full text-white/90 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation accessible au clavier et aux lecteurs d'écran */}
        <div className="sr-only">
          <button type="button" onClick={() => go(-1)} disabled={index === 0}>Écran précédent</button>
          <button type="button" onClick={() => go(1)} disabled={index === last}>Écran suivant</button>
        </div>
        {index === 0 && (
          <motion.p
            className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 4, delay: 1.2 }}
          >
            Touchez pour avancer
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
