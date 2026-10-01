"use client";

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer, MessageCircle, Loader2, Users, Heart, Star } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  contactHref, deroulText, formatWeddingDate, guestEvents, sortEvents, timeRange, type PlanningEvent,
} from '../../../../lib/planning';

type Version = 'equipe' | 'invites';
type Marriage = { id: string; wedding_date?: string | null; partner_1_name?: string | null; partner_2_name?: string | null };

export default function PlanningPrintPage() {
  return (
    <Suspense fallback={null}>
      <PrintContent />
    </Suspense>
  );
}

function PrintContent() {
  const router = useRouter();
  const params = useSearchParams();
  const version: Version = params.get('version') === 'invites' ? 'invites' : 'equipe';
  const [loading, setLoading] = useState(true);
  const [marriage, setMarriage] = useState<Marriage | null>(null);
  const [events, setEvents] = useState<PlanningEvent[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: m } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
    setMarriage(m);
    if (m) {
      const { data } = await supabase.from('planning_events').select('*').eq('marriage_id', m.id).order('start_time', { ascending: true });
      setEvents(sortEvents(data ?? []));
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>;

  const team = version === 'equipe';
  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  const shown = team ? events : guestEvents(events);
  const date = formatWeddingDate(marriage?.wedding_date);

  // Contacts utiles : chaque responsable une seule fois
  const contacts = team
    ? [...new Map(events.filter((e) => e.responsible && e.responsible_contact).map((e) => [`${e.responsible}|${e.responsible_contact ?? ''}`, e])).values()]
    : [];

  const print = () => {
    const previous = document.title;
    document.title = `Déroulé ${team ? 'équipe' : 'invités'} - ${couple || 'mariage'}`;
    window.print();
    setTimeout(() => { document.title = previous; }, 1000);
  };

  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(deroulText(couple, marriage?.wedding_date, shown, team))}`;

  return (
    <div className="min-h-screen bg-ivory print:min-h-0 print:bg-white">
      <style>{`
        @page { size: A4 portrait; margin: 12mm 12mm 14mm; }
        @media print {
          html, body, .bg-ivory, .paper { background: #fff !important; }
          .deroule-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .deroule-row { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* Barre d'outils (masquée à l'impression) */}
      <div className="sticky top-14 z-30 border-b border-slate-200/80 bg-ivory/90 backdrop-blur-xl lg:top-0 print:hidden">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/dashboard/planning" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-slate-600 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour</span>
          </Link>
          <div role="tablist" aria-label="Version du déroulé" className="flex flex-1 rounded-xl bg-white p-1 ring-1 ring-slate-200 sm:flex-none">
            {([['equipe', 'Équipe', Users], ['invites', 'Invités', Heart]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={version === id}
                onClick={() => router.replace(`/dashboard/planning/print?version=${id}`, { scroll: false })}
                className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${version === id ? 'bg-ink text-white' : 'text-slate-600 hover:text-ink'}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink hover:border-emerald-300 sm:flex-none ${shown.length ? '' : 'pointer-events-none opacity-50'}`}>
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
            </a>
            <button onClick={print} disabled={!shown.length} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 sm:flex-none">
              <Printer className="h-4 w-4" /> Imprimer / PDF
            </button>
          </div>
        </div>
        <p className="mx-auto max-w-[210mm] px-4 pb-3 text-xs text-slate-500 sm:px-6">
          {team
            ? 'Version complète pour le maître de cérémonie, le traiteur, le DJ… avec responsables, contacts et notes.'
            : 'Version légère pour vos invités : les moments clés et les lieux.'}
          {' '}Sur téléphone, choisissez « Enregistrer en PDF » ou « Partager » dans la fenêtre d&apos;impression.
        </p>
      </div>

      {/* Feuille A4 */}
      <div className="px-3 py-5 sm:px-6 sm:py-8 print:p-0">
        <article className="deroule-sheet mx-auto max-w-[210mm] rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <header className="border-b border-amber-300 pb-5 text-center print:pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700">{team ? 'Feuille de route · Jour J' : 'Programme de la journée'}</p>
            <h1 className="mt-2 break-words font-display text-3xl text-ink sm:text-4xl print:text-[26pt]">{couple || 'Notre mariage'}</h1>
            {date && <p className="mt-1 text-sm text-slate-600 print:text-[11pt]">{date}</p>}
          </header>

          {shown.length === 0 ? (
            <p className="py-16 text-center text-slate-500">Le déroulé est vide. Ajoutez des moments depuis la page Jour J.</p>
          ) : (
            <ol className="mt-2">
              {shown.map((e) => {
                const href = contactHref(e.responsible_contact);
                return (
                  <li key={e.id} className={`deroule-row grid grid-cols-[4.5rem_1fr] gap-3 border-b border-slate-100 py-4 sm:grid-cols-[7rem_1fr_auto] sm:gap-5 print:grid-cols-[30mm_1fr_auto] print:gap-4 print:py-3 ${e.is_major_step ? 'border-l-[3px] border-l-rose-400 pl-3 sm:pl-4' : 'pl-[15px] sm:pl-[19px]'}`}>
                    <p className="pt-0.5 text-sm font-bold tabular-nums text-ink sm:text-base print:text-[11pt]">{timeRange(e)}</p>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 break-words font-display text-lg leading-snug text-ink print:text-[13pt]">
                        {e.title}
                        {e.is_major_step && team && <Star className="h-3.5 w-3.5 fill-rose-400 text-rose-400" aria-label="Moment clé" />}
                      </p>
                      {e.location && <p className="mt-0.5 text-sm text-slate-600 print:text-[10pt]">📍 {e.location}</p>}
                      {team && e.responsible && (
                        <p className="mt-1 text-sm text-slate-700 print:text-[10pt]">
                          <span className="font-semibold">Responsable :</span> {e.responsible}
                          {e.responsible_contact && (
                            <> · {href ? <a href={href} className="whitespace-nowrap text-rose-700 underline-offset-2 hover:underline print:text-slate-700 print:no-underline">{e.responsible_contact}</a> : <span className="whitespace-nowrap">{e.responsible_contact}</span>}</>
                          )}
                        </p>
                      )}
                      {team && e.description && <p className="mt-1 whitespace-pre-line break-words text-sm italic text-slate-500 print:text-[9.5pt]">{e.description}</p>}
                    </div>
                    {/* Case à cocher pour suivre la journée sur papier */}
                    {team && <span aria-hidden className="hidden h-5 w-5 rounded border-2 border-slate-300 sm:block print:block" />}
                  </li>
                );
              })}
            </ol>
          )}

          {contacts.length > 0 && (
            <section className="deroule-row mt-8 print:mt-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">Contacts utiles</h2>
              <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 print:grid-cols-2 print:text-[10pt]">
                {contacts.map((c) => (
                  <li key={`${c.responsible}|${c.responsible_contact}`} className="flex min-w-0 justify-between gap-3 border-b border-dotted border-slate-200 py-1">
                    <span className="truncate font-semibold text-ink">{c.responsible}</span>
                    <span className="shrink-0 tabular-nums text-slate-600">{c.responsible_contact || '—'}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="mt-8 text-center text-[11px] text-slate-400 print:mt-6 print:text-[8pt]">
            Généré le {new Date().toLocaleDateString('fr-FR')} avec WeddingStudio
          </footer>
        </article>
      </div>
    </div>
  );
}
