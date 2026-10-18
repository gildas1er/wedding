"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { taskState, type Task } from '../../lib/checklist';
import { useRouter } from 'next/navigation';
import PricingModal from '@/components/dashboard/PricingModal';
import WelcomeFlow from '@/components/dashboard/WelcomeFlow';
import JourneyCard, { type JourneyState } from '@/components/dashboard/JourneyCard';
import { daysUntil } from '../../lib/planning';
import { isFirstPurchase } from '../../lib/launch-offer';
import { 
  Heart, Users, Banknote, Calendar, LogOut, 
  MessageSquare, Settings, ChevronRight,
  LayoutDashboard, CheckCircle2, Clock, 
  ClipboardList, Utensils, Send, XCircle,
  TrendingUp, AlertCircle, MapPin, Sparkles,
  ArrowRight, Crown, ShieldCheck, Zap
} from 'lucide-react';
import { forgetMarriage, getSessionUser, loadMarriage } from '../../lib/current-marriage';

// --- NOUVEAU : MODALE DE CÉLÉBRATION (GAMIFICATION) ---
function MilestoneCelebration({ title, message, onConfirm }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] p-10 max-w-sm w-full text-center shadow-2xl relative"
      >
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-emerald-500 rounded-3xl rotate-12 flex items-center justify-center shadow-xl shadow-emerald-200">
          <Sparkles size={40} className="text-white" />
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mt-6 mb-2">Félicitations !</h3>
        <h2 className="text-2xl font-normal text-slate-900 mb-4">{title}</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">{message}</p>
        <button onClick={onConfirm} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors">
          Continuer l'aventure
        </button>
      </motion.div>
    </motion.div>
  );
}

// --- DASHBOARD PRINCIPAL ---
export default function WeddingDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [needsIdentity, setNeedsIdentity] = useState(false);
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showPricing, setShowPricing] = useState(false);
  const [celebration, setCelebration] = useState<any>(null);
  
  const [marriage, setMarriage] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currency, setCurrency] = useState('FCFA');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [guestStats, setGuestStats] = useState({ total: 0, confirmed: 0, pending: 0, declined: 0, totalPersons: 0 });
  const [budgetStats, setBudgetStats] = useState({ totalActual: 0, totalPaid: 0, percentage: 0 });
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, urgent: 0, percentage: 0 });
  
  const EXCHANGE_RATES: { [key: string]: number } = { FCFA: 1, EUR: 0.0015, USD: 0.0016 };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const { data: { user } } = await getSessionUser();
        if (!user) { router.push('/login'); return; }
        setProfile(user.user_metadata);

        const { data: marriageData } = await loadMarriage(user.id);
        if (!marriageData) { setLoading(false); return; }
        setMarriage(marriageData);

        // Invités, budget et tâches lus en même temps
        const [{ data: guests }, { data: budgetItems }, { data: tasks }] = await Promise.all([
          supabase.from('invite').select('status, guests_count, invitation_sent').eq('marriage_id', marriageData.id),
          supabase.from('budget_items').select('amount_actual, amount_paid').eq('marriage_id', marriageData.id),
          supabase.from('tasks').select('is_completed, due_months_before').eq('marriage_id', marriageData.id),
        ]);
        const stats = (guests || []).reduce((acc, curr) => {
          acc.total += 1; acc.totalPersons += (curr.guests_count || 1);
          if (curr.status === 'confirmé') acc.confirmed += 1;
          if (curr.status === 'en_attente') acc.pending += 1;
          if (curr.status === 'décliné') acc.declined += 1;
          return acc;
        }, { total: 0, confirmed: 0, pending: 0, declined: 0, totalPersons: 0 });
        setGuestStats(stats);

        // Bienvenue : une seule fois (migration 26). Sans la colonne, ancienne règle : liste vide, mémorisée dans le navigateur
        let welcomeDone = false;
        try { welcomeDone = localStorage.getItem(`ws-welcome-${marriageData.id}-done`) === '1'; } catch { /* navigation privée */ }
        const notYetWelcomed = 'onboarded_at' in marriageData ? !marriageData.onboarded_at : stats.total === 0;
        const days = daysUntil(marriageData.wedding_date);
        if (!welcomeDone && notYetWelcomed && (days === null || days >= 0)) {
          // Inscription Google / Facebook : prénoms provisoires et pas de date choisie
          const meta = user.user_metadata ?? {};
          const placeholder = (v?: string | null) => !v?.trim() || /^partenaire [12]$/i.test(v.trim());
          setNeedsIdentity(!meta.wedding_date || placeholder(marriageData.partner_1_name) || placeholder(marriageData.partner_2_name));
          setShowWelcome(true);
        }
        setJourney({
          templateChosen: Boolean(marriageData.onboarded_at) || (marriageData.invitation_template ?? 'classique') !== 'classique',
          firstSent: (guests || []).some((g) => g.invitation_sent),
          guests: stats.total,
          firstAnswer: stats.confirmed + stats.declined > 0,
          cover: Boolean(marriageData.bg_image_url),
        });

        let actual = 0; let paid = 0;
        if (budgetItems) {
          actual = budgetItems.reduce((acc, curr) => acc + (curr.amount_actual || 0), 0);
          paid = budgetItems.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
          const pct = actual > 0 ? Math.round((paid / actual) * 100) : 0;
          setBudgetStats({ totalActual: actual, totalPaid: paid, percentage: pct });
          if (pct >= 50 && pct < 55) {
            setCelebration({ title: "Moitié du budget !", message: "Vous gérez vos finances comme des chefs. La sérénité est à portée de main." });
          }
        }

        let totalTasks = 0;
        if (tasks) {
          totalTasks = tasks.length;
          const completed = tasks.filter(t => t.is_completed).length;
          const urgent = tasks.filter(t => taskState(t as Task, marriageData.wedding_date) === 'late').length;
          setTaskStats({ total: totalTasks, completed, urgent, percentage: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0 });
        }

      } catch (error) { console.error("Erreur Dashboard:", error); } finally { setLoading(false); }
    };
    initializeDashboard();
  }, [router, reloadKey]);

  useEffect(() => {
    if (!marriage?.wedding_date) return;
    const interval = setInterval(() => {
      const diff = new Date(marriage.wedding_date).getTime() - new Date().getTime();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)), hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60), seconds: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [marriage?.wedding_date]);

  const formatPrice = (amount: number) => {
    const converted = amount * EXCHANGE_RATES[currency];
    return new Intl.NumberFormat('fr-FR').format(converted) + ' ' + (currency === 'FCFA' ? 'FCFA' : currency === 'EUR' ? '€' : '$');
  };

  const handleDateChange = async (newDate: string) => {
    if (!marriage) return;
    const { error } = await supabase.from('marriages').update({ wedding_date: newDate }).eq('id', marriage.id);
    if (!error) setMarriage({ ...marriage, wedding_date: newDate });
  };

  const handleCloseWelcome = (changed: boolean) => {
    setShowWelcome(false);
    setJourney((j) => (j ? { ...j, templateChosen: true } : j));
    if (changed) { forgetMarriage(); setReloadKey((k) => k + 1); }
  };

  if (loading) return (<div className="h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" /></div> );

  return (
    <div className="min-h-screen bg-ivory text-ink">
      
      <AnimatePresence>
        {celebration && <MilestoneCelebration title={celebration.title} message={celebration.message} onConfirm={() => setCelebration(null)} />}
        {showPricing && <PricingModal onClose={() => setShowPricing(false)} allowLaunch={isFirstPurchase(marriage)} marriageId={marriage?.id} />}
      </AnimatePresence>


      <AnimatePresence>
        {showWelcome && marriage && <WelcomeFlow marriage={marriage} needsIdentity={needsIdentity} onFinish={handleCloseWelcome} />}
      </AnimatePresence>


      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        {/* EN-TÊTE */}
        <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 animate-fade-up">
            <p className="eyebrow">Tableau de bord</p>
            <h1 className="mt-2 text-3xl leading-tight text-ink sm:text-4xl">
              Bonjour {marriage?.partner_1_name}<span className="text-rose-500">,</span>
            </h1>
            <p className="mt-1 text-slate-500">Voici où en est votre mariage aujourd&apos;hui.</p>
          </div>
          <label className="flex h-fit w-fit cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition-colors hover:border-amber-300">
            <Calendar size={16} className="text-amber-600" strokeWidth={1.8} />
            <span className="sr-only">Date du mariage</span>
            <input type="date" value={marriage?.wedding_date || ""} onChange={(e) => handleDateChange(e.target.value)} className="cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none" />
          </label>
        </header>

        {journey && !showWelcome && <JourneyCard state={journey} />}

        {/* HÉRO — COUPLE & COMPTE À REBOURS */}
        <section className="relative mb-8 overflow-hidden rounded-[1.75rem] bg-ink shadow-xl sm:mb-10">
          {/* Photo de couverture du couple (studio), sinon image par défaut */}
          <img
            src={marriage?.bg_image_url || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1600"}
            style={{ objectPosition: (marriage?.bg_image_url && marriage?.bg_image_position) || 'center' }}
            className="absolute inset-0 h-full w-full object-cover opacity-60"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />
          <div className="relative flex min-h-[340px] flex-col justify-between gap-10 p-6 text-white sm:min-h-[380px] sm:p-10 lg:p-12">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300">
                {marriage?.wedding_date
                  ? new Date(marriage.wedding_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Date à définir'}
              </p>
              <h2 className="mt-3 break-words text-4xl font-normal leading-[1.05] sm:text-6xl lg:text-7xl">
                {marriage?.partner_1_name} <span className="font-light italic text-amber-300">&amp;</span> {marriage?.partner_2_name}
              </h2>
            </motion.div>

            <div>
              <div className="gold-rule mb-5 max-w-xl opacity-60" />
              <div className="grid max-w-xl grid-cols-4 gap-2">
                <TimeBlock value={timeLeft.days} label="Jours" />
                <TimeBlock value={timeLeft.hours} label="Heures" />
                <TimeBlock value={timeLeft.minutes} label="Minutes" />
                <TimeBlock value={timeLeft.seconds} label="Secondes" />
              </div>
            </div>
          </div>
        </section>

        {/* INVITÉS */}
        <section className="mb-8 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:mb-10 sm:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Réponses des invités</p>
              <p className="mt-1 font-display text-3xl text-ink">
                {guestStats.totalPersons} <span className="text-lg text-slate-400">personnes invitées</span>
              </p>
            </div>
            <button onClick={() => router.push('/dashboard/invite')} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700">
              Gérer la liste <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <RsvpBar confirmed={guestStats.confirmed} pending={guestStats.pending} declined={guestStats.declined} />
          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCard title="Confirmés" value={guestStats.confirmed} dot="bg-emerald-500" />
            <StatCard title="En attente" value={guestStats.pending} dot="bg-amber-400" />
            <StatCard title="Déclinés" value={guestStats.declined} dot="bg-rose-400" />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 sm:gap-8">
          {/* BUDGET */}
          <div className="flex flex-col justify-between rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
            <div>
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Budget</p>
                  <p className="mt-2 font-display text-3xl text-ink sm:text-4xl">{formatPrice(budgetStats.totalPaid)}</p>
                  <p className="mt-1 text-sm text-slate-500">réglés sur {formatPrice(budgetStats.totalActual)}</p>
                </div>
                <div className="flex rounded-full border border-slate-200 bg-ivory p-0.5">
                  {['FCFA', 'EUR', 'USD'].map((c) => (
                    <button key={c} onClick={() => setCurrency(c)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${currency === c ? 'bg-white text-ink shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="mb-2 flex justify-between text-xs font-medium text-slate-500"><span>Progression des règlements</span><span className="text-ink">{budgetStats.percentage}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div initial={{ width: 0 }} animate={{ width: `${budgetStats.percentage}%` }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" />
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/budget')} className="group mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700">
              Voir le budget <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* CHECKLIST */}
          <div className="flex flex-col justify-between rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">Checklist</p>
              {taskStats.urgent > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-100">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" /> {taskStats.urgent} en retard
                </span>
              )}
            </div>
            <div className="flex items-center gap-6 py-4 sm:gap-8">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center sm:h-32 sm:w-32">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                  <motion.circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="364.4" initial={{ strokeDashoffset: 364.4 }} animate={{ strokeDashoffset: 364.4 - (364.4 * taskStats.percentage) / 100 }} transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }} className="text-rose-500" strokeLinecap="round" />
                </svg>
                <span className="absolute font-display text-3xl text-ink">{taskStats.percentage}<span className="text-lg text-slate-400">%</span></span>
              </div>
              <div>
                <p className="font-display text-3xl text-ink">{taskStats.completed}<span className="text-slate-300"> / </span>{taskStats.total}</p>
                <p className="mt-1 text-sm text-slate-500">tâches accomplies</p>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/tasks')} className="group mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink">
              Ouvrir la checklist <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-l border-white/15 pl-3 first:border-l-0 first:pl-0 sm:pl-5">
      <p className="font-display text-3xl tabular-nums leading-none sm:text-5xl">{String(value).padStart(2, '0')}</p>
      <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/55 sm:text-[11px]">{label}</p>
    </div>
  );
}

function RsvpBar({ confirmed, pending, declined }: { confirmed: number; pending: number; declined: number }) {
  const total = confirmed + pending + declined;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${confirmed} confirmés, ${pending} en attente, ${declined} déclinés`}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct(confirmed)}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="bg-emerald-500" />
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct(pending)}%` }} transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="bg-amber-400" />
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct(declined)}%` }} transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} className="bg-rose-400" />
    </div>
  );
}

function StatCard({ title, value, dot }: { title: string; value: number; dot: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-ivory px-3 py-3 sm:px-4">
      <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-slate-500 sm:gap-2 sm:text-xs"><span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />{title}</p>
      <p className="mt-1 font-display text-2xl text-ink sm:text-3xl">{value}</p>
    </div>
  );
}
