"use client";

// Haut de la page d'invitation : carte des dates entourée de motifs, prénoms, frise et programme rangé par jour.
// Motifs dessinés en SVG et animations en CSS uniquement (déplacement et transparence) : la page reste légère.
// Les modèles africains ont leur propre habillage ; les autres modèles prennent les arabesques dorées.
import React from 'react';
import { Cross, GlassWater, Handshake, Landmark, MapPin } from 'lucide-react';
import { nameFontStyle } from '../../lib/name-fonts';
import { BOGOLAN_PATTERN, BOGOLAN_RULE, KITA_PATTERN, familiesPhrase, invitationHeading, isAfricanTemplate, waxPattern, type AfricanTemplate } from '../../lib/african-invitation';
import { dateSummary, daysUntil, hourLabel, programByDay, programEvents, type ProgramKind } from '../../lib/invitation-program';

type Flags = { dot: boolean; civil: boolean; religious: boolean; reception: boolean };
type Decor = 'classic' | AfricanTemplate;
type Marriage = Record<string, unknown> & { partner_1_name?: string | null; partner_2_name?: string | null; names_font?: string | null; invitation_text?: string | null; family_1?: string | null; family_2?: string | null };

const TONES: Record<AfricanTemplate, { name: string; amp: string; accent: string; surface: string; btn: string; btnInk: string }> = {
  pagne: { name: '', amp: '', accent: '', surface: '#fbf3e4', btn: '', btnInk: '#ffffff' },
  kita: { name: '#5a2d12', amp: '#e8622c', accent: '#c4501f', surface: '#fff7ec', btn: '#5a2d12', btnInk: '#fff7ec' },
  bogolan: { name: '#4a2a17', amp: '#9c5a26', accent: '#9c5a26', surface: '#efe4cf', btn: '#4a2a17', btnInk: '#efe4cf' },
  village: { name: '#7a3c16', amp: '#b8662f', accent: '#a5541f', surface: '#f6e7cf', btn: '#7a3c16', btnInk: '#f6e7cf' },
};

const ICONS: Record<ProgramKind, typeof Landmark> = { dot: Handshake, civil: Landmark, religious: Cross, reception: GlassWater };

// Pétales qui tombent doucement sur la photo (modèles non africains)
export function Petals({ color }: { color: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {[{ l: '18%', c: color, d: '0s' }, { l: '46%', c: '#ffffff', d: '3s' }, { l: '72%', c: color, d: '6s' }, { l: '86%', c: '#ffffff', d: '4.5s' }].map((p, i) => (
        <i key={i} className="ws-petal" style={{ left: p.l, background: p.c, animationDelay: p.d }} />
      ))}
    </div>
  );
}

export default function InvitationHeader({ m, flags, template, primary, accent, guestName, invitationText }: {
  m: Marriage;
  flags: Flags;
  template: string;
  primary: string;
  accent: string;
  guestName?: string;
  invitationText?: string | null;
}) {
  const decor: Decor = isAfricanTemplate(template) ? template : 'classic';
  const african = decor !== 'classic';
  const tone = african ? TONES[decor] : null;
  const nameColor = decor === 'pagne' ? primary : tone?.name || undefined;
  const ampColor = decor === 'pagne' || decor === 'classic' ? accent : tone!.amp;
  const hl = decor === 'pagne' ? primary : tone?.accent || primary;

  const events = programEvents(m, flags);
  const groups = programByDay(events);
  const summary = dateSummary(m, events);
  const days = daysUntil(summary.first);
  const families = familiesPhrase(m.family_1, m.family_2);
  const heading = invitationHeading(flags);
  const p1 = m.partner_1_name?.trim() || '';
  const p2 = m.partner_2_name?.trim() || '';
  const len = p1.length + p2.length;
  const nameSize = len <= 13 ? 'text-[3rem]' : len <= 19 ? 'text-[2.6rem]' : 'text-[2.2rem]';

  return (
    <>
      {/* CARTE DES DATES ET SON CADRE */}
      <div className={`ws-rise relative isolate -mt-20 p-2.5 ${decor === 'village' ? 'mb-10' : 'mb-6'}`}>
        <DateFrame decor={decor} primary={primary} accent={accent} />
        <div
          className="relative rounded-[1.25rem] px-5 pb-4 pt-5 text-center shadow-xl"
          style={decor === 'village'
            ? { background: '#7a3c16', color: '#f6e7cf' }
            : { background: decor === 'classic' ? '#ffffff' : TONES[decor].surface, color: '#1f1b18', borderBottom: decor === 'classic' ? `4px solid ${primary}` : undefined }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-[5px] rounded-[1rem] border opacity-30" style={{ borderColor: decor === 'village' ? '#f6e7cf' : hl }} />
          <p className="eyebrow mb-1.5" style={decor === 'village' ? { color: '#f3c98f' } : african ? { color: hl } : undefined}>
            {summary.several ? 'Enregistrez les dates' : 'Enregistrez la date'}
          </p>
          <h3 className="font-display text-[1.4rem] leading-tight text-balance">{summary.label}</h3>
          {(days !== null || events.length > 1) && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px] font-bold">
              {days !== null && (
                <span className="rounded-lg px-2.5 py-1" style={chip(decor)}>
                  {days === 0 ? 'C’est aujourd’hui !' : <><b className="mr-1 font-display text-sm tabular-nums">{days}</b>{days === 1 ? 'jour' : 'jours'}</>}
                </span>
              )}
              {events.length > 1 && <span className="rounded-lg px-2.5 py-1" style={chip(decor)}><b className="mr-1 font-display text-sm">{events.length}</b>cérémonies</span>}
            </div>
          )}
        </div>
      </div>

      {/* PRÉNOMS */}
      <div className={`ws-rise text-center ${african ? '' : 'mb-8'}`} style={{ animationDelay: '.25s' }}>
        {african && families ? (
          <p className="mx-auto mb-3 max-w-[22rem] text-[12px] uppercase leading-relaxed tracking-[0.14em] text-slate-500">
            {families.lead} <span className="font-semibold" style={{ color: nameColor }}>{families.names}</span> {families.names.includes('&') ? 'vous invitent' : 'vous invite'} {heading.to} {heading.title.toLowerCase()} de
          </p>
        ) : (
          <>
            {invitationText && (
              <div className="mb-3 flex items-center justify-center gap-3">
                <div className="gold-rule w-10" /><p className="eyebrow">{invitationText}</p><div className="gold-rule w-10" />
              </div>
            )}
            {families && <p className="mb-4 text-[13px] uppercase tracking-[0.14em] text-slate-500">{families.lead} <span className="font-semibold text-ink">{families.names}</span> {families.verb}</p>}
          </>
        )}
        <h1 className={`${nameSize} font-normal leading-[1.1] text-ink text-balance break-words`} style={{ color: nameColor }}>
          <span style={nameFontStyle(m.names_font)}>
            {p1}{p1 && p2 && <span className="ws-glow mx-2 inline-block font-light" style={{ color: ampColor, fontSize: '0.75em' }}>&amp;</span>}{p2}
          </span>
        </h1>
        {guestName && <p className="mt-4 font-display text-lg italic text-slate-600">{guestName}, cette invitation est pour vous.</p>}
        <Divider decor={decor} primary={primary} accent={accent} />
      </div>

      {/* PROGRAMME RANGÉ PAR JOUR */}
      {groups.length > 0 && (
        <div className={`mb-10 grid gap-3 ${african ? `-mx-6 px-6 py-5 ${decor === 'pagne' || decor === 'kita' ? '' : 'mt-6'}` : ''}`} style={african ? { background: TONES[decor].surface } : undefined}>
          {groups.map((g, gi) => (
            <div key={g.day ?? `sans-date-${gi}`} className="ws-rise grid gap-2.5" style={{ animationDelay: `${0.7 + gi * 0.15}s` }}>
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] after:h-px after:flex-1 after:bg-current after:opacity-25" style={{ color: hl }}>{g.label}</p>
              <div className={decor === 'village' ? 'grid gap-3 border-l-2 pl-3' : 'grid gap-3'} style={decor === 'village' ? { borderColor: '#b8662f' } : undefined}>
                {g.events.map((e) => {
                  const Icon = ICONS[e.kind];
                  const hour = hourLabel(e.hour);
                  return (
                    <div key={e.kind} className={`flex items-center gap-3 ${african ? '' : 'rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm'}`}>
                      <span className="grid w-[3.75rem] shrink-0 place-items-end whitespace-nowrap text-right font-display text-[15px] font-bold tabular-nums leading-tight" style={{ color: hl }}>
                        {hour ?? <Icon size={18} strokeWidth={1.7} aria-label="Horaire à venir" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[16px] leading-tight text-ink first-letter:uppercase">{e.title.replace(/^(La|Le) /, '')}</p>
                        {e.location && <p className="mt-0.5 line-clamp-2 break-words text-xs text-slate-500">{e.location}</p>}
                      </div>
                      {e.maps && (
                        <a href={e.maps} target="_blank" rel="noopener noreferrer" aria-label={`Itinéraire : ${e.title}`}
                          className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-extrabold transition-transform active:scale-95"
                          style={african ? { background: decor === 'pagne' ? primary : TONES[decor].btn, color: TONES[decor].btnInk } : { background: '#f1f5f9', color: '#1f2937' }}>
                          <MapPin size={13} /> Y aller
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const chip = (decor: Decor): React.CSSProperties =>
  decor === 'village' ? { background: 'rgba(246,231,207,.15)', color: '#f6e7cf' } : { background: decor === 'classic' ? '#f5f1ea' : 'rgba(255,255,255,.75)', color: '#5b4a3b' };

// Cadre autour de la carte des dates
function DateFrame({ decor, primary, accent }: { decor: Decor; primary: string; accent: string }) {
  if (decor === 'classic') {
    const corner = (cls: string) => (
      <svg key={cls} aria-hidden viewBox="0 0 42 42" fill="none" stroke={accent} strokeWidth="1.6" className={`ws-pop absolute z-[2] h-10 w-10 ${cls}`} style={{ animationDelay: '.5s' }}>
        <path d="M4 30 C4 14 14 4 30 4" /><path d="M9 26 C10 17 17 10 26 9" /><circle cx="6" cy="6" r="3" fill={accent} /><path d="M14 14 q6 -2 8 4 q-6 2 -8 -4z" fill={accent} stroke="none" />
      </svg>
    );
    return <>{corner('left-0 top-0')}{corner('right-0 top-0 -scale-x-100')}{corner('bottom-0 left-0 -scale-y-100')}{corner('bottom-0 right-0 -scale-100')}</>;
  }
  if (decor === 'village') {
    return (
      <>
        <svg aria-hidden viewBox="0 0 300 300" className="ws-turn absolute left-1/2 top-1/2 -z-10 -ml-[125px] -mt-[125px] h-[250px] w-[250px] opacity-50">
          <g fill="#e9a54a">{Array.from({ length: 12 }, (_, i) => <path key={i} d="M150 150 L145 0 L155 0Z" transform={`rotate(${i * 30} 150 150)`} />)}</g>
        </svg>
        <span aria-hidden className="absolute inset-0 rounded-[1.6rem] border-[3px] border-dotted border-[#b8662f]" />
      </>
    );
  }
  const bg = decor === 'pagne' ? { backgroundImage: waxPattern(primary, accent), backgroundSize: '24px 24px' }
    : decor === 'kita' ? { backgroundImage: KITA_PATTERN, backgroundSize: '75px 48px' }
    : { backgroundImage: BOGOLAN_PATTERN, backgroundSize: '28px 28px' };
  const medal = (pos: string) => (
    <span key={pos} aria-hidden className={`ws-spin-in absolute z-[2] grid h-8 w-8 place-items-center rounded-full border-2 ${pos}`}
      style={{ background: decor === 'pagne' ? accent : '#fff7ec', borderColor: decor === 'pagne' ? '#fffaf0' : '#5a2d12', animationDelay: '.6s' }}>
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke={decor === 'pagne' ? primary : '#e8622c'} strokeWidth="2"><path d="M10 16c-4-2.5-6-4.5-6-7a3 3 0 0 1 6-1.2A3 3 0 0 1 16 9c0 2.5-2 4.5-6 7z" /></svg>
    </span>
  );
  return (
    <>
      <span aria-hidden className="absolute inset-0 rounded-[1.6rem] shadow-lg" style={bg} />
      {decor === 'pagne' && <>{medal('-left-1.5 -top-1.5')}{medal('-right-1.5 -top-1.5')}</>}
      {decor === 'kita' && medal('left-1/2 -top-3 -translate-x-1/2')}
    </>
  );
}

// Frise sous les prénoms
function Divider({ decor, primary, accent }: { decor: Decor; primary: string; accent: string }) {
  if (decor === 'pagne' || decor === 'kita') {
    return (
      <div aria-hidden className="ws-slide -mx-6 mt-6 h-4 [margin-bottom:-1px]"
        style={decor === 'pagne' ? { backgroundImage: waxPattern(primary, accent), backgroundSize: '32px 32px' } : { backgroundImage: KITA_PATTERN, backgroundSize: '75px 48px' }} />
    );
  }
  if (decor === 'bogolan') return <div aria-hidden className="ws-slide mx-auto mt-6 h-2.5 w-44 opacity-80" style={{ background: `${BOGOLAN_RULE} repeat-x center` }} />;
  if (decor === 'village') {
    return (
      <svg aria-hidden viewBox="0 0 170 14" fill="none" stroke="#b8662f" strokeWidth="2" className="mx-auto mt-5 h-3.5 w-44">
        <path className="ws-draw" d="M0 11 L10 3 L20 11 L30 3 L40 11 L50 3 L60 11 M110 11 L120 3 L130 11 L140 3 L150 11 L160 3 L170 11" />
        <g fill="#b8662f" stroke="none"><circle cx="76" cy="7" r="2.5" /><circle cx="85" cy="7" r="2.5" /><circle cx="94" cy="7" r="2.5" /></g>
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 170 14" fill="none" stroke={accent} strokeWidth="1.4" className="mx-auto mt-5 h-3.5 w-44">
      <path className="ws-draw" d="M0 7 H70 M100 7 H170" /><path d="M85 1 l6 6 -6 6 -6 -6z" fill={accent} />
    </svg>
  );
}
