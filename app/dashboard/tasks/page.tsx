"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Plus, Search, X, Save, Trash2, Loader2, AlertCircle, Check, Flag, UserRound,
  StickyNote, ArrowRight, Sparkles, ClipboardList, Pencil, CalendarClock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { isMissingColumnError } from '../../../lib/planning';
import {
  ASSIGNEES, CATEGORIES, DUE_OPTIONS, PERIODS, PRIORITIES, TASK_EXTRA_FIELDS, TEMPLATE_TASKS,
  deadline, dueLabel, formatDeadline, normalizeTitle, periodOf, taskLink, taskState,
  type Task, type TaskState, type TemplateTask,
} from '../../../lib/checklist';

type Marriage = { id: string; wedding_date?: string | null };
type Filter = 'todo' | 'late' | 'done' | 'all';

type TaskForm = { title: string; category: string; priority: string; due_months_before: number; assigned_to: string; notes: string };
const EMPTY_FORM: TaskForm = { title: '', category: 'Général', priority: 'moyenne', due_months_before: 6, assigned_to: '', notes: '' };

const stripExtras = (row: Record<string, unknown>) => { const b = { ...row }; TASK_EXTRA_FIELDS.forEach((k) => delete b[k]); return b; };

export default function TasksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [marriage, setMarriage] = useState<Marriage | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('todo');
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<{ id: string | null; values: TaskForm } | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { confirm, notify } = useConfirm();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: m } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
    setMarriage(m);
    if (m) {
      const { data, error: err } = await supabase.from('tasks').select('*').eq('marriage_id', m.id).order('created_at', { ascending: true });
      if (err) setError('Impossible de charger la checklist. Vérifiez votre connexion.');
      else setTasks(data ?? []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const wedding = marriage?.wedding_date;
  const states = useMemo(() => new Map(tasks.map((t) => [t.id, taskState(t, wedding)])), [tasks, wedding]);
  const count = (s: TaskState) => tasks.filter((t) => states.get(t.id) === s).length;
  const done = count('done');
  const late = count('late');
  const soon = count('soon');
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const visible = tasks.filter((t) => {
    const s = states.get(t.id);
    if (filter === 'todo' && s === 'done') return false;
    if (filter === 'late' && s !== 'late') return false;
    if (filter === 'done' && s !== 'done') return false;
    if (category && (t.category ?? 'Général') !== category) return false;
    if (query && !normalizeTitle(`${t.title} ${t.notes ?? ''} ${t.assigned_to ?? ''}`).includes(normalizeTitle(query))) return false;
    return true;
  });

  // Regroupement par période (du plus lointain au plus proche du mariage)
  const groups = PERIODS.map((p) => ({
    period: p,
    items: visible
      .filter((t) => periodOf(t.due_months_before ?? 0).id === p.id)
      .sort((a, b) => (b.due_months_before ?? 0) - (a.due_months_before ?? 0) || Number(a.is_completed) - Number(b.is_completed)),
    all: tasks.filter((t) => periodOf(t.due_months_before ?? 0).id === p.id),
  })).filter((g) => g.items.length);

  const usedCategories = CATEGORIES.filter((c) => tasks.some((t) => (t.category ?? 'Général') === c));

  // --- Écritures ---
  const toggle = async (task: Task) => {
    const next = !task.is_completed;
    const completed_at = next ? new Date().toISOString() : null;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_completed: next, completed_at } : t)));
    let { error: err } = await supabase.from('tasks').update({ is_completed: next, completed_at }).eq('id', task.id);
    if (err && isMissingColumnError(err)) ({ error: err } = await supabase.from('tasks').update({ is_completed: next }).eq('id', task.id));
    if (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      setError("La tâche n'a pas pu être mise à jour. Réessayez.");
      return;
    }
    if (next && done + 1 === tasks.length) confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
  };

  const openAdd = () => setEditor({ id: null, values: { ...EMPTY_FORM, category: category ?? 'Général' } });
  const openEdit = (t: Task) => setEditor({
    id: t.id,
    values: {
      title: t.title, category: t.category ?? 'Général', priority: t.priority ?? 'moyenne',
      due_months_before: t.due_months_before ?? 0, assigned_to: t.assigned_to ?? '', notes: t.notes ?? '',
    },
  });

  const save = async (v: TaskForm) => {
    if (!marriage || !editor) return;
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      title: v.title.trim(), category: v.category, priority: v.priority, due_months_before: v.due_months_before,
      assigned_to: v.assigned_to.trim() || null, notes: v.notes.trim() || null,
    };
    const write = (body: Record<string, unknown>) => editor.id
      ? supabase.from('tasks').update(body).eq('id', editor.id).select().single()
      : supabase.from('tasks').insert([{ ...body, marriage_id: marriage.id }]).select().single();
    let { data, error: err } = await write(payload);
    if (err && isMissingColumnError(err)) {
      ({ data, error: err } = await write(stripExtras(payload)));
      if (!err) setNotice("Tâche enregistrée, sans les notes ni la personne en charge : la base doit être mise à jour (migration 9).");
    }
    setSaving(false);
    if (err || !data) { setError("L'enregistrement a échoué. Vérifiez votre connexion puis réessayez."); return; }
    setTasks((prev) => (editor.id ? prev.map((t) => (t.id === editor.id ? data : t)) : [...prev, data]));
    setEditor(null);
  };

  const remove = async (task: Task) => {
    if (!(await confirm({ title: 'Supprimer cette tâche ?', item: task.title, message: 'Elle disparaîtra de votre checklist.' }))) return;
    const { error: err } = await supabase.from('tasks').delete().eq('id', task.id);
    if (err) { notify('La suppression a échoué. Réessayez.', 'error'); return; }
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setEditor(null);
    notify('Tâche supprimée');
  };

  const addFromTemplate = async (selected: TemplateTask[]) => {
    if (!marriage || !selected.length) return;
    setSaving(true);
    setError(null);
    const rows = selected.map(({ title, category: c, priority, due_months_before, notes }) =>
      ({ marriage_id: marriage.id, title, category: c, priority, due_months_before, is_completed: false, notes: notes ?? null }) as Record<string, unknown>);
    let { data, error: err } = await supabase.from('tasks').insert(rows).select();
    if (err && isMissingColumnError(err)) {
      ({ data, error: err } = await supabase.from('tasks').insert(rows.map(stripExtras)).select());
      if (!err) setNotice('Tâches ajoutées, sans leurs notes : la base doit être mise à jour (migration 9).');
    }
    setSaving(false);
    if (err || !data) { setError("La liste type n'a pas pu être ajoutée. Réessayez."); return; }
    setTasks((prev) => [...prev, ...data]);
    setTemplateOpen(false);
    setFilter('todo');
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>;

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: 'todo', label: 'À faire', n: tasks.length - done },
    { id: 'late', label: 'En retard', n: late },
    { id: 'done', label: 'Terminées', n: done },
    { id: 'all', label: 'Toutes', n: tasks.length },
  ];

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-8 sm:py-10 lg:py-12">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Organisation</p>
            <h1 className="mt-2 text-3xl font-normal text-ink sm:text-4xl">Votre <span className="italic text-rose-500">checklist</span></h1>
          </div>
          <button onClick={openAdd} className="hidden min-h-[44px] items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 lg:inline-flex">
            <Plus className="h-4 w-4" /> Ajouter une tâche
          </button>
        </header>

        <AnimatePresence>
          {error && <Alert tone="error" onClose={() => setError(null)}>{error}</Alert>}
          {notice && <Alert tone="info" onClose={() => setNotice(null)}>{notice}</Alert>}
        </AnimatePresence>

        {tasks.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <ClipboardList className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="font-display text-xl text-ink">Rien ne sera oublié</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Partez de notre checklist type ({TEMPLATE_TASKS.length} tâches, de la dot au Jour J), classée selon votre date de mariage. Vous pourrez tout modifier.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <button onClick={() => setTemplateOpen(true)} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700">
                <Sparkles className="h-4 w-4 text-amber-300" /> Utiliser la checklist type
              </button>
              <button onClick={openAdd} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-ink hover:border-rose-200">
                <Plus className="h-4 w-4" /> Ajouter une tâche
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Progression */}
            <section className="mb-6 flex flex-col gap-5 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
              <div className="flex items-center gap-4">
                <ProgressRing pct={pct} />
                <div>
                  <p className="font-display text-2xl text-ink">{done} / {tasks.length}</p>
                  <p className="text-sm text-slate-500">{tasks.length > 1 ? 'tâches terminées' : 'tâche terminée'}</p>
                </div>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2 sm:ml-auto sm:max-w-sm">
                <button onClick={() => setFilter('late')} className={`rounded-xl p-3 text-left ring-1 transition-colors ${late ? 'bg-rose-50 ring-rose-200 hover:bg-rose-100' : 'bg-slate-50 ring-slate-200'}`}>
                  <p className={`font-display text-2xl ${late ? 'text-rose-600' : 'text-slate-400'}`}>{late}</p>
                  <p className="text-xs font-semibold text-slate-600">en retard</p>
                </button>
                <div className={`rounded-xl p-3 ring-1 ${soon ? 'bg-amber-50 ring-amber-200' : 'bg-slate-50 ring-slate-200'}`}>
                  <p className={`font-display text-2xl ${soon ? 'text-amber-700' : 'text-slate-400'}`}>{soon}</p>
                  <p className="text-xs font-semibold text-slate-600">dans les 30 jours</p>
                </div>
              </div>
            </section>

            {/* Filtres */}
            <div className="mb-5 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div role="tablist" aria-label="Filtrer les tâches" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 [scrollbar-width:none]">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      role="tab"
                      aria-selected={filter === f.id}
                      onClick={() => setFilter(f.id)}
                      className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${filter === f.id ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-ink'}`}
                    >
                      {f.label}
                      <span className={`rounded-full px-1.5 text-xs ${filter === f.id ? 'bg-white/20' : f.id === 'late' && f.n ? 'bg-rose-100 text-rose-700' : 'bg-slate-100'}`}>{f.n}</span>
                    </button>
                  ))}
                </div>
                <label className="relative min-w-0 sm:ml-auto sm:w-56">
                  <span className="sr-only">Rechercher une tâche</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="min-h-[40px] w-full rounded-full border border-slate-200 bg-white pl-9 pr-9 text-base outline-none focus:border-rose-300 sm:text-sm" />
                  {query && <button onClick={() => setQuery('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:text-ink"><X className="h-4 w-4" /></button>}
                </label>
              </div>
              {usedCategories.length > 1 && (
                <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]">
                  <CategoryChip active={!category} onClick={() => setCategory(null)}>Toutes catégories</CategoryChip>
                  {usedCategories.map((c) => <CategoryChip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>{c}</CategoryChip>)}
                </div>
              )}
            </div>

            {/* Liste par période */}
            {groups.length === 0 ? (
              <div className="rounded-[1.5rem] bg-white px-6 py-12 text-center ring-1 ring-slate-200/80">
                {filter === 'late' && !query && !category
                  ? <><Check className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-3 font-semibold text-ink">Aucune tâche en retard, bravo !</p></>
                  : filter === 'todo' && !query && !category
                    ? <><Sparkles className="mx-auto h-8 w-8 text-amber-500" /><p className="mt-3 font-semibold text-ink">Tout est fait. Il ne reste qu&apos;à profiter !</p></>
                    : <p className="text-slate-500">Aucune tâche ne correspond.</p>}
              </div>
            ) : (
              <div className="space-y-7">
                {groups.map(({ period, items, all }) => {
                  const groupDone = all.filter((t) => t.is_completed).length;
                  const end = deadline(wedding, Math.max(0, Number.isFinite(period.min) ? period.min : 0));
                  return (
                    <section key={period.id} aria-labelledby={`h-${period.id}`}>
                      <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
                        <h2 id={`h-${period.id}`} className="font-display text-lg text-ink sm:text-xl">{period.label}</h2>
                        <p className="shrink-0 text-xs font-semibold text-slate-500">
                          {groupDone}/{all.length}
                          {end && <span className="hidden sm:inline"> · avant le {formatDeadline(end)}</span>}
                        </p>
                      </div>
                      <ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.25rem] bg-white shadow-sm ring-1 ring-slate-200/80">
                        <AnimatePresence initial={false}>
                          {items.map((t) => (
                            <TaskRow key={t.id} task={t} state={states.get(t.id) ?? 'later'} wedding={wedding} onToggle={() => toggle(t)} onEdit={() => openEdit(t)} onDelete={() => remove(t)} />
                          ))}
                        </AnimatePresence>
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}

            <div className="mt-8 text-center">
              <button onClick={() => setTemplateOpen(true)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                <Sparkles className="h-4 w-4" /> Compléter avec la checklist type
              </button>
            </div>
          </>
        )}
      </main>

      <button
        onClick={openAdd}
        aria-label="Ajouter une tâche"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/30 transition-transform active:scale-95 lg:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {editor && (
          <TaskModal
            key={editor.id ?? 'new'}
            isEdit={Boolean(editor.id)}
            initial={editor.values}
            wedding={wedding}
            saving={saving}
            onClose={() => setEditor(null)}
            onSave={save}
            onDelete={editor.id ? () => { const t = tasks.find((x) => x.id === editor.id); if (t) remove(t); } : undefined}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {templateOpen && <TemplateSheet existing={tasks} wedding={wedding} saving={saving} onClose={() => setTemplateOpen(false)} onConfirm={addFromTemplate} />}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------

function Alert({ tone, onClose, children }: { tone: 'error' | 'info'; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-5 flex items-start gap-3 rounded-2xl p-4 text-sm ring-1 ${tone === 'error' ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200'}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span className="flex-1">{children}</span>
      <button onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></button>
    </motion.div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-slate-100" />
        <motion.circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-emerald-500"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 0.8 }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold text-ink">{pct}%</span>
    </div>
  );
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`min-h-[34px] shrink-0 rounded-full px-3 text-xs font-semibold transition-colors ${active ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-ink'}`}>
      {children}
    </button>
  );
}

function TaskRow({ task, state, wedding, onToggle, onEdit, onDelete }: {
  task: Task; state: TaskState; wedding?: string | null;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const done = state === 'done';
  const d = deadline(wedding, task.due_months_before ?? 0);
  const link = taskLink(task.title);
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className={`group flex items-start gap-2 p-3 sm:gap-3 sm:p-4 ${done ? 'bg-slate-50/60' : ''}`}>
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Marquer « ${task.title} » comme à faire` : `Marquer « ${task.title} » comme terminée`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
      >
        <span className={`grid h-6 w-6 place-items-center rounded-full border-2 transition-colors ${done ? 'border-emerald-500 bg-emerald-500 text-white' : state === 'late' ? 'border-rose-400 group-hover:bg-rose-50' : 'border-slate-300 group-hover:border-rose-400'}`}>
          {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </button>

      <button onClick={onEdit} className="min-w-0 flex-1 py-2 text-left">
        <p className={`flex flex-wrap items-center gap-x-2 break-words text-[15px] font-semibold leading-snug ${done ? 'text-slate-400 line-through' : 'text-ink'}`}>
          {task.priority === 'haute' && !done && <Flag className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500" aria-label="Priorité haute" />}
          {task.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {state === 'late' && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700">En retard</span>}
          {state === 'soon' && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">Ce mois-ci</span>}
          {d && !done && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> avant le {formatDeadline(d)}</span>}
          {done && task.completed_at && <span>Fait le {formatDeadline(new Date(task.completed_at))}</span>}
          <span>{task.category ?? 'Général'}</span>
          {task.assigned_to && <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" /> {task.assigned_to}</span>}
        </p>
        {task.notes && !done && <p className="mt-1 flex items-start gap-1 text-xs text-slate-500"><StickyNote className="mt-px h-3 w-3 shrink-0" /><span className="line-clamp-2">{task.notes}</span></p>}
      </button>

      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
        {link && !done && (
          <Link href={link.href} className="inline-flex min-h-[36px] items-center gap-1 whitespace-nowrap rounded-lg px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">
            {link.label} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        <div className="hidden sm:flex">
          <button onClick={onEdit} aria-label={`Modifier ${task.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-ink lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"><Pencil className="h-4 w-4" /></button>
          <button onClick={onDelete} aria-label={`Supprimer ${task.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </motion.li>
  );
}

const labelCls = 'mb-1.5 ml-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500';
const inputCls = 'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:border-rose-300 focus:ring-2 focus:ring-rose-100 sm:text-sm';

function Sheet({ labelledBy, onClose, children, footer }: { labelledBy: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4">
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[1.75rem] bg-white shadow-2xl sm:rounded-[1.75rem]"
      >
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-ink sm:right-5 sm:top-5"><X className="h-5 w-5" /></button>
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        {children}
        {footer}
      </motion.div>
    </div>
  );
}

function TaskModal({ isEdit, initial, wedding, saving, onClose, onSave, onDelete }: {
  isEdit: boolean; initial: TaskForm; wedding?: string | null; saving: boolean;
  onClose: () => void; onSave: (v: TaskForm) => void; onDelete?: () => void;
}) {
  const [v, setV] = useState<TaskForm>(initial);
  const set = (patch: Partial<TaskForm>) => setV((prev) => ({ ...prev, ...patch }));
  const dueOptions = DUE_OPTIONS.includes(v.due_months_before) ? DUE_OPTIONS : [...DUE_OPTIONS, v.due_months_before].sort((a, b) => b - a);
  const d = deadline(wedding, v.due_months_before);

  return (
    <Sheet labelledBy="task-title" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(v); }} className="overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-8">
        <h2 id="task-title" className="mb-6 pr-10 font-display text-2xl text-ink">{isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="t-title" className={labelCls}>Tâche *</label>
            <input id="t-title" required autoFocus={!isEdit} className={inputCls} placeholder="Ex : Réserver le photographe" value={v.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="t-category" className={labelCls}>Catégorie</label>
              <select id="t-category" className={inputCls} value={v.category} onChange={(e) => set({ category: e.target.value })}>
                {(CATEGORIES as readonly string[]).includes(v.category) ? null : <option value={v.category}>{v.category}</option>}
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="t-due" className={labelCls}>Échéance</label>
              <select id="t-due" className={inputCls} value={v.due_months_before} onChange={(e) => set({ due_months_before: Number(e.target.value) })}>
                {dueOptions.map((m) => <option key={m} value={m}>{dueLabel(m)}</option>)}
              </select>
              {d && <p className="ml-1 mt-1 text-xs text-slate-500">À faire avant le {formatDeadline(d)}</p>}
            </div>
          </div>
          <div>
            <span className={labelCls}><Flag className="h-3 w-3" /> Priorité</span>
            <div role="radiogroup" aria-label="Priorité" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {PRIORITIES.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={v.priority === p.id} onClick={() => set({ priority: p.id })}
                  className={`min-h-[40px] rounded-lg text-sm font-semibold transition-colors ${v.priority === p.id ? (p.id === 'haute' ? 'bg-rose-500 text-white' : 'bg-white text-ink shadow-sm') : 'text-slate-500 hover:text-ink'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="t-assigned" className={labelCls}><UserRound className="h-3 w-3" /> Qui s&apos;en charge ?</label>
            <input id="t-assigned" list="assignees" className={inputCls} placeholder="Ex : La famille" value={v.assigned_to} onChange={(e) => set({ assigned_to: e.target.value })} />
            <datalist id="assignees">{ASSIGNEES.map((a) => <option key={a} value={a} />)}</datalist>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ASSIGNEES.slice(0, 5).map((a) => (
                <button key={a} type="button" onClick={() => set({ assigned_to: v.assigned_to === a ? '' : a })}
                  className={`min-h-[32px] rounded-full px-3 text-xs font-semibold transition-colors ${v.assigned_to === a ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600 hover:text-ink'}`}>{a}</button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="t-notes" className={labelCls}><StickyNote className="h-3 w-3" /> Notes</label>
            <textarea id="t-notes" rows={3} className={`${inputCls} resize-none`} placeholder="Contacts, prix, pièces à fournir…" value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          {onDelete && (
            <button type="button" onClick={onDelete} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-rose-100 px-5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          )}
          <button type="submit" disabled={saving} className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Ajouter la tâche'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function TemplateSheet({ existing, wedding, saving, onClose, onConfirm }: {
  existing: Task[]; wedding?: string | null; saving: boolean;
  onClose: () => void; onConfirm: (selected: TemplateTask[]) => void;
}) {
  const existingTitles = useMemo(() => new Set(existing.map((t) => normalizeTitle(t.title))), [existing]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(TEMPLATE_TASKS.filter((t) => !existingTitles.has(normalizeTitle(t.title))).map((t) => t.key)));
  const toggle = (key: string) => setPicked((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const selected = TEMPLATE_TASKS.filter((t) => picked.has(t.key));
  const today = new Date();

  return (
    <Sheet
      labelledBy="tpl-title"
      onClose={onClose}
      footer={(
        <div className="shrink-0 border-t border-slate-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-5">
          <button onClick={() => onConfirm(selected)} disabled={saving || !selected.length}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {selected.length ? `Ajouter ${selected.length} tâche${selected.length > 1 ? 's' : ''}` : 'Aucune tâche sélectionnée'}
          </button>
        </div>
      )}
    >
      <div className="shrink-0 px-5 pb-3 pt-3 sm:px-8 sm:pt-8">
        <h2 id="tpl-title" className="pr-10 font-display text-2xl text-ink">La checklist type</h2>
        <p className="mt-1.5 text-sm text-slate-600">Décochez ce qui ne vous concerne pas. Les échéances sont calculées selon votre date de mariage.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100 px-3 py-2 sm:px-6">
        {PERIODS.map((p) => {
          const items = TEMPLATE_TASKS.filter((t) => periodOf(t.due_months_before).id === p.id);
          if (!items.length) return null;
          return (
            <div key={p.id} className="py-2">
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">{p.label}</p>
              <ul>
                {items.map((t) => {
                  const on = picked.has(t.key);
                  const already = existingTitles.has(normalizeTitle(t.title));
                  const d = deadline(wedding, t.due_months_before);
                  return (
                    <li key={t.key}>
                      <label className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50 ${on ? '' : 'opacity-60'}`}>
                        <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(t.key)} />
                        <span aria-hidden className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300'}`}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">{t.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {t.category}{t.priority === 'haute' ? ' · priorité haute' : ''}
                            {d && d < today ? <span className="font-semibold text-rose-600"> · échéance dépassée</span> : null}
                          </span>
                          {already && <span className="mt-0.5 block text-xs text-amber-700">Déjà dans votre checklist</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
