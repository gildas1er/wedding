"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Heart, Users, Banknote, Calendar, LogOut, 
  MessageSquare, Settings, ChevronRight,
  LayoutDashboard, CheckCircle2, Clock, 
  ClipboardList, Utensils, Send, XCircle,
  TrendingUp, AlertCircle, MapPin, Sparkles,
  ArrowRight, Crown, ShieldCheck, Zap
} from 'lucide-react';

// --- NOUVEAU : MODALE PAYWALL DE VOLUME ---
function VolumePaywall({ currentCount, onUpgrade, onClose }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center shadow-2xl border border-rose-100"
      >
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Users size={40} />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 mb-2">Limite atteinte ! 🛑</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Vous avez ajouté vos <span className="font-bold text-slate-900">{currentCount} invités</span> gratuits. 
          Pour débloquer la liste illimitée et la gestion des tables, passez à la version Premium.
        </p>

        <div className="space-y-3">
          <button 
            onClick={onUpgrade}
            className="w-full py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
          >
            Débloquer l'illimité <Crown size={14} />
          </button>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            Gérer mes {currentCount} invités
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- NOUVEAU : MODALE DE CÉLÉBRATION (GAMIFICATION) ---
function MilestoneCelebration({ title, message, onConfirm }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl relative"
      >
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-emerald-500 rounded-3xl rotate-12 flex items-center justify-center shadow-xl shadow-emerald-200">
          <Sparkles size={40} className="text-white" />
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mt-6 mb-2">Félicitations !</h3>
        <h2 className="text-2xl font-black text-slate-900 mb-4">{title}</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">{message}</p>
        <button onClick={onConfirm} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors">
          Continuer l'aventure
        </button>
      </motion.div>
    </motion.div>
  );
}

// --- NOUVEAU : MODALE DE PAIEMENT (PRICING) ---
function PricingModal({ onClose }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
    >
      <motion.div className="bg-white rounded-[3rem] max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row">
        <div className="p-12 flex-1">
          <h2 className="text-3xl font-black text-slate-900 mb-2">Passez au Premium 👑</h2>
          <p className="text-slate-500 mb-8 font-medium">Tout ce dont vous avez besoin pour un mariage sans stress.</p>
          <div className="space-y-4">
            <PricingFeature icon={Users} text="Invités illimités (Gratuit limité à 15)" />
            <PricingFeature icon={MapPin} text="Plan de table interactif" />
            <PricingFeature icon={Send} text="Relances RSVP automatiques" />
            <PricingFeature icon={Zap} text="Export PDF pour le traiteur" />
          </div>
        </div>
        <div className="bg-slate-50 p-12 w-full md:w-[350px] flex flex-col justify-center border-l border-slate-100">
          <div className="mb-8">
            <span className="text-4xl font-black text-slate-900">25.000</span>
            <span className="text-sm font-bold text-slate-400"> FCFA</span>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">Paiement unique - Accès à vie</p>
          </div>
          <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all mb-4">
            Débloquer maintenant
          </button>
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Plus tard</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PricingFeature({ icon: Icon, text }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon size={16} /></div>
      <span className="text-sm font-bold text-slate-700">{text}</span>
    </div>
  );
}

// --- COMPOSANT BULLE DE GUIDAGE ---
function GuidedTooltip({ title, desc, step, totalSteps, onNext, onSkip, targetRef }: any) {
  const [coords, setCoords] = useState({ top: 0, left: 0, arrowSide: 'left' });
  useEffect(() => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const isSidebar = rect.left < 100;
      if (isSidebar) { setCoords({ top: rect.top + (rect.height / 2) - 60, left: rect.right + 20, arrowSide: 'left' }); }
      else { setCoords({ top: rect.top - 160, left: rect.left + (rect.width / 2) - 140, arrowSide: 'bottom' }); }
    }
  }, [targetRef, step]);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ top: coords.top, left: coords.left }} className="fixed z-[110] bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl w-[280px]">
      {coords.arrowSide === 'left' ? ( <div className="absolute w-4 h-4 bg-slate-900 rotate-45 -left-2 top-10" /> ) : ( <div className="absolute w-4 h-4 bg-slate-900 rotate-45 -bottom-2 left-1/2 -translate-x-1/2" /> )}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Étape {step}/{totalSteps}</span>
        <button onClick={onSkip} className="text-[10px] text-slate-400 hover:text-white font-bold">Passer</button>
      </div>
      <h4 className="font-bold text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-300 leading-relaxed mb-4">{desc}</p>
      <button onClick={onNext} className="w-full py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-white/5">
        {step === totalSteps ? "C'est parti !" : "Suivant"} <ArrowRight size={12} />
      </button>
    </motion.div>
  );
}

// --- COMPOSANT DE BIENVENUE ---
function WelcomeModal({ partner1, partner2, onClose, onAction }: any) {
  const containerVariants = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { delayChildren: 0.2, staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="bg-white rounded-[3rem] p-8 lg:p-14 max-w-3xl w-full shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-100/50 rounded-full blur-3xl" />
        <div className="relative z-10 text-center">
          <motion.div variants={itemVariants} className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-3xl mb-8 shadow-lg shadow-rose-200"><Heart size={40} className="fill-white" /></motion.div>
          <motion.h2 variants={itemVariants} className="text-4xl font-black text-slate-900 mb-4">Vive les mariés ! 🥂</motion.h2>
          <motion.p variants={itemVariants} className="text-slate-500 text-lg font-medium mb-12 max-w-md mx-auto">Félicitations <span className="text-rose-500 font-bold">{partner1 || 'à vous'}</span> & <span className="text-rose-500 font-bold">{partner2 || 'votre moitié'}</span>. Votre voyage vers le "Oui" commence ici.</motion.p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <OnboardingCard icon={Users} title="Mes Invités" desc="Dressez votre liste d'honneur" color="rose" onClick={() => onAction('/dashboard/invite')} />
            <OnboardingCard icon={Banknote} title="Mon Budget" desc="Gardez l'esprit serein" color="emerald" onClick={() => onAction('/dashboard/budget')} />
            <OnboardingCard icon={ClipboardList} title="Mes Tâches" desc="Rien ne sera oublié" color="indigo" onClick={() => onAction('/dashboard/tasks')} />
          </div>
          <motion.button variants={itemVariants} onClick={onClose} className="mt-12 text-slate-400 font-bold hover:text-slate-600 transition-colors flex items-center gap-2 mx-auto uppercase text-[10px] tracking-widest">Explorer le tableau de bord seul <ChevronRight size={14} /></motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function OnboardingCard({ icon: Icon, title, desc, color, onClick }: any) {
  const colors: any = { rose: "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600", emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600", indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600" };
  return (
    <motion.button whileHover={{ y: -5 }} onClick={onClick} className="group p-6 rounded-[2.5rem] border border-slate-100 bg-white hover:shadow-2xl hover:border-transparent transition-all text-left">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${colors[color]} group-hover:text-white`}><Icon size={28} /></div>
      <h4 className="font-black text-slate-900 mb-1">{title}</h4>
      <p className="text-slate-400 text-xs font-medium leading-relaxed">{desc}</p>
    </motion.button>
  );
}

// --- DASHBOARD PRINCIPAL ---
export default function WeddingDashboard() {
  const router = useRouter();
  const sidebarRef = useRef(null);
  const budgetCardRef = useRef(null);
  const taskCardRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourStep, setTourStep] = useState(0); 
  const [showPricing, setShowPricing] = useState(false);
  const [showVolumePaywall, setShowVolumePaywall] = useState(false);
  const [celebration, setCelebration] = useState<any>(null);
  
  const [marriage, setMarriage] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currency, setCurrency] = useState('FCFA');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [guestStats, setGuestStats] = useState({ total: 0, confirmed: 0, pending: 0, declined: 0, totalPersons: 0 });
  const [budgetStats, setBudgetStats] = useState({ totalActual: 0, totalPaid: 0, percentage: 0 });
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, urgent: 0, percentage: 0 });
  const [onboardingProgress, setOnboardingProgress] = useState(0);
  
  const EXCHANGE_RATES: { [key: string]: number } = { FCFA: 1, EUR: 0.0015, USD: 0.0016 };
  const GUEST_LIMIT = 9999;

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        setProfile(user.user_metadata);

        let { data: marriageData } = await supabase.from('marriages').select('*').eq('user_id', user.id).single();
        if (!marriageData) { setLoading(false); return; }
        setMarriage(marriageData);

        const { data: guests } = await supabase.from('invite').select('status, guests_count').eq('marriage_id', marriageData.id);
        const stats = (guests || []).reduce((acc, curr) => {
          acc.total += 1; acc.totalPersons += (curr.guests_count || 1);
          if (curr.status === 'confirmé') acc.confirmed += 1;
          if (curr.status === 'en_attente') acc.pending += 1;
          if (curr.status === 'décliné') acc.declined += 1;
          return acc;
        }, { total: 0, confirmed: 0, pending: 0, declined: 0, totalPersons: 0 });
        setGuestStats(stats);
        
        if (stats.total >= GUEST_LIMIT) {
          setShowVolumePaywall(true);
        }

        if (stats.total === 0) setShowWelcome(true);

        const { data: budgetItems } = await supabase.from('budget_items').select('amount_actual, amount_paid').eq('marriage_id', marriageData.id);
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

        const { data: tasks } = await supabase.from('tasks').select('is_completed, due_months_before').eq('marriage_id', marriageData.id);
        let totalTasks = 0;
        if (tasks) {
          totalTasks = tasks.length;
          const completed = tasks.filter(t => t.is_completed).length;
          const today = new Date();
          const wedding = new Date(marriageData.wedding_date);
          const diffMonths = (wedding.getFullYear() - today.getFullYear()) * 12 + (wedding.getMonth() - today.getMonth());
          const urgent = tasks.filter(t => !t.is_completed && diffMonths <= t.due_months_before).length;
          setTaskStats({ total: totalTasks, completed, urgent, percentage: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0 });
        }

        let steps = 0;
        if (stats.total > 0) steps += 33.3;
        if (actual > 0) steps += 33.3;
        if (totalTasks > 0) steps += 33.4;
        setOnboardingProgress(Math.round(steps));
      } catch (error) { console.error("Erreur Dashboard:", error); } finally { setLoading(false); }
    };
    initializeDashboard();
  }, [router]);

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

  const handleCloseWelcome = () => { setShowWelcome(false); setTourStep(1); };

  const navigateToGuests = () => {
    if (guestStats.total >= GUEST_LIMIT) {
      setShowVolumePaywall(true);
    } else {
      router.push('/dashboard/invite');
    }
  };

  // NOUVELLE FONCTION : DÉCONNEXION
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return ( <div className="h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" /></div> );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#1E293B]" style={{ fontFamily: '"Inter", sans-serif' }}>
      
      <AnimatePresence>
        {celebration && <MilestoneCelebration title={celebration.title} message={celebration.message} onConfirm={() => setCelebration(null)} />}
        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
        {showVolumePaywall && (
          <VolumePaywall 
            currentCount={GUEST_LIMIT} 
            onUpgrade={() => { setShowVolumePaywall(false); setShowPricing(true); }}
            onClose={() => setShowVolumePaywall(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tourStep === 1 && ( <GuidedTooltip step={1} totalSteps={3} title="Votre barre d'outils" desc="C'est ici que vous accédez à vos invités, vos tables et votre budget." targetRef={sidebarRef} onNext={() => setTourStep(2)} onSkip={() => setTourStep(0)} /> )}
        {tourStep === 2 && ( <GuidedTooltip step={2} totalSteps={3} title="Le Budget en temps réel" desc="Suivez vos paiements et basculez entre FCFA, EUR ou USD instantanément." targetRef={budgetCardRef} onNext={() => setTourStep(3)} onSkip={() => setTourStep(0)} /> )}
        {tourStep === 3 && ( <GuidedTooltip step={3} totalSteps={3} title="Assistant Intelligent" desc="Cette zone affiche vos tâches urgentes. Nous veillons sur votre calendrier !" targetRef={taskCardRef} onNext={() => setTourStep(0)} onSkip={() => setTourStep(0)} /> )}
      </AnimatePresence>

      <AnimatePresence>
        {showWelcome && <WelcomeModal partner1={marriage?.partner_1_name} partner2={marriage?.partner_2_name} onClose={handleCloseWelcome} onAction={(path: string) => router.push(path)} />}
      </AnimatePresence>

      <aside className="w-64 border-r border-slate-200 flex flex-col bg-white sticky top-0 h-screen z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100"><Heart size={20} className="text-white fill-white" /></div>
          <span className="font-bold text-xl tracking-tight">Mariage</span>
        </div>
        <nav ref={sidebarRef} className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Général</p>
          <SidebarItem icon={LayoutDashboard} label="Tableau de bord" active onClick={() => router.push('/dashboard')} />
          <SidebarItem icon={MessageSquare} label="Messages" />
          <p className="px-4 py-2 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organisation</p>
          <SidebarItem icon={Users} label="Liste des invités" onClick={navigateToGuests} />
          <SidebarItem icon={Send} label="Invitations (RSVP)" onClick={() => router.push('/dashboard/studio')} />
          <SidebarItem icon={Utensils} label="Gestion des tables" onClick={() => router.push('/dashboard/table')} />
          <SidebarItem icon={ClipboardList} label="Mes tâches" onClick={() => router.push('/dashboard/tasks')} />
          <SidebarItem icon={Banknote} label="Budget" onClick={() => router.push('/dashboard/budget')} />
          <SidebarItem icon={Clock} label="Planning Jour J" onClick={() => router.push('/dashboard/planning')} />
          
          <div className="mt-8 p-6 bg-gradient-to-br from-indigo-600 to-rose-500 rounded-[2rem] text-white shadow-xl relative overflow-hidden group mx-2">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <h4 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Crown size={12} /> Version Premium</h4>
            <p className="text-[10px] leading-relaxed mb-4 opacity-90 font-medium text-white/80">Débloquez l'export PDF et les invités illimités.</p>
            <button onClick={() => setShowPricing(true)} className="w-full py-3 bg-white text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">Upgrade</button>
          </div>
        </nav>

        {/* --- AJOUT : BOUTON DE DÉCONNEXION EN BAS --- */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">
        <header className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">✨ Planning Master</h2>
            <p className="text-2xl font-bold mb-4 text-slate-900">Bonjour, {marriage?.partner_1_name} 👋</p>
            {onboardingProgress < 100 && (
              <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm w-[350px]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2"><Sparkles size={12} /> Complétion du profil</span>
                  <span className="text-[10px] font-black text-slate-400">{onboardingProgress}%</span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${onboardingProgress}%` }} className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full" />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 h-fit">
              <Calendar size={18} className="text-rose-500" />
              <input type="date" value={marriage?.wedding_date || ""} onChange={(e) => handleDateChange(e.target.value)} className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer" />
            </div>
          </div>
        </header>

        <section className="relative h-[350px] rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl">
          <img src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80" className="w-full h-full object-cover" alt="bg" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent" />
          <div className="absolute inset-0 p-12 flex flex-col justify-between text-white">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl lg:text-6xl font-black tracking-tighter mb-4">{marriage?.partner_1_name} <span className="text-rose-400">&</span> {marriage?.partner_2_name} 💍</h1>
              <p className="bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10 text-sm font-bold">Le décompte a commencé ! 🎉</p>
            </motion.div>
            <div className="flex gap-8 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl w-fit shadow-xl">
               <TimeBlock value={timeLeft.days} label="Jours" /><TimeBlock value={timeLeft.hours} label="Heures" /><TimeBlock value={timeLeft.minutes} label="Min" /><TimeBlock value={timeLeft.seconds} label="Sec" accent />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Invités" value={guestStats.totalPersons} sub="Confirmés" icon={Users} color="bg-indigo-50 text-indigo-600" />
          <StatCard title="Confirmés" value={guestStats.confirmed} sub="Présents" icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
          <StatCard title="En attente" value={guestStats.pending} sub="RSVP" icon={Clock} color="bg-amber-50 text-amber-600" />
          <StatCard title="Absents" value={guestStats.declined} sub="Déclinés" icon={XCircle} color="bg-rose-50 text-rose-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div ref={budgetCardRef} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-rose-200 transition-all">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Banknote size={24} /></div>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                  {['FCFA', 'EUR', 'USD'].map((c) => ( <button key={c} onClick={() => setCurrency(c)} className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${currency === c ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}>{c}</button> ))}
                </div>
              </div>
              <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-1">Budget</h3>
              <p className="text-3xl font-black mb-2">{formatPrice(budgetStats.totalPaid)}</p>
              <p className="text-[10px] text-slate-400 font-bold mb-6 italic">Payé sur {formatPrice(budgetStats.totalActual)}</p>
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"><span>Progression</span><span>{budgetStats.percentage}%</span></div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${budgetStats.percentage}%` }} className="h-full bg-rose-500 rounded-full" /></div>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/budget')} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-600 transition-colors">Détails Budget <ChevronRight size={14} /></button>
          </div>

          <div ref={taskCardRef} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><ClipboardList size={24} /></div>
              {taskStats.urgent > 0 && <div className="bg-rose-500 text-white px-3 py-1 rounded-full text-[9px] font-black animate-pulse flex items-center gap-1"><AlertCircle size={10} /> {taskStats.urgent} URGENT</div>}
            </div>
            <div className="flex items-center gap-8 py-2">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                  <motion.circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="364.4" initial={{ strokeDashoffset: 364.4 }} animate={{ strokeDashoffset: 364.4 - (364.4 * taskStats.percentage) / 100 }} transition={{ duration: 1.5, ease: "easeInOut" }} className="text-indigo-500" strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center"><span className="text-2xl font-black text-slate-800">{taskStats.percentage}%</span></div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-1">Checklist</h3>
                <p className="text-2xl font-black text-slate-800">{taskStats.completed} / {taskStats.total}</p>
                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 w-fit px-3 py-1 rounded-lg text-[10px] font-black mt-4"><Clock size={12}/> Suivi intelligent activé</div>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/tasks')} className="mt-8 w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-lg shadow-indigo-100">Gérer mes tâches <ChevronRight size={14} /></button>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active = false, onClick }: any) {
  return ( <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><Icon size={18} /><span>{label}</span></button> );
}

function TimeBlock({ value, label, accent = false }: any) {
  return ( <div className="text-center min-w-[50px]"><p className={`text-3xl font-black tabular-nums ${accent ? 'text-rose-400 animate-pulse' : 'text-white'}`}>{value < 10 ? `0${value}` : value}</p><p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p></div> );
}

function StatCard({ title, value, sub, icon: Icon, color }: any) {
  return ( <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg transition-all"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}><Icon size={20} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p><p className="text-lg font-black">{value}</p><p className="text-[10px] font-medium text-slate-400">{sub}</p></div></div> );
}