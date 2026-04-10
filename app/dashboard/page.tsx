"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Heart, Users, Banknote, Calendar, LogOut, 
  MessageSquare, Settings, ChevronRight,
  LayoutDashboard, CheckCircle2, Clock, 
  ClipboardList, Utensils, Send
} from 'lucide-react';

export default function WeddingDashboard() {
  const router = useRouter();
  
  // --- ÉTATS & LOGIQUE DE LIAISON ---
  const [loading, setLoading] = useState(true);
  const [marriage, setMarriage] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const initializeDashboard = async () => {
      // 1. Récupérer l'utilisateur Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setProfile(user.user_metadata);

      // 2. ÉTAPE CLÉ : Récupérer ou Créer le lien Mariage
      let { data: marriageData, error } = await supabase
        .from('marriages')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Si le mariage n'existe pas, on le crée pour lier les futures données
      if (error || !marriageData) {
        const { data: newMarriage, error: createError } = await supabase
          .from('marriages')
          .insert([{ 
            user_id: user.id,
            partner_1_name: user.user_metadata?.full_name || 'Partenaire 1',
            partner_2_name: 'Partenaire 2',
            couple_slug: `union-${user.id.slice(0, 5)}`
          }])
          .select()
          .single();
        
        if (!createError) marriageData = newMarriage;
      }

      setMarriage(marriageData);
      setLoading(false);
    };

    initializeDashboard();
  }, [router]);

  // --- LOGIQUE DU COMPTE À REBOURS ---
  useEffect(() => {
    if (!marriage?.wedding_date) return;
    const interval = setInterval(() => {
      const diff = new Date(marriage.wedding_date).getTime() - new Date().getTime();
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [marriage?.wedding_date]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#1E293B]" style={{ fontFamily: '"Inter", sans-serif' }}>
      
      {/* ── BARRE DE NAVIGATION (Menu mis à jour) ── */}
      <aside className="w-64 border-r border-slate-200 flex flex-col bg-white sticky top-0 h-screen z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
            <Heart size={20} className="text-white fill-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Mariage</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Général</p>
          <SidebarItem icon={LayoutDashboard} label="Tableau de bord" active onClick={() => router.push('/dashboard')} />
          <SidebarItem icon={MessageSquare} label="Messages" />
          
          <p className="px-4 py-2 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organisation</p>
          {/* LIEN VERS LA PAGE DES INVITÉS */}
          <SidebarItem icon={Users} label="Liste des invités" onClick={() => router.push('/dashboard/invite')} />
          <SidebarItem icon={Send} label="Invitations (RSVP)" />
          <SidebarItem icon={Utensils} label="Gestion des tables" />
          <SidebarItem icon={ClipboardList} label="Mes tâches" />
          <SidebarItem icon={Banknote} label="Budget & Dépenses" />
          
          <p className="px-4 py-2 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Préférences</p>
          <SidebarItem icon={Settings} label="Configuration" onClick={() => router.push('/settings')} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
            <LogOut size={20} />
            <span className="text-sm font-semibold">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-rose-100/50 blur-[120px] -z-10 rounded-full" />

        {/* HEADER */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">✨ Planning Master</h2>
            <p className="text-2xl font-bold">Bonjour, {marriage?.partner_1_name || "Sarah"} 👋</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <Calendar size={18} className="text-rose-500" />
            <span className="text-sm font-bold text-slate-700">
              {marriage?.wedding_date ? new Date(marriage.wedding_date).toLocaleDateString('fr-FR') : "Date à définir"} 🗓️
            </span>
          </div>
        </header>

        {/* ── HERO SECTION ── */}
        <section className="relative h-[400px] rounded-[2.5rem] overflow-hidden mb-10 shadow-2xl shadow-slate-200">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80" 
              className="w-full h-full object-cover" 
              alt="Wedding background" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent" />
          </div>

          <div className="relative h-full z-10 p-12 flex flex-col justify-between text-white">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-4 leading-none">
                {marriage?.partner_1_name} <span className="text-rose-400">&</span> {marriage?.partner_2_name} 💍
              </h1>
              <p className="flex items-center gap-2 text-white/80 font-medium tracking-wide bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                <CheckCircle2 size={18} className="text-rose-400" /> 
                Prêts pour le grand jour ? 🎉
              </p>
            </motion.div>

            <div className="flex gap-4 md:gap-8 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl w-fit shadow-xl">
               <TimeBlock value={timeLeft.days} label="Jours" />
               <TimeBlock value={timeLeft.hours} label="Heures" />
               <TimeBlock value={timeLeft.minutes} label="Min" />
               <TimeBlock value={timeLeft.seconds} label="Sec" accent />
            </div>
          </div>
        </section>

        {/* ── GRID D'ACTIONS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-[-20px] right-[-20px] text-6xl opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">📝</div>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="font-bold text-lg">Actions recommandées 🔥</h3>
              <button onClick={() => router.push('/guests')} className="text-xs font-bold text-rose-500 uppercase tracking-widest hover:text-rose-600">Gérer les invités ➡️</button>
            </div>
            
            <div className="space-y-4 relative z-10">
              <TaskRow title="Compléter la liste des invités" date="Priorité haute" category="Organisation 👥" completed={false} color="text-amber-600" />
              <TaskRow title="Définir la date du mariage" date="Paramètres" category="Admin 📅" completed={!!marriage?.wedding_date} color="text-sky-600" />
            </div>
          </div>

          <div className="space-y-6">
            <StatCard 
              title="Invités ⭐" 
              value="--" 
              sub="Voir la liste" 
              icon={Users} 
              color="bg-blue-50 text-blue-500" 
            />
            <StatCard 
              title="Budget 💰" 
              value="0" 
              sub={marriage?.currency || "CFA"} 
              icon={Banknote} 
              color="bg-emerald-50 text-emerald-500" 
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// ── COMPOSANTS UI INTERNES ──

function SidebarItem({ icon: Icon, label, active = false, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
      active ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function TimeBlock({ value, label, accent = false }: any) {
  return (
    <div className="text-center min-w-[60px]">
      <p className={`text-3xl font-black tabular-nums ${accent ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
        {value < 10 ? `0${value}` : value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</p>
    </div>
  );
}

function TaskRow({ title, date, category, completed, color }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
          {completed ? <CheckCircle2 size={20} /> : <Clock size={20} />}
        </div>
        <div>
          <p className={`font-bold text-sm ${completed ? 'line-through text-slate-300' : 'text-slate-700'}`}>{title}</p>
          <p className="text-xs text-slate-400 font-medium">{date} • <span className={color}>{category}</span></p>
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-300" />
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-lg transition-all relative overflow-hidden">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-xl font-black">{value}</p>
        <p className="text-[10px] font-medium text-slate-400">{sub}</p>
      </div>
    </div>
  );
}