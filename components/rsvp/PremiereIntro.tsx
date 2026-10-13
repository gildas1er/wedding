"use client";

// Modèle « L'Avant-première » : l'invitation façon plateforme de séries.
// Générique aux initiales du couple → « Choisissez votre profil » (affiche du couple en grand,
// profil au nom de l'invité) → accueil : affiche, cérémonies en épisodes, infos pratiques,
// compte à rebours, réponse dans un tiroir. Les textes parlent au nom des mariés.
// Univers inspiré des séries en streaming, sans nom, logo ni couleur d'une marque existante :
// les couleurs sont celles de la palette du couple (variables posées par rsvpThemeStyle).
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Info, MapPin, Play, X } from 'lucide-react';
import { formatDateFr, formatHourFr, toISODate } from '../../lib/event-datetime';
import { mapsUrl } from '../../lib/ceremonies';
import { daysUntil } from '../../lib/planning';
import { coupleInitials } from '../../lib/invitation-templates';
import { INFO_PRESETS, type PracticalInfo } from '../../lib/practical-info';
import { NAME_FONTS, nameFontStyle } from '../../lib/name-fonts';

type Text = string | null | undefined;
type PremiereMarriage = {
  partner_1_name?: Text; partner_2_name?: Text; wedding_date?: string | Date | null; names_font?: Text;
  bg_image_url?: Text; bg_image_position?: Text;
  dot_date?: Text; dot_hour?: Text; dot_location?: Text; dot_maps_url?: Text;
  mairie_date?: Text; mairie_hour?: Text; mairie_location?: Text; mairie_maps_url?: Text;
  religious_date?: Text; religious_hour?: Text; religious_location?: Text; religious_maps_url?: Text;
  reception_date?: Text; reception_hour?: Text; reception_location?: Text; reception_maps_url?: Text;
};
type Flags = { dot: boolean; civil: boolean; religious: boolean; reception: boolean };
export type PremiereAnswer = {
  status: 'confirmé' | 'décliné';
  attending: { dot: boolean; civil: boolean; church: boolean; reception: boolean };
  notes: string;
};
type EpisodeKey = 'dot' | 'civil' | 'church' | 'reception';
type Episode = { key: EpisodeKey; title: string; date: Text; short: string; time: string; loc: Text; maps: string | null };

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80';
const PRIMARY = 'var(--wed-primary)';
const ACCENT = 'var(--wed-accent)';
// Écriture manuscrite du « & » et du titre (police chargée par l'application, seulement si elle s'affiche)
const SCRIPT = NAME_FONTS.find((f) => f.id === 'great_vibes')?.family ?? 'cursive';

export default function PremiereIntro({ m, flags, infos, guestName, canRespond, closed = false, answered = false, onInteract, onAnswer, onDone }: {
  m: PremiereMarriage;
  flags: Flags;
  infos: PracticalInfo[];
  guestName?: string;
  canRespond: boolean; // lien personnel (ou aperçu) : la réponse est possible
  closed?: boolean; // mode souvenir : le mariage a eu lieu
  answered?: boolean;
  onInteract?: () => void; // premier toucher : la musique peut démarrer
  onAnswer: (answer: PremiereAnswer) => Promise<boolean>;
  onDone: () => void; // « Voir la version classique »
}) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<'intro' | 'profiles' | 'home'>('intro');
  const [sheet, setSheet] = useState<null | 'answer' | 'program' | 'personal' | { episode: number }>(null);
  const [toast, setToast] = useState<string | null>(null);
  const interacted = useRef(false);
  const homeRef = useRef<HTMLDivElement>(null);

  const p1 = m.partner_1_name?.trim() || '';
  const p2 = m.partner_2_name?.trim() || '';
  const initials = coupleInitials(p1, p2);
  const mono = initials.length === 2 ? initials : [initials[0] ?? '♥'];
  const wedding = typeof m.wedding_date === 'string' ? m.wedding_date.slice(0, 10) : m.wedding_date instanceof Date ? m.wedding_date.toISOString().slice(0, 10) : null;
  const days = daysUntil(wedding);
  const year = wedding?.slice(0, 4) ?? String(new Date().getFullYear());
  const cover = m.bg_image_url || FALLBACK_COVER;
  const coverPos = (m.bg_image_url && m.bg_image_position) || 'center 30%';
  const guest = guestName?.trim() || '';
  const guestInitials = guest ? guest.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') : '♥';

  const when = (date?: Text, hour?: Text) => [date && formatDateFr(date, { withYear: false }), formatHourFr(hour)].filter(Boolean).join(' · ');
  const shortWhen = (date?: Text, hour?: Text) => {
    const iso = toISODate(date);
    const day = iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    return [day && day.charAt(0).toUpperCase() + day.slice(1), formatHourFr(hour)].filter(Boolean).join(' · ');
  };
  const episodes: Episode[] = [];
  if (flags.dot) episodes.push({ key: 'dot', title: 'La Dot', date: m.dot_date, short: shortWhen(m.dot_date, m.dot_hour), time: when(m.dot_date, m.dot_hour), loc: m.dot_location, maps: mapsUrl(m.dot_maps_url, m.dot_location) });
  if (flags.civil) episodes.push({ key: 'civil', title: 'La Mairie', date: m.mairie_date, short: shortWhen(m.mairie_date, m.mairie_hour), time: when(m.mairie_date, m.mairie_hour), loc: m.mairie_location, maps: mapsUrl(m.mairie_maps_url, m.mairie_location) });
  if (flags.religious) episodes.push({ key: 'church', title: 'La Cérémonie religieuse', date: m.religious_date, short: shortWhen(m.religious_date, m.religious_hour), time: when(m.religious_date, m.religious_hour), loc: m.religious_location, maps: mapsUrl(m.religious_maps_url, m.religious_location) });
  if (flags.reception) episodes.push({ key: 'reception', title: 'La Réception', date: m.reception_date, short: shortWhen(m.reception_date, m.reception_hour), time: when(m.reception_date, m.reception_hour), loc: m.reception_location, maps: mapsUrl(m.reception_maps_url, m.reception_location) });

  // Pas de défilement de la page derrière
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  // Générique : les initiales s'affichent puis s'envolent
  useEffect(() => {
    if (phase !== 'intro') return;
    const t = window.setTimeout(() => setPhase('profiles'), reduce ? 700 : 3000);
    return () => window.clearTimeout(t);
  }, [phase, reduce]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const touch = () => { if (!interacted.current) { interacted.current = true; onInteract?.(); } };
  const enter = (openAnswer = false) => {
    touch();
    setPhase('home');
    homeRef.current?.scrollTo({ top: 0 });
    if (openAnswer) window.setTimeout(() => setSheet(canRespond ? 'answer' : 'personal'), 350);
  };

  const tagline = closed
    ? 'Le plus beau jour de leur vie a eu lieu : merci d’en avoir fait partie'
    : wedding ? `Rien ne les séparera : en avant-première le ${formatDateFr(wedding, { withYear: false }).replace(/^\S+ /, '')}` : 'Rien ne les séparera : bientôt en avant-première';

  return (
    <div className="fixed inset-0 z-[60] bg-black font-sans text-white" onPointerDown={touch}>
      <div className="relative mx-auto h-full w-full max-w-[480px] overflow-hidden bg-[#0b0b0c]">
        <AnimatePresence>
          {/* 1. Générique */}
          {phase === 'intro' && (
            <motion.button key="intro" type="button" aria-label="Passer le générique" onClick={() => setPhase('profiles')}
              className="absolute inset-0 grid place-items-center bg-black" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <motion.span
                className="flex items-center font-display text-[5.5rem] font-medium leading-none tracking-tight"
                style={{ color: PRIMARY, textShadow: `0 0 40px color-mix(in srgb, ${PRIMARY} 70%, transparent)` }}
                initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0, filter: 'blur(8px)' }}
                animate={reduce ? { opacity: 1 } : { scale: [0.6, 1, 1.05, 7], opacity: [0, 1, 1, 0], filter: ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(6px)'] }}
                transition={reduce ? { duration: 0.3 } : { duration: 3.1, times: [0, 0.2, 0.72, 1], ease: ['easeOut', 'linear', 'easeIn'] }}
              >
                {mono[0]}
                {mono[1] && <><span className="mx-1 text-[3.4rem] font-normal" style={{ color: ACCENT, fontFamily: SCRIPT }}>&amp;</span>{mono[1]}</>}
              </motion.span>
              <span className="absolute inset-x-0 bottom-7 text-center text-[11px] uppercase tracking-[0.2em] text-white/40">Touchez pour passer</span>
            </motion.button>
          )}

          {/* 2. Choisissez votre profil */}
          {phase === 'profiles' && (
            <motion.div key="profiles" className="absolute inset-0 flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <div className="absolute inset-x-0 top-0 h-[74%] bg-cover" style={{ backgroundImage: `url("${cover}")`, backgroundPosition: coverPos }} aria-hidden>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(11,11,12,.25), transparent 18%, transparent 48%, rgba(11,11,12,.85) 82%, #0b0b0c)' }} />
              </div>
              <div className="relative z-10 px-4 pb-12 text-center">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: `color-mix(in srgb, ${PRIMARY} 70%, #fff)`, textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>
                  Un événement {mono.join(' & ')}
                </p>
                <h1 className="mt-1 break-words font-sans text-[2.6rem] font-extrabold uppercase leading-[0.95] tracking-[-0.03em] text-[#f6efe2]" style={{ textShadow: '0 6px 30px rgba(0,0,0,.65)' }}>
                  {p1}{p1 && p2 && <span className="mx-2 align-[-0.08em] text-[3.1rem] font-normal normal-case tracking-normal" style={{ color: ACCENT, fontFamily: SCRIPT }}>&amp;</span>}{p2}
                </h1>
                <p className="mx-auto mt-3.5 max-w-[22rem] text-sm font-bold leading-snug" style={{ textShadow: '0 2px 10px rgba(0,0,0,.7)' }}>{tagline}</p>
              </div>
              <div className="relative z-10 bg-[#24252b] px-5 pb-[max(env(safe-area-inset-bottom),26px)] pt-1">
                <div className="absolute inset-x-[-25%] top-[-26px] -z-10 h-[60px] rounded-[50%] bg-[#24252b]" aria-hidden />
                <h2 className="relative -top-3.5 mb-0 text-center font-sans text-[15px] font-medium text-white/70">Choisissez votre profil</h2>
                <div className="grid grid-cols-3 justify-items-center gap-x-3 gap-y-4">
                  <Profile label={guest || 'Vous'} onClick={() => enter()}>
                    <span className="grid h-full w-full place-items-center font-display text-3xl" style={{ background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${PRIMARY} 70%, #fff), ${PRIMARY} 55%, color-mix(in srgb, ${PRIMARY} 60%, #000))` }}>{guestInitials}</span>
                  </Profile>
                  <Profile label="Les mariés" onClick={() => enter()}>
                    <span className="block h-full w-full bg-cover" style={{ backgroundImage: `url("${cover}")`, backgroundPosition: coverPos }} />
                  </Profile>
                  {!closed && (
                    <Profile label="Répondre" muted onClick={() => enter(true)}>
                      <span className="grid h-full w-full place-items-center bg-[#3a3b42] text-white/85"><Check className="h-9 w-9" strokeWidth={1.6} /></span>
                    </Profile>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Accueil */}
        {phase === 'home' && (
          <motion.div key="home" ref={homeRef} className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="sticky top-0 z-20 flex items-center gap-2 px-4 pb-2.5 pt-[max(env(safe-area-inset-top),16px)]" style={{ background: 'linear-gradient(#0b0b0c 40%, transparent)' }}>
              <span className="font-display text-xl" style={{ color: PRIMARY, filter: 'brightness(1.25)' }}>
                {mono[0]}{mono[1] && <><span style={{ color: ACCENT, fontFamily: SCRIPT }}>&amp;</span>{mono[1]}</>}
              </span>
              <span className="ml-auto grid h-7 w-7 place-items-center rounded-md text-[11px] font-bold" style={{ background: PRIMARY }} aria-hidden>{guestInitials}</span>
            </div>

            <section className="relative -mt-[62px] h-[480px] bg-cover" style={{ backgroundImage: `url("${cover}")`, backgroundPosition: coverPos }}>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0b0b0c 4%, rgba(11,11,12,.55) 38%, rgba(11,11,12,.1) 65%, rgba(11,11,12,.6))' }} />
              <div className="absolute inset-x-0 bottom-0 px-4 pb-3 text-center">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/85">
                  <span className="font-display text-base tracking-normal" style={{ color: PRIMARY, filter: 'brightness(1.3)' }}>{mono.join('&')}</span> Un événement
                </p>
                <h2 className="mt-1 break-words text-[3.1rem] leading-none" style={{ textShadow: '0 4px 30px rgba(0,0,0,.6)', ...(m.names_font && m.names_font !== 'classique' ? nameFontStyle(m.names_font) : { fontFamily: SCRIPT }) }}>
                  {[p1, p2].filter(Boolean).join(' & ')}
                </h2>
                <p className="text-[13px] text-white/85">Le mariage</p>
                <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-white/75">
                  <span className="font-bold text-[#46d369]">100 % de bonheur</span>
                  <span>{year}</span>
                  <span className="rounded-[3px] border border-white/40 px-1.5">Tous publics</span>
                  {episodes.length > 0 && <span>{episodes.length} épisode{episodes.length > 1 ? 's' : ''}</span>}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold">
                  <span className="rounded-[3px] px-1 py-0.5 text-center text-[9px] leading-none" style={{ background: PRIMARY }}>TOP<br />10</span>
                  N°1 des mariages de {year}
                </p>
                {!closed && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setSheet(canRespond ? 'answer' : 'personal')} className="flex items-center justify-center gap-1.5 rounded-md bg-white py-2.5 text-[15px] font-bold text-[#0b0b0c]">
                      {answered ? <><Check className="h-4 w-4" /> Modifier</> : <><Play className="h-4 w-4 fill-current" /> Répondre</>}
                    </button>
                    <button type="button" onClick={() => setSheet('program')} className="flex items-center justify-center gap-1.5 rounded-md bg-[rgba(109,109,110,.7)] py-2.5 text-[15px] font-bold">
                      <Info className="h-4 w-4" /> Programme
                    </button>
                  </div>
                )}
              </div>
            </section>

            <p className="mx-4 mt-4 text-sm leading-relaxed text-white/80">
              {closed
                ? 'Merci d’avoir fait partie du plus beau jour de notre vie.'
                : <>{guest ? <><strong className="text-white">{guest}</strong>, vous êtes invité</> : 'Vous êtes invité'} à l&apos;avant-première du plus beau jour de notre vie. Votre présence est attendue.</>}
            </p>

            {episodes.length > 0 && (
              <>
                <h3 className="mx-4 mb-2 mt-6 font-sans text-base font-bold">Épisodes</h3>
                <div className="flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                  {episodes.map((e, i) => (
                    <button key={e.key} type="button" onClick={() => setSheet({ episode: i })} className="w-[150px] shrink-0 snap-start text-left">
                      <span className="relative block h-[86px] overflow-hidden rounded-[5px] bg-cover" style={{ backgroundImage: `url("${cover}")`, backgroundPosition: coverPos }}>
                        <span className="absolute inset-0 opacity-55 mix-blend-color" style={{ background: i % 2 ? ACCENT : PRIMARY }} />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent to-60%" />
                        <span className="absolute bottom-0.5 left-1.5 font-display text-[2rem] leading-none">{i + 1}</span>
                        <span className="absolute bottom-0 left-0 h-[3px]" style={{ width: `${100 - i * 25}%`, background: PRIMARY }} />
                      </span>
                      <span className="mt-1.5 block text-[13px] font-bold">Ép. {i + 1} · {e.title}</span>
                      <span className="block text-[11px] leading-snug text-white/60">{e.short || 'Horaire à venir'}{e.loc ? <><br />{e.loc}</> : null}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {infos.length > 0 && (
              <>
                <h3 className="mx-4 mb-2 mt-6 font-sans text-base font-bold">À ne pas manquer</h3>
                <div className="flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                  {infos.map((info) => (
                    <div key={info.id} className="w-[170px] shrink-0 snap-start rounded-md p-2.5 text-xs leading-snug text-white/80" style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${ACCENT} 35%, #1c1c1e), #1c1c1e)` }}>
                      <p className="mb-1 text-[13px] font-bold text-white">{info.title || INFO_PRESETS[info.kind].title}</p>
                      <p className="line-clamp-4 whitespace-pre-line">{info.text}</p>
                      {info.phone && <a href={`tel:${info.phone.replace(/\s/g, '')}`} className="mt-1 block font-semibold text-white underline">{info.name ? `${info.name} · ` : ''}{info.phone}</a>}
                      {info.url && <a href={info.url} target="_blank" rel="noopener noreferrer" className="mt-1 block font-semibold text-white underline">Voir le lien</a>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {wedding && days !== null && (
              <div className="mx-4 mt-6 flex items-center gap-3.5 rounded-lg bg-[#1c1c1e] p-3.5">
                <span className="font-display text-[2.6rem] leading-none tabular-nums" style={{ color: ACCENT }}>{Math.abs(days)}</span>
                <p className="text-[13px] text-white/75">
                  <strong className="block text-[15px] text-white">
                    {days > 0 ? `Sortie dans ${days} jour${days > 1 ? 's' : ''}` : days === 0 ? 'C’est aujourd’hui !' : `Diffusé il y a ${-days} jour${days < -1 ? 's' : ''}`}
                  </strong>
                  {formatDateFr(wedding)}
                </p>
              </div>
            )}

            <div className="px-4 pb-8 pt-7 text-center">
              <button type="button" onClick={onDone} className="text-xs font-semibold text-white/55 underline underline-offset-4 hover:text-white">Voir l&apos;invitation classique</button>
              <p className="mt-3 text-[11px] text-white/30">Invitation créée avec WeddingStudio</p>
            </div>
          </motion.div>
        )}

        {/* Tiroirs : épisode, programme, réponse */}
        <AnimatePresence>
          {sheet && (
            <>
              <motion.div key="bg" className="absolute inset-0 z-30 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(null)} />
              <motion.div key="sheet" role="dialog" aria-modal="true"
                className="absolute inset-x-0 bottom-0 z-40 max-h-[82%] overflow-y-auto rounded-t-2xl bg-[#181818] px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-4"
                initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}>
                <button type="button" onClick={() => setSheet(null)} aria-label="Fermer" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#2c2c2c]"><X className="h-4 w-4" /></button>
                {typeof sheet === 'object' && (() => {
                  const e = episodes[sheet.episode];
                  return (
                    <>
                      <Kicker>Épisode {sheet.episode + 1}</Kicker>
                      <h4 className="mr-10 font-display text-2xl">{e.title}</h4>
                      <p className="mt-2 text-sm text-white/80"><strong className="text-white">{e.time || 'Horaire à venir'}</strong>{e.loc && <><br />{e.loc}</>}</p>
                      {e.maps && <a href={e.maps} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-sm font-bold text-[#0b0b0c]"><MapPin className="h-4 w-4" /> Itinéraire</a>}
                    </>
                  );
                })()}
                {sheet === 'program' && (
                  <>
                    <Kicker>Programme</Kicker>
                    <h4 className="mr-10 font-display text-2xl">{episodes.length ? `${episodes.length} épisode${episodes.length > 1 ? 's' : ''}` : 'Programme à venir'}</h4>
                    {episodes.map((e, i) => (
                      <p key={e.key} className="mt-3 text-sm text-white/80"><strong className="text-white">Ép. {i + 1} · {e.title}</strong><br />{[e.time || 'Horaire à venir', e.loc].filter(Boolean).join(' · ')}</p>
                    ))}
                  </>
                )}
                {sheet === 'personal' && (
                  <>
                    <Kicker>Votre réponse</Kicker>
                    <h4 className="mr-10 font-display text-2xl">Répondez depuis votre invitation personnelle</h4>
                    <p className="mt-2 text-sm text-white/75">Utilisez le lien reçu sur WhatsApp : il vous est réservé et permet de nous dire si vous serez là.</p>
                  </>
                )}
                {sheet === 'answer' && (
                  <AnswerForm guest={guest} episodes={episodes} onSubmit={async (a) => {
                    const ok = await onAnswer(a);
                    if (ok) { setSheet(null); setToast(a.status === 'confirmé' ? 'Ajouté à votre liste. À très vite !' : 'Réponse envoyée. Merci de nous avoir prévenus.'); }
                    return ok;
                  }} />
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div key="toast" role="status" className="absolute inset-x-4 bottom-6 z-50 flex items-center gap-2.5 rounded-lg bg-white px-3.5 py-3 text-sm font-bold text-[#0b0b0c]"
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}>
              <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#46d369] text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Profile({ label, muted, onClick, children }: { label: string; muted?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full flex-col items-center gap-2">
      <span className="block h-[84px] w-[84px] overflow-hidden rounded-[14px] border-[3px] border-transparent shadow-[0_8px_18px_-8px_rgba(0,0,0,.6)] transition group-hover:scale-105 group-hover:border-white group-focus-visible:border-white">{children}</span>
      <span className={`line-clamp-2 text-center text-[15px] leading-tight ${muted ? 'font-medium text-white/75' : 'font-bold text-white'}`}>{label}</span>
    </button>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>{children}</p>;
}

function AnswerForm({ guest, episodes, onSubmit }: { guest: string; episodes: Episode[]; onSubmit: (a: PremiereAnswer) => Promise<boolean> }) {
  const [status, setStatus] = useState<PremiereAnswer['status'] | null>(null);
  const [attending, setAttending] = useState({ dot: true, civil: true, church: true, reception: true });
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const chosen = episodes.filter((e) => attending[e.key]).length;

  const submit = async () => {
    if (!status || sending) return;
    setSending(true); setError(false);
    const ok = await onSubmit({ status, attending, notes: notes.trim() });
    setSending(false);
    if (!ok) setError(true);
  };

  return (
    <>
      <Kicker>Votre réponse</Kicker>
      <h4 className="mr-10 font-display text-2xl leading-tight">{guest ? `${guest}, serez-vous des nôtres ?` : 'Serez-vous des nôtres ?'}</h4>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {([['confirmé', 'Oui, j’y serai'], ['décliné', 'Je ne pourrai pas']] as const).map(([v, label]) => (
          <button key={v} type="button" aria-pressed={status === v} onClick={() => setStatus(v)}
            className={`rounded-md px-2 py-3 text-[15px] font-bold transition-colors ${status === v ? 'bg-white text-[#0b0b0c]' : 'bg-[#2c2c2c] text-white'}`}>{label}</button>
        ))}
      </div>
      {status === 'confirmé' && episodes.length > 1 && (
        <fieldset className="mt-4">
          <legend className="text-sm text-white/75">Les épisodes où vous serez là</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {episodes.map((e) => (
              <button key={e.key} type="button" aria-pressed={attending[e.key]} onClick={() => setAttending((a) => ({ ...a, [e.key]: !a[e.key] }))}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${attending[e.key] ? 'border-white bg-white/10' : 'border-white/25 text-white/60'}`}>
                {attending[e.key] && <Check className="h-3.5 w-3.5" />}{e.title}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {status && (
        <label className="mt-4 block">
          <span className="text-sm text-white/75">Un mot pour nous (facultatif)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2}
            className="mt-1.5 w-full resize-none rounded-md border border-white/15 bg-[#2c2c2c] px-3 py-2 text-sm text-white outline-none focus:border-white/50" />
        </label>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-[#ff8a8a]">La réponse n&apos;a pas pu être envoyée. Vérifiez votre connexion puis réessayez.</p>}
      <button type="button" onClick={submit} disabled={!status || sending || (status === 'confirmé' && episodes.length > 1 && chosen === 0)}
        className="mt-4 w-full rounded-md py-3.5 text-[15px] font-extrabold text-white transition-opacity disabled:opacity-40" style={{ background: PRIMARY }}>
        {sending ? 'Envoi…' : 'Envoyer ma réponse'}
      </button>
    </>
  );
}
