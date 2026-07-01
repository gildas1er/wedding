"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Heart, Users, Banknote, Calendar, LogOut, 
  MessageSquare, Settings, ChevronRight,
  LayoutDashboard, CheckCircle2, Clock, 
  ClipboardList, Utensils, Send, XCircle,
  Plus, Tag, Trash2, AlertCircle, Circle
} from 'lucide-react';

export default function TasksPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [marriage, setMarriage] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'Général',
    priority: 'moyenne',
    due_months_before: 6
  });

  useEffect(() => {
    const initializePage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: marriageData } = await supabase
        .from('marriages')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setMarriage(marriageData);

      if (marriageData) {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('*')
          .eq('marriage_id', marriageData.id)
          .order('is_completed', { ascending: true })
          .order('created_at', { ascending: false });
        
        if (taskData) setTasks(taskData);
      }
      setLoading(false);
    };

    initializePage();
  }, [router]);

  // LOGIQUE D'URGENCE
  const getUrgencyStatus = (dueMonthsBefore: number) => {
    if (!marriage?.wedding_date) return null;
    const today = new Date();
    const weddingDate = new Date(marriage.wedding_date);
    const diffMonths = (weddingDate.getFullYear() - today.getFullYear()) * 12 + (weddingDate.getMonth() - today.getMonth());

    if (diffMonths <= dueMonthsBefore) {
      return { label: "Urgent", className: "bg-rose-50 text-rose-500 border-rose-100 animate-pulse" };
    }
    return null;
  };

  const urgentCount = tasks.filter(t => !t.is_completed && getUrgencyStatus(t.due_months_before)).length;

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marriage || !newTask.title) return;
    const { data, error } = await supabase.from('tasks').insert([{ ...newTask, marriage_id: marriage.id }]).select().single();
    if (!error) {
      setTasks([data, ...tasks]);
      setNewTask({ title: '', category: 'Général', priority: 'moyenne', due_months_before: 6 });
      setShowAddForm(false);
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', id);
    if (!error) setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) setTasks(tasks.filter(t => t.id !== id));
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#1E293B]" style={{ fontFamily: '"Inter", sans-serif' }}>
      
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
          <SidebarItem icon={MessageSquare} label="Messages" />
          <p className="px-4 py-2 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organisation</p>
          <SidebarItem icon={Users} label="Liste des invités" onClick={() => router.push('/dashboard/invite')} />
          <SidebarItem icon={Send} label="Invitations (RSVP)" onClick={() => router.push('/dashboard/studio')} />
          <SidebarItem icon={Utensils} label="Gestion des tables" onClick={() => router.push('/dashboard/table')} />
          <SidebarItem icon={ClipboardList} label="Mes tâches" active onClick={() => router.push('/dashboard/tasks')} />
          <SidebarItem icon={Banknote} label="Budget & Dépenses" onClick={() => router.push('/dashboard/budget')} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
            <LogOut size={20} />
            <span className="text-sm font-semibold">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-rose-100/50 blur-[120px] -z-10 rounded-full" />

        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">✨ Organisation</h2>
            <p className="text-2xl font-bold">Ma Checklist Intelligente 📝</p>
          </div>
          
          <div className="flex items-center gap-4">
            {urgentCount > 0 && (
              <div className="bg-rose-500 text-white px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-rose-200 animate-bounce">
                <AlertCircle size={16} />
                <span className="text-xs font-black uppercase">{urgentCount} Urgence{urgentCount > 1 ? 's' : ''}</span>
              </div>
            )}
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-rose-600 transition-all shadow-lg shadow-slate-200"
            >
              <Plus size={18} /> Ajouter une tâche
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showAddForm && (
            <motion.form 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              onSubmit={addTask} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl mb-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Titre de la tâche</label>
                  <input autoFocus className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:border-rose-300 transition-all font-semibold" placeholder="Ex: Réserver le photographe..." value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Catégorie</label>
                  <select className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-semibold cursor-pointer" value={newTask.category} onChange={e => setNewTask({...newTask, category: e.target.value})}>
                    <option>Général</option><option>Finance</option><option>Logistique</option><option>Tenues</option><option>Invités</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Mois avant le jour J</label>
                  <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-semibold" value={newTask.due_months_before} onChange={e => setNewTask({...newTask, due_months_before: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button type="submit" className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100">Enregistrer</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="px-8 py-4 text-slate-400 font-bold">Annuler</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {tasks.map((task) => {
            const urgency = !task.is_completed ? getUrgencyStatus(task.due_months_before) : null;
            return (
              <motion.div layout key={task.id} className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group transition-all ${task.is_completed ? 'bg-slate-50/50' : 'hover:border-rose-200 hover:shadow-md'}`}>
                <div className="flex items-center gap-6">
                  <button onClick={() => toggleTask(task.id, task.is_completed)} className={`transition-all transform hover:scale-110 ${task.is_completed ? 'text-emerald-500' : 'text-slate-200 hover:text-rose-500'}`}>
                    {task.is_completed ? <CheckCircle2 size={32} /> : <Circle size={32} />}
                  </button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className={`font-bold text-lg ${task.is_completed ? 'line-through text-slate-300' : 'text-slate-700'}`}>{task.title}</h3>
                      {urgency && <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${urgency.className}`}>{urgency.label}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Tag size={12} className="text-rose-400" /> {task.category}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Clock size={12} /> {task.due_months_before} mois avant</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active = false, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
      <Icon size={18} /><span>{label}</span>
    </button>
  );
}