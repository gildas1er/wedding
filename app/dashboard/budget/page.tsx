"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, LayoutDashboard, Users, Settings, 
  Wallet, Plus, Trash2, X, Save, 
  TrendingUp, CheckCircle2, Banknote, 
  Edit3, CircleDollarSign
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function BudgetPage() {
  const supabase = createClient();

  // États des données
  const [marriageId, setMarriageId] = useState<string | null>(null);
  const [marriageName, setMarriageName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#f43f5e");
  const [currency, setCurrency] = useState("€");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États UI
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newExpense, setNewExpense] = useState({ label: '', category: 'Traiteur', estimated: '', paid: '' });

  const categories = [
    { name: 'Traiteur', emoji: '🍽️' }, { name: 'Lieu', emoji: '🏰' },
    { name: 'Tenues', emoji: '✨' }, { name: 'Fleurs', emoji: '🌸' },
    { name: 'Photo/Vidéo', emoji: '📸' }, { name: 'Autre', emoji: '🎁' }
  ];

  useEffect(() => {
    fetchBudgetData();
  }, [supabase]);

  const fetchBudgetData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: marriage } = await supabase.from('marriages').select('*').eq('user_id', user.id).single();

    if (marriage) {
      setMarriageId(marriage.id);
      setMarriageName(marriage.name || "");
      setPrimaryColor(marriage.theme_color || "#f43f5e");
      setCurrency(marriage.currency || "€");

      const { data: expenseData } = await supabase.from('expenses').select('*').eq('marriage_id', marriage.id).order('created_at', { ascending: false });
      setExpenses(expenseData || []);
    }
    setLoading(false);
  };

  const convertCurrency = (oldCurrency: string, newCurrency: string) => {
    const rates: any = { '€': 1, '$': 1.08, 'CFA': 655.95 };
    const updatedExpenses = expenses.map(exp => ({
      ...exp,
      estimated_amount: (exp.estimated_amount / rates[oldCurrency]) * rates[newCurrency],
      paid_amount: (exp.paid_amount / rates[oldCurrency]) * rates[newCurrency]
    }));
    setExpenses(updatedExpenses);
    setCurrency(newCurrency);
  };

  const handleSaveExpense = async () => {
    if (!marriageId || !newExpense.label) return;
    setIsSaving(true);
    const payload = {
      marriage_id: marriageId,
      label: newExpense.label,
      category: newExpense.category,
      estimated_amount: parseFloat(newExpense.estimated) || 0,
      paid_amount: parseFloat(newExpense.paid) || 0
    };

    if (editingId) {
      await supabase.from('expenses').update(payload).eq('id', editingId);
    } else {
      await supabase.from('expenses').insert([payload]);
    }

    await fetchBudgetData();
    closeModal();
    setIsSaving(false);
  };

  const openEdit = (expense: any) => {
    setEditingId(expense.id);
    setNewExpense({
      label: expense.label,
      category: expense.category,
      estimated: expense.estimated_amount.toString(),
      paid: expense.paid_amount.toString()
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setNewExpense({ label: '', category: 'Traiteur', estimated: '', paid: '' });
  };

  const totalEstimated = expenses.reduce((acc, curr) => acc + curr.estimated_amount, 0);
  const totalPaid = expenses.reduce((acc, curr) => acc + curr.paid_amount, 0);

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-[#FDFDFF] relative overflow-hidden" style={{ fontFamily: '"Quicksand", sans-serif' }}>
      
      {/* --- FOND ANIMÉ --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-[120px] opacity-20"
          style={{ backgroundColor: primaryColor }}
        />
        <motion.div 
          animate={{ x: [0, -80, 0], y: [0, 100, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 -right-20 w-80 h-80 rounded-full blur-[100px] opacity-10"
          style={{ backgroundColor: '#10b981' }}
        />
      </div>

      {/* SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-72 bg-white/80 backdrop-blur-xl border-r border-slate-100 p-8 fixed h-full z-20">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100" style={{ backgroundColor: primaryColor }}>
            <Heart className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="font-black text-xl tracking-tighter text-slate-900 italic">
            {marriageName.split(' ')[0]}<span style={{ color: primaryColor }}>Studio</span>
          </span>
        </div>
        <nav className="space-y-2 flex-1">
          <SidebarLink href="/dashboard" icon={<LayoutDashboard />} label="Dashboard" active={false} />
          <SidebarLink href="/dashboard/budget" icon={<Wallet />} label="Budget" active={true} color={primaryColor} />
          <SidebarLink href="/dashboard/settings" icon={<Settings />} label="Settings" active={false} />
        </nav>
      </aside>

      <main className="flex-1 lg:ml-72 p-6 lg:p-12 z-10">
        <div className="max-w-6xl mx-auto">
          
          <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Finance Manager</p>
              <h1 className="text-4xl lg:text-5xl font-black italic text-slate-900">
                Wedding <span style={{ color: primaryColor }}>Budget</span>
              </h1>
            </div>

            <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] shadow-sm border border-slate-50">
               <select 
                value={currency} 
                onChange={(e) => convertCurrency(currency, e.target.value)}
                className="bg-transparent text-slate-900 px-4 py-3 rounded-xl font-black text-xs outline-none cursor-pointer border-none"
               >
                 <option value="€">EUR (€)</option>
                 <option value="$">USD ($)</option>
                 <option value="CFA">XOF (CFA)</option>
               </select>

              <button onClick={() => setShowModal(true)} className="text-white px-8 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all flex items-center gap-3" style={{ backgroundColor: primaryColor }}>
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </header>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <SummaryCard label="Total Estimé" value={`${Math.round(totalEstimated).toLocaleString()} ${currency}`} color={primaryColor} icon={<TrendingUp />} />
            <SummaryCard label="Déjà Payé" value={`${Math.round(totalPaid).toLocaleString()} ${currency}`} color="#10b981" icon={<CheckCircle2 />} />
            <SummaryCard label="Balance" value={`${Math.round(totalEstimated - totalPaid).toLocaleString()} ${currency}`} color="#64748b" icon={<Banknote />} />
          </div>

          {/* LISTE */}
          <div className="space-y-4">
            {expenses.map((item) => (
                <motion.div key={item.id} layout className="bg-white/70 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 group hover:shadow-md transition-all">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-inner border border-slate-100">
                      {categories.find(c => c.name === item.category)?.emoji || '💰'}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-lg italic">{item.label}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-10">
                    <div className="text-right">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Payé / Total</p>
                        <p className="font-black text-slate-900">{Math.round(item.paid_amount)} / {Math.round(item.estimated_amount)} <span className="text-[10px] text-slate-400">{currency}</span></p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => openEdit(item)} className="p-4 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-all border border-slate-100">
                            <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => {if(confirm("Supprimer ?")) { supabase.from('expenses').delete().eq('id', item.id).then(() => fetchBudgetData()) }}} className="p-4 rounded-2xl bg-slate-50 text-slate-400 hover:text-rose-500 transition-all border border-slate-100">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* MODALE STYLE CLAIR */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[3.5rem] p-10 w-full max-w-xl shadow-2xl border border-white">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black italic text-slate-900">{editingId ? 'Modifier' : 'Ajouter'} <span style={{ color: primaryColor }}>Dépense</span></h2>
                <button onClick={closeModal} className="text-slate-300 hover:text-slate-900 p-2"><X /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Libellé</label>
                  <input type="text" className="w-full bg-slate-50 border-none rounded-2xl py-5 px-6 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-100" value={newExpense.label} onChange={e => setNewExpense({...newExpense, label: e.target.value})} placeholder="Ex: Décoration Florale" />
                </div>

                <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                        <button key={c.name} onClick={() => setNewExpense({...newExpense, category: c.name})} className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${newExpense.category === c.name ? 'text-white' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`} style={{ backgroundColor: newExpense.category === c.name ? primaryColor : '' }}>{c.emoji} {c.name}</button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Estimé ({currency})</label>
                        <input type="number" className="w-full bg-slate-50 border-none rounded-2xl py-5 px-6 font-bold text-slate-900 outline-none" value={newExpense.estimated} onChange={e => setNewExpense({...newExpense, estimated: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Payé ({currency})</label>
                        <input type="number" className="w-full bg-slate-50 border-none rounded-2xl py-5 px-6 font-bold text-slate-900 outline-none" value={newExpense.paid} onChange={e => setNewExpense({...newExpense, paid: e.target.value})} />
                    </div>
                </div>

                <button onClick={handleSaveExpense} className="w-full py-6 rounded-[2rem] text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-100 mt-4 transition-transform hover:scale-105 active:scale-95" style={{ backgroundColor: primaryColor }}>
                    {isSaving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Enregistrer la dépense'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ label, value, color, icon }: any) {
    return (
      <div className="bg-white/60 backdrop-blur-md p-8 rounded-[3rem] border border-white shadow-sm group hover:shadow-md transition-all">
        <div className="p-3 w-fit rounded-xl mb-4 shadow-sm bg-white" style={{ color }}>{icon}</div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900 italic">{value}</p>
      </div>
    );
}

function SidebarLink({ href, icon, label, active, color }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all ${active ? 'bg-white shadow-md text-slate-900 shadow-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
      <div style={{ color: active ? color : 'inherit' }}>{icon}</div>
      <span>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
    </Link>
  );
}