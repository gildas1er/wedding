"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Plus, Clock, MapPin, Trash2, Calendar, AlertCircle, X, Save, Printer,
  Pencil, UserRound, Phone, Star, Loader2, Sparkles, Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import {
  EXTRA_FIELDS, contactHref, daysUntil, formatTime, formatWeddingDate, isMissingColumnError,
  liveStatus, sortEvents, timeRange, type PlanningEvent,
} from '../../../lib/planning';
import { buildTemplate, type TemplateMoment } from '../../../lib/planning-template';

type Marriage = Record<string, unknown> & { id: string; wedding_date?: string | null; partner_1_name?: string | null; partner_2_name?: string | null };

type EventForm = {
  start_time: string; end_time: string; title: string; location: string;
  responsible: string; responsible_contact: string; description: string; is_major_step: boolean;
};

const EMPTY_FORM: EventForm = {
  start_time: '', end_time: '', title: '', location: '',
  responsible: '', responsible_contact: '', description: '', is_major_step: false,
};

export default function PlanningPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [marriage, setMarriage] = useState<Marriage | null>(null);
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [editor, setEditor] = useState<{ id: string | null; values: EventForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { confirm, notify } = useConfirm();
  const [now, setNow] = useState(() => new Date());
  const [templateOpen, setTemplateOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: m } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
    setMarriage(m);
    if (m) {
      const { data, error: err } = await supabase.from('planning_events').select('*').eq('marriage_id', m.id).order('start_time', { ascending: true });
      if (err) setError('Impossible de charger le déroulé. Vérifiez votre connexion.');
      else setEvents(data ?? []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  // Horloge pour le mode « jour même » (toutes les 30 s suffit)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const openAdd = () => {
    // Propose l'heure qui suit le dernier moment
    const last = sortEvents(events).at(-1);
    const start = last?.end_time ?? '';
    setEditor({ id: null, values: { ...EMPTY_FORM, start_time: start ? start.slice(0, 5) : '' } });
  };

  const openEdit = (e: PlanningEvent) => setEditor({
    id: e.id,
    values: {
      start_time: e.start_time?.slice(0, 5) ?? '',
      end_time: e.end_time?.slice(0, 5) ?? '',
      title: e.title ?? '',
      location: e.location ?? '',
      responsible: e.responsible ?? '',
      responsible_contact: e.responsible_contact ?? '',
      description: e.description ?? '',
      is_major_step: Boolean(e.is_major_step),
    },
  });

  const save = async (v: EventForm) => {
    if (!marriage || !editor) return;
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      start_time: v.start_time,
      end_time: v.end_time || null,
      title: v.title.trim(),
      location: v.location.trim() || null,
      responsible: v.responsible.trim() || null,
      responsible_contact: v.responsible_contact.trim() || null,
      description: v.description.trim() || null,
      is_major_step: v.is_major_step,
    };

    const write = (body: Record<string, unknown>) => editor.id
      ? supabase.from('planning_events').update(body).eq('id', editor.id).select().single()
      : supabase.from('planning_events').insert([{ ...body, marriage_id: marriage.id }]).select().single();

    let { data, error: err } = await write(payload);
    // Base pas encore à jour (migration 8) : on enregistre l'essentiel et on prévient
    if (err && isMissingColumnError(err)) {
      const basic = { ...payload };
      EXTRA_FIELDS.forEach((k) => delete basic[k]);
      ({ data, error: err } = await write(basic));
      if (!err) setNotice("Moment enregistré, mais l'heure de fin et le responsable n'ont pas pu l'être : la base doit être mise à jour (migration 8).");
    }
    setSaving(false);
    if (err || !data) { setError("L'enregistrement a échoué. Vérifiez votre connexion puis réessayez."); return; }
    setEvents((prev) => sortEvents(editor.id ? prev.map((e) => (e.id === editor.id ? data : e)) : [...prev, data]));
    setEditor(null);
  };

  const addFromTemplate = async (selected: TemplateMoment[]) => {
    if (!marriage || !selected.length) return;
    setSaving(true);
    setError(null);
    const rows: Record<string, unknown>[] = selected.map((m) => { const row: Record<string, unknown> = { ...m, marriage_id: marriage.id }; delete row.key; delete row.dayNote; return row; });
    let { data, error: err } = await supabase.from('planning_events').insert(rows).select();
    if (err && isMissingColumnError(err)) {
      const basic = rows.map((r) => { const b = { ...r }; EXTRA_FIELDS.forEach((k) => delete b[k]); return b; });
      ({ data, error: err } = await supabase.from('planning_events').insert(basic).select());
      if (!err) setNotice("Moments ajoutés, sans les heures de fin ni les responsables : la base doit être mise à jour (migration 8).");
    }
    setSaving(false);
    if (err || !data) { setError("Le modèle n'a pas pu être ajouté. Vérifiez votre connexion puis réessayez."); return; }
    setEvents((prev) => sortEvents([...prev, ...data]));
    setTemplateOpen(false);
  };

  const remove = async (event: PlanningEvent) => {
    if (!(await confirm({ title: 'Retirer ce moment du déroulé ?', item: event.title, message: 'Il disparaîtra aussi de la feuille de route imprimée et du programme des invités.' }))) return;
    const { error: err } = await supabase.from('planning_events').delete().eq('id', event.id);
    if (err) { notify('La suppression a échoué. Réessayez.', 'error'); return; }
    setEvents((prev) => prev.filter((e) => e.id !== event.id));
    setEditor(null);
    notify('Moment retiré du déroulé');
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>;

  const days = daysUntil(marriage?.wedding_date);
  const isToday = days === 0;
  const live = isToday ? liveStatus(events, now) : null;
  const hasResponsible = events.some((e) => e.responsible);

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-8 sm:py-10 lg:py-12">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Chronologie</p>
            <h1 className="mt-2 text-3xl font-normal text-ink sm:text-4xl">Le déroulé du <span className="italic text-rose-500">Jour J</span></h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/planning/print"
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-amber-300 sm:flex-none ${events.length ? '' : 'pointer-events-none opacity-50'}`}
              aria-disabled={!events.length}
            >
              <Printer className="h-4 w-4" /> Imprimer le déroulé
            </Link>
            <button onClick={openAdd} className="hidden min-h-[44px] items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 lg:inline-flex">
              <Plus className="h-4 w-4" /> Ajouter un moment
            </button>
          </div>
        </header>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mb-5 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} aria-label="Fermer"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
          {notice && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span className="flex-1">{notice}</span>
              <button onClick={() => setNotice(null)} aria-label="Fermer"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bandeau : compte à rebours avant le mariage, moment en cours le jour J */}
        {isToday && live ? (
          <section className="mb-8 overflow-hidden rounded-[1.5rem] bg-ink p-5 text-white shadow-xl sm:p-7">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> C&apos;est aujourd&apos;hui
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <LiveBlock label="En ce moment" event={live.current} empty="Pas de moment en cours" />
              <LiveBlock label="Ensuite" event={live.next} empty="C'était le dernier moment, profitez !" />
            </div>
          </section>
        ) : days !== null && days > 0 ? (
          <section className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <p className="font-display text-4xl text-rose-500">J-{days}</p>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{formatWeddingDate(marriage?.wedding_date)}</p>
              <p className="text-sm text-slate-500">
                {events.length
                  ? `${events.length} moment${events.length > 1 ? 's' : ''} prévu${events.length > 1 ? 's' : ''}, de ${formatTime(sortEvents(events)[0].start_time)} à ${formatTime(sortEvents(events).at(-1)!.end_time || sortEvents(events).at(-1)!.start_time)}`
                  : 'Aucun moment prévu pour l’instant'}
              </p>
            </div>
          </section>
        ) : null}

        {/* Chronologie */}
        {events.length > 0 ? (
          <ol className="relative space-y-3 sm:space-y-4">
            <span aria-hidden className="absolute bottom-4 left-[1.6rem] top-4 w-px bg-slate-200 sm:left-[2.35rem]" />
            {events.map((event) => {
              const href = contactHref(event.responsible_contact);
              const active = live?.current?.id === event.id;
              return (
                <li key={event.id} className="relative flex gap-3 sm:gap-5">
                  <div className={`z-10 grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-2xl text-[13px] font-bold shadow-sm sm:h-[4.75rem] sm:w-[4.75rem] sm:text-base ${event.is_major_step ? 'bg-rose-500 text-white' : 'border border-slate-200 bg-white text-ink'} ${active ? 'ring-4 ring-amber-300' : ''}`}>
                    {formatTime(event.start_time)}
                  </div>
                  <article className={`min-w-0 flex-1 rounded-[1.25rem] border bg-white p-4 shadow-sm sm:p-5 ${event.is_major_step ? 'border-rose-200' : 'border-slate-200/80'}`}>
                    <div className="flex items-start gap-2">
                      <button onClick={() => openEdit(event)} className="min-w-0 flex-1 text-left">
                        <p className="text-xs font-semibold text-slate-500">
                          {timeRange(event)}
                          {event.is_major_step && <span className="ml-2 inline-flex items-center gap-1 text-rose-600"><Star className="h-3 w-3 fill-current" /> Moment clé</span>}
                        </p>
                        <h3 className="mt-0.5 break-words font-display text-lg text-ink sm:text-xl">{event.title}</h3>
                      </button>
                      <div className="flex shrink-0">
                        <button onClick={() => openEdit(event)} aria-label={`Modifier ${event.title}`} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-ink"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove(event)} aria-label={`Supprimer ${event.title}`} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {event.description && <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">{event.description}</p>}
                    {(event.location || event.responsible) && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {event.location && (
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-600"><MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" /><span className="truncate">{event.location}</span></span>
                        )}
                        {event.responsible && (
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-900"><UserRound className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.responsible}</span></span>
                        )}
                        {href && (
                          <a href={href} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800 hover:bg-emerald-100"><Phone className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.responsible_contact}</span></a>
                        )}
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Calendar className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="font-display text-xl text-ink">Votre journée, heure par heure</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Partez d&apos;une journée type calée sur les heures de votre Studio, ou ajoutez vos moments un par un.</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <button onClick={() => setTemplateOpen(true)} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700">
                <Sparkles className="h-4 w-4 text-amber-300" /> Partir d&apos;un modèle
              </button>
              <button onClick={openAdd} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-ink hover:border-rose-200">
                <Plus className="h-4 w-4" /> Ajouter un moment
              </button>
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div className="mt-6 text-center">
            <button onClick={() => setTemplateOpen(true)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              <Sparkles className="h-4 w-4" /> Compléter avec le modèle de journée
            </button>
          </div>
        )}

        {events.length > 0 && !hasResponsible && (
          <p className="mt-6 text-center text-sm text-slate-500">Astuce : indiquez qui s&apos;occupe de chaque moment, il apparaîtra sur la feuille de route de l&apos;équipe.</p>
        )}
      </main>

      {/* Bouton d'ajout flottant (mobile et tablette) */}
      <button
        onClick={openAdd}
        aria-label="Ajouter un moment"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/30 transition-transform active:scale-95 lg:hidden print:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {templateOpen && marriage && (
          <TemplateSheet
            marriage={marriage}
            existing={events}
            saving={saving}
            onClose={() => setTemplateOpen(false)}
            onConfirm={addFromTemplate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editor && (
          <EventModal
            key={editor.id ?? 'new'}
            isEdit={Boolean(editor.id)}
            initial={editor.values}
            saving={saving}
            onClose={() => setEditor(null)}
            onSave={save}
            onDelete={editor.id ? () => { const e = events.find((x) => x.id === editor.id); if (e) remove(e); } : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveBlock({ label, event, empty }: { label: string; event: PlanningEvent | null; empty: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{label}</p>
      {event ? (
        <>
          <p className="mt-1 flex items-center gap-2 text-sm text-amber-300"><Clock className="h-4 w-4" /> {timeRange(event)}</p>
          <p className="mt-1 break-words font-display text-2xl">{event.title}</p>
          {event.location && <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70"><MapPin className="h-3.5 w-3.5 shrink-0" /> {event.location}</p>}
          {event.responsible && <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70"><UserRound className="h-3.5 w-3.5 shrink-0" /> {event.responsible}</p>}
        </>
      ) : (
        <p className="mt-2 text-white/70">{empty}</p>
      )}
    </div>
  );
}

const labelCls = 'mb-1.5 ml-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500';
const inputCls = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:border-rose-300 focus:ring-2 focus:ring-rose-100 sm:text-sm';

function EventModal({ isEdit, initial, saving, onClose, onSave, onDelete }: {
  isEdit: boolean;
  initial: EventForm;
  saving: boolean;
  onClose: () => void;
  onSave: (v: EventForm) => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<EventForm>(initial);
  const set = (patch: Partial<EventForm>) => setV((prev) => ({ ...prev, ...patch }));
  const endBeforeStart = Boolean(v.start_time && v.end_time && v.end_time <= v.start_time);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4 print:hidden">
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-title"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        onSubmit={(e) => { e.preventDefault(); if (!endBeforeStart) onSave(v); }}
        className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[1.75rem] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[1.75rem] sm:p-8"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-ink sm:right-5 sm:top-5"><X className="h-5 w-5" /></button>
        <h2 id="event-title" className="mb-6 pr-10 font-display text-2xl text-ink">{isEdit ? 'Modifier le moment' : 'Nouveau moment'}</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label htmlFor="start_time" className={labelCls}><Clock className="h-3 w-3" /> Début *</label>
              <input id="start_time" type="time" required className={inputCls} value={v.start_time} onChange={(e) => set({ start_time: e.target.value })} />
            </div>
            <div className="min-w-0">
              <label htmlFor="end_time" className={labelCls}>Fin</label>
              <input id="end_time" type="time" className={`${inputCls} ${endBeforeStart ? 'border-rose-400' : ''}`} value={v.end_time} onChange={(e) => set({ end_time: e.target.value })} />
            </div>
          </div>
          {endBeforeStart && <p className="-mt-2 text-sm text-rose-600">L&apos;heure de fin doit être après l&apos;heure de début.</p>}

          <div>
            <label htmlFor="title" className={labelCls}>Moment *</label>
            <input id="title" required autoFocus={!isEdit} className={inputCls} placeholder="Ex : Cérémonie civile" value={v.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label htmlFor="location" className={labelCls}><MapPin className="h-3 w-3" /> Lieu</label>
            <input id="location" className={inputCls} placeholder="Ex : Mairie de Cocody" value={v.location} onChange={(e) => set({ location: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-amber-50/60 p-3 ring-1 ring-amber-100 sm:grid-cols-2 sm:p-4">
            <div className="min-w-0">
              <label htmlFor="responsible" className={labelCls}><UserRound className="h-3 w-3" /> Responsable</label>
              <input id="responsible" className={inputCls} placeholder="Ex : Maître de cérémonie" value={v.responsible} onChange={(e) => set({ responsible: e.target.value })} />
            </div>
            <div className="min-w-0">
              <label htmlFor="responsible_contact" className={labelCls}><Phone className="h-3 w-3" /> Contact</label>
              <input id="responsible_contact" type="tel" inputMode="tel" className={inputCls} placeholder="07 00 00 00 00" value={v.responsible_contact} onChange={(e) => set({ responsible_contact: e.target.value })} />
            </div>
          </div>

          <div>
            <label htmlFor="description" className={labelCls}>Notes pour l&apos;équipe</label>
            <textarea id="description" rows={3} className={`${inputCls} resize-none`} placeholder="Musique d'entrée, ordre du cortège, matériel…" value={v.description} onChange={(e) => set({ description: e.target.value })} />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition-colors hover:border-rose-200">
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-rose-500" checked={v.is_major_step} onChange={(e) => set({ is_major_step: e.target.checked })} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">Moment clé</span>
              <span className="block text-xs text-slate-500">Mis en avant et repris sur le déroulé des invités.</span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          {onDelete && (
            <button type="button" onClick={onDelete} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-rose-100 px-5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          )}
          <button type="submit" disabled={saving || endBeforeStart} className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Ajouter au déroulé'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');

function TemplateSheet({ marriage, existing, saving, onClose, onConfirm }: {
  marriage: Marriage;
  existing: PlanningEvent[];
  saving: boolean;
  onClose: () => void;
  onConfirm: (selected: TemplateMoment[]) => void;
}) {
  const [{ moments, fromStudio }] = useState(() => buildTemplate(marriage));
  const existingTitles = new Set(existing.map((e) => normalize(e.title)));
  // Les moments déjà présents dans le déroulé sont décochés
  const [picked, setPicked] = useState<Set<string>>(() => new Set(moments.filter((m) => !existingTitles.has(normalize(m.title))).map((m) => m.key)));
  const toggle = (key: string) => setPicked((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const selected = moments.filter((m) => picked.has(m.key));

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4 print:hidden">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-title"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]"
      >
        <div className="shrink-0 p-5 pb-3 sm:p-8 sm:pb-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-ink sm:right-5 sm:top-5"><X className="h-5 w-5" /></button>
          <h2 id="template-title" className="pr-10 font-display text-2xl text-ink">Une journée type</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            {fromStudio.length
              ? <>Heures reprises de votre Studio ({fromStudio.join(', ')}). Décochez ce qui ne vous concerne pas : tout reste modifiable ensuite.</>
              : <>Heures indicatives : renseignez vos cérémonies dans le <Link href="/dashboard/studio" className="font-semibold text-rose-600 underline-offset-4 hover:underline">Studio</Link> pour un modèle calé sur votre journée.</>}
          </p>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto border-y border-slate-100 px-3 py-2 sm:px-6">
          {moments.map((m) => {
            const on = picked.has(m.key);
            const already = existingTitles.has(normalize(m.title));
            return (
              <li key={m.key}>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50 ${on ? '' : 'opacity-60'}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(m.key)} />
                  <span aria-hidden className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300'}`}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                  <span className="w-[4.75rem] shrink-0 pt-px text-sm font-bold tabular-nums text-ink">{timeRange({ start_time: m.start_time, end_time: m.end_time })}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-1.5 text-sm font-semibold text-ink">
                      {m.title}
                      {m.is_major_step && <Star className="h-3 w-3 fill-rose-400 text-rose-400" aria-label="Moment clé" />}
                    </span>
                    {(m.location || m.responsible) && (
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{[m.location, m.responsible].filter(Boolean).join(' · ')}</span>
                    )}
                    {m.dayNote && <span className="mt-0.5 block text-xs font-semibold text-rose-600">{`Le ${m.dayNote.replace('⚠️ ', '').replace(/^./, (c) => c.toLowerCase())}`}</span>}
                    {already && <span className="mt-0.5 block text-xs text-amber-700">Déjà dans votre déroulé</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="shrink-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-5">
          <button
            onClick={() => onConfirm(selected)}
            disabled={saving || !selected.length}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {selected.length ? `Ajouter ${selected.length} moment${selected.length > 1 ? 's' : ''} au déroulé` : 'Aucun moment sélectionné'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
