"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, GripVertical, UserPlus, 
  Trash2, Sparkles, LayoutDashboard, 
  Settings, LogOut, Search, Menu, X, Heart,
  CheckCircle2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

export default function TablePlanPage() {
  const supabase = createClient();
  const pathname = usePathname();
  const params = useParams();
  
  // L'ID du mariage récupéré depuis l'URL ([id])
  const marriageId = params.id;

  const [primaryColor] = useState("#f43f5e");
  
  // États pour les données
  const [guests, setGuests] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // États pour la modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTable, setNewTable] = useState({ name: '', capacity: 10 });

  // 1. CHARGEMENT DES DONNÉES
  useEffect(() => {
    const fetchData = async () => {
      if (!marriageId) return;
      
      setLoading(true);
      
      // Récupérer les tables du mariage actuel
      const { data: tablesData } = await supabase
        .from('tables')
        .select('*')
        .eq('marriage_id', marriageId)
        .order('created_at', { ascending: true });

      // Récupérer les invités confirmés
      const { data: guestsData } = await supabase
        .from('guests')
        .select('*')
        .eq('status', 'confirmé')
        .order('name', { ascending: true });

      if (tablesData) setTables(tablesData);
      if (guestsData) setGuests(guestsData);
      setLoading(false);
    };

    fetchData();
  }, [supabase, marriageId]);

  // 2. LOGIQUE D'AJOUT DE TABLE
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTable.name || !marriageId) {
        alert("ID du mariage manquant ou nom vide.");
        return;
    }
    
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from('tables')
      .insert([{ 
        name: newTable.name, 
        capacity: newTable.capacity,
        marriage_id: marriageId
      }])
      .select()
      .single();

    if (error) {
      console.error("Erreur insertion:", error);
      alert(`Erreur : ${error.message}`);
    } else if (data) {
      setTables([...tables, data]);
      setIsModalOpen(false);
      setNewTable({ name: '', capacity: 10 });
    }
    setIsSubmitting(false);
  };

  // 3. LOGIQUE DE SUPPRESSION
  const deleteTable = async (id: string) => {
    if (!confirm("Supprimer cette table ? Les invités seront remis en liste d'attente.")) return;
    
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (!error) {
      setTables(tables.filter(t => t.id !== id));
      // Re-fetch des guests pour rafraîchir les positions
      const { data: guestsData } = await supabase
        .from('guests')
        .select('*')
        .eq('status', 'confirmé');
      if (guestsData) setGuests(guestsData);
    }
  };

  const unplacedGuests = guests
    .filter(g => !g.table_id)
    .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]" style={{ fontFamily: '"Quicksand", sans-serif' }}>
      
      {/* --- SIDEBAR --- */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 p-8 fixed h-full z-20">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-200">
            <Heart className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="font-black text-xl tracking-tighter text-slate-900 italic">Wedding<span style={{ color: primaryColor }}>Studio</span></span>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarLink href={`/dashboard/${marriageId}`} icon={<LayoutDashboard />} label="Tableau de bord" active={pathname === `/dashboard/${marriageId}`} />
          <SidebarLink href={`/dashboard/${marriageId}/guests`} icon={<Users />} label="Invités" active={pathname.includes('/guests')} />
          <SidebarLink href={`/dashboard/${marriageId}/tables`} icon={<LayoutDashboard />} label="Plan de table" active={pathname.includes('/tables')} color={primaryColor} />
          <SidebarLink href={`/dashboard/${marriageId}/settings`} icon={<Settings />} label="Paramètres" active={pathname.includes('/settings')} />
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 lg:ml-72 p-6 lg:p-12">
        <div className="max-w-6xl mx-auto">
          
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Organisation</p>
              </div>
              <h1 className="text-4xl lg:text-5xl font-black italic text-slate-900">
                Plan des <span style={{ color: primaryColor }}>Tables</span>
              </h1>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 justify-center"
            >
              <Plus className="w-5 h-5" /> Nouvelle table
            </button>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* COLONNE GAUCHE */}
            <div className="xl:col-span-4">
              <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-2xl p-8 sticky top-12">
                <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: primaryColor }} />
                
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-rose-50 p-2.5 rounded-2xl">
                    <UserPlus className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">À placer</h2>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{unplacedGuests.length} confirmés</p>
                  </div>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Chercher un invité..." className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none transition-all" />
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="animate-pulse space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-50 rounded-2xl" />)}
                    </div>
                  ) : unplacedGuests.map((guest) => (
                    <div key={guest.id} className="flex items-center gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-rose-200 transition-all cursor-grab active:scale-95 group">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <span className="text-sm font-bold text-slate-700">{guest.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ZONE DROITE */}
            <div className="xl:col-span-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tables.map((table) => {
                  const tableGuests = guests.filter(g => g.table_id === table.id);
                  return (
                    <div key={table.id} className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-2xl p-8 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-2 bg-slate-200" style={{ backgroundColor: tableGuests.length > 0 ? primaryColor : '#e2e8f0' }} />
                      
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-2xl font-black text-slate-800 italic">{table.name}</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{tableGuests.length} / {table.capacity} places</p>
                        </div>
                        <button onClick={() => deleteTable(table.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="aspect-square rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center p-6 transition-all group-hover:border-rose-100">
                        {tableGuests.length > 0 ? (
                          <div className="w-full space-y-2">
                             {tableGuests.map(g => (
                               <div key={g.id} className="bg-white p-2 rounded-xl text-[11px] font-bold text-slate-600 shadow-sm border border-slate-50">{g.name}</div>
                             ))}
                          </div>
                        ) : (
                          <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Vide</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- MODALE --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: primaryColor }} />
              <div className="p-10 pt-12">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black italic text-slate-900">Nouvelle <span style={{ color: primaryColor }}>Table</span></h2>
                  <button onClick={() => setIsModalOpen(false)} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-900"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleCreateTable} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Nom de la table</label>
                    <input autoFocus required type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-5 px-6 font-bold text-slate-800 outline-none focus:border-rose-200 transition-all" value={newTable.name} onChange={(e) => setNewTable({...newTable, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Places</label>
                    <input required type="number" min="1" max="20" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-5 px-6 font-bold text-slate-800 outline-none focus:border-rose-200 transition-all" value={newTable.capacity} onChange={(e) => setNewTable({...newTable, capacity: parseInt(e.target.value)})} />
                  </div>
                  <button disabled={isSubmitting} type="submit" className="w-full py-6 rounded-[2.5rem] bg-slate-900 text-white font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                    {isSubmitting ? "Création..." : <><CheckCircle2 className="w-5 h-5" /> Confirmer</>}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({ href, icon, label, active, color }: any) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all cursor-pointer ${active ? 'bg-white shadow-xl shadow-slate-200/50 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
        <div className={active ? 'text-rose-500' : ''}>{React.cloneElement(icon, { size: 20 })}</div>
        <span>{label}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
      </div>
    </Link>
  );
}