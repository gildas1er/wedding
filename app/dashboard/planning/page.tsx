"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Heart, LayoutDashboard, Users, Send, Utensils, ClipboardList, 
  Banknote, Settings, LogOut, MessageSquare, Plus, Clock, 
  MapPin, Trash2, Calendar, ChevronRight, AlertCircle
} from 'lucide-react';

export default function PlanningPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [marriage, setMarriage] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newEvent, setNewEvent] = useState({ 
    start_time: '', 
    title: '', 
    description: '', 
    location: '', 
    is_major_step: false 
  });

  useEffect(() => {
    fetchPlanning();
  }, [router]);

  // Calculer l'événement suivant en temps réel
  useEffect(() => {
    const timer = setInterval(() => {
      if (events.length === 0) return;

      const now = new Date();
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

      // Trouve le premier événement dont l'heure est supérieure à "maintenant"
      const upcoming = [...events]
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .find(e => e.start_time > currentTimeStr);
      
      setNextEvent(upcoming);
    }, 1000);

    return () => clearInterval(timer);
  }, [events]);

  const fetchPlanning = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: marriageData } = await supabase
      .from('marriages')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    setMarriage(marriageData);

    if (marriageData) {
      const { data } = await supabase
        .from('planning_events')
        .select('*')
        .eq('marriage_id', marriageData.id)
        .order('start_time', { ascending: true });
      if (data) setEvents(data);
    }
    setLoading(false);
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marriage) return;

    const { data, error } = await supabase
      .from('planning_events')
      .insert([{ ...newEvent, marriage_id: marriage.id }])
      .select().single();

    if (!error) {
      setEvents([...events, data].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setShowAddForm(false);
      setNewEvent({ start_time: '', title: '', description: '', location: '', is_major_step: false });
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('planning_events').delete().eq('id', id);
    if (!error) setEvents(events.filter(e => e.id !== id));
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#1E293B]" style={{ fontFamily: '"Inter", sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-200 flex flex-col bg-white sticky top-0 h-screen z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
            <Heart size={20} className="text-white fill-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Mariage</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto text-slate-600">
          <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Général</p>
          <SidebarItem icon={LayoutDashboard} label="Tableau de bord" onClick={() => router.push('/dashboard')} />
          <p className="px-4 py-2 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organisation</p>
          <SidebarItem icon={ClipboardList} label="Mes tâches" onClick={() => router.push('/dashboard/tasks')} />
          <SidebarItem icon={Clock} label="Planning Jour J" active onClick={() => router.push('/dashboard/planning')} />
          <SidebarItem icon={Users} label="Liste des invités" onClick={() => router.push('/dashboard/invite')} />
          <SidebarItem icon={Utensils} label="Gestion des tables" onClick={() => router.push('/dashboard/table')} />
          <SidebarItem icon={Banknote} label="Budget" onClick={() => router.push('/dashboard/budget')} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
            <LogOut size={20} />
            <span className="text-sm font-semibold">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-rose-100/50 blur-[120px] -z-10 rounded-full" />

        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">🕒 Chronologie</h2>
            <p className="text-2xl font-bold">Le déroulement du Jour J 🥂</p>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-rose-600 transition-all shadow-lg shadow-slate-200"
          >
            <Plus size={18} /> Ajouter un moment
          </button>
        </header>

        {/* RAPPEL AUTOMATIQUE (NEXT EVENT) */}
        <AnimatePresence>
          {nextEvent && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-rose-500/20 blur-[80px] rounded-full" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/10 flex flex-col items-center justify-center">
                    <Clock size={24} className="text-rose-400 mb-1" />
                    <span className="text-sm font-black">{nextEvent.start_time.substring(0, 5)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400">Prochaine étape</span>
                    <h3 className="text-2xl font-black">{nextEvent.title}</h3>
                    <p className="text-slate-400 text-sm flex items-center gap-2 mt-1 italic">
                      <MapPin size={14} /> {nextEvent.location || "Lieu à confirmer"}
                    </p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-4">
                  <div className="animate-pulse w-2 h-2 bg-rose-500 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Rappel intelligent actif</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TIMELINE SECTION */}
        <div className="max-w-3xl mx-auto relative pt-4">
          <div className="absolute left-[31px] top-0 bottom-0 w-1 bg-slate-100 rounded-full" />

          <div className="space-y-12">
            {events.map((event, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={event.id} 
                className="relative flex gap-8 group"
              >
                {/* Heure / Point de Timeline */}
                <div className={`z-10 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${event.is_major_step ? 'bg-rose-500 text-white scale-110 shadow-rose-200' : 'bg-white text-slate-500 border border-slate-100'}`}>
                  <span className="text-xs font-black">{event.start_time.substring(0, 5)}</span>
                </div>

                {/* Contenu */}
                <div className={`flex-1 p-7 rounded-[2.5rem] border transition-all ${event.is_major_step ? 'bg-white border-rose-100 shadow-xl shadow-rose-50/30' : 'bg-white border-slate-50 shadow-sm hover:shadow-md'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold text-xl ${event.is_major_step ? 'text-rose-600' : 'text-slate-800'}`}>
                      {event.title}
                    </h3>
                    <button 
                      onClick={() => deleteEvent(event.id)}
                      className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed mb-5">{event.description}</p>
                  {event.location && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 w-fit px-3 py-1.5 rounded-lg">
                      <MapPin size={12} className="text-rose-400" /> {event.location}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {events.length === 0 && !showAddForm && (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
               <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
               <p className="text-slate-400 font-medium italic">Commencez à planifier le déroulement de votre journée.</p>
            </div>
          )}
        </div>

        {/* MODAL FORMULAIRE */}
        <AnimatePresence>
          {showAddForm && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
              <motion.form 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onSubmit={addEvent} 
                className="bg-white p-10 rounded-[3rem] w-full max-w-xl shadow-2xl relative"
              >
                <button type="button" onClick={() => setShowAddForm(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600">
                  <XCircle size={24} />
                </button>

                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                  <Plus className="text-rose-500" /> Nouvel événement
                </h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Heure</label>
                      <input type="time" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-rose-300 font-bold" value={newEvent.start_time} onChange={e => setNewEvent({...newEvent, start_time: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Titre</label>
                      <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-rose-300 font-bold" placeholder="Ex: Cérémonie Civile" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Lieu</label>
                    <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-rose-300 font-bold" placeholder="Ex: Hôtel de Ville" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Notes / Description</label>
                    <textarea className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none min-h-[100px] font-semibold" placeholder="Détails importants..." value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                  </div>
                  <label className="flex items-center gap-4 cursor-pointer p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-rose-200 transition-all">
                    <input type="checkbox" className="w-6 h-6 accent-rose-500 rounded-lg" checked={newEvent.is_major_step} onChange={e => setNewEvent({...newEvent, is_major_step: e.target.checked})} />
                    <span className="text-sm font-black text-slate-700">Moment clé (Étape majeure)</span>
                  </label>
                </div>

                <div className="flex gap-4 mt-10">
                  <button type="submit" className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all uppercase tracking-widest text-xs">Enregistrer</button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-all uppercase tracking-widest text-xs">Annuler</button>
                </div>
              </motion.form>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

// Icone X simple car non importée
function XCircle({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}

function SidebarItem({ icon: Icon, label, active = false, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
      <Icon size={18} /><span>{label}</span>
    </button>
  );
}