"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, GripVertical, UserPlus, 
  Trash2, Sparkles, LayoutDashboard, 
  Settings, LogOut, Search, Menu, X, Heart,
  CheckCircle2, Type, Hash, Info, AlertCircle
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Imports DND KIT
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- COMPOSANT INVITÉ (DRAGGABLE) ---
function DraggableGuest({ guest }: { guest: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: guest.id,
    data: { type: 'guest', guest }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 font-bold text-sm text-slate-700 cursor-grab active:cursor-grabbing hover:border-rose-200 transition-all group"
    >
      <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-rose-300" />
      {guest.name}
    </motion.div>
  );
}

// --- COMPOSANT TABLE (DROPPABLE) ---
function DroppableTable({ table, guestsAtTable, onDelete, onRemoveGuest }: { table: any, guestsAtTable: any[], onDelete: any, onRemoveGuest: any }) {
  const { setNodeRef, isOver } = useSortable({
    id: table.id,
    data: { type: 'table', table }
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      className={`bg-white rounded-[3.5rem] border-2 shadow-2xl p-8 relative overflow-hidden transition-all duration-300 ${
        isOver ? 'border-rose-400 bg-rose-50/20 scale-[1.02]' : 'border-slate-50'
      }`}
    >
      <div className="absolute top-0 left-0 w-full h-2 bg-slate-100 group-hover:bg-rose-400 transition-colors" />
      <div className="flex justify-between items-start mb-8 relative">
        <div>
          <h3 className="text-2xl font-black italic text-slate-800">{table.name}</h3>
          <div className="flex gap-2 mt-2">
            <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black uppercase tracking-tighter text-slate-500">
              {guestsAtTable.length} / {table.capacity} PLACES
            </span>
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${guestsAtTable.length >= table.capacity ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {guestsAtTable.length >= table.capacity ? 'COMPLET' : 'DISPONIBLE'}
            </span>
          </div>
        </div>
        <button onClick={() => onDelete(table.id, table.name)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="min-h-[120px] space-y-2">
        {guestsAtTable.length > 0 ? (
          guestsAtTable.map(g => (
            <div key={g.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 flex justify-between items-center group animate-in fade-in duration-200">
              {g.name}
              <button 
                onClick={() => onRemoveGuest(g.id)}
                className="p-1 hover:bg-rose-100 rounded-full text-slate-300 hover:text-rose-500 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        ) : (
          <div className="aspect-square rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
            <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Déposer ici</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function TablePlanPage() {
  const supabase = createClient();
  const pathname = usePathname();
  const [primaryColor] = useState("#f43f5e");
  
  const [marriageId, setMarriageId] = useState<string | null>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeGuest, setActiveGuest] = useState<any>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTable, setNewTable] = useState({ name: '', capacity: 10 });
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: marriageData } = await supabase.from('marriages').select('id').eq('user_id', user.id).single();

    if (marriageData) {
      setMarriageId(marriageData.id);
      const { data: tablesData } = await supabase.from('tables').select('*').eq('marriage_id', marriageData.id).order('created_at', { ascending: true });
      const { data: guestsData } = await supabase.from('guests').select('*').eq('status', 'confirmé').order('name', { ascending: true });
      if (tablesData) setTables(tablesData);
      if (guestsData) setGuests(guestsData);
    }
    setLoading(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const guest = guests.find(g => g.id === event.active.id);
    setActiveGuest(guest);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGuest(null);
    if (!over) return;

    const guestId = active.id as string;
    const tableId = over.id as string;
    const targetTable = tables.find(t => t.id === tableId);
    if (!targetTable) return;

    const guestsAtTarget = guests.filter(g => g.table_id === tableId);
    if (guestsAtTarget.length >= targetTable.capacity) {
      showToast("Cette table est complète !", "error");
      return;
    }

    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, table_id: tableId } : g));
    const { error } = await supabase.from('guests').update({ table_id: tableId }).eq('id', guestId);
    if (error) { showToast("Erreur de placement", "error"); fetchData(); } 
    else { showToast("Invité placé !"); }
  };

  const removeGuestFromTable = async (guestId: string) => {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, table_id: null } : g));
    const { error } = await supabase.from('guests').update({ table_id: null }).eq('id', guestId);
    if (error) { showToast("Erreur lors du retrait", "error"); fetchData(); }
    else { showToast("Invité remis en attente"); }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTable.name || !marriageId) return;
    setIsSubmitting(true);
    const { data, error } = await supabase.from('tables').insert([{ name: newTable.name, capacity: newTable.capacity, marriage_id: marriageId }]).select().single();
    if (!error && data) {
      setTables([...tables, data]);
      setIsModalOpen(false);
      setNewTable({ name: '', capacity: 10 });
      showToast(`La table "${data.name}" a été créée !`);
    }
    setIsSubmitting(false);
  };

  const deleteTable = async (id: string, name: string) => {
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (!error) {
      setTables(tables.filter(t => t.id !== id));
      setGuests(prev => prev.map(g => g.table_id === id ? { ...g, table_id: null } : g));
      showToast(`Table "${name}" supprimée`);
    }
  };

  const unplacedGuests = guests.filter(g => !g.table_id).filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]" style={{ fontFamily: '"Quicksand", sans-serif' }}>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        
        <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 p-8 fixed h-full z-20">
          <div className="flex items-center gap-3 mb-12 px-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-200">
              <Heart className="text-white w-5 h-5 fill-current" />
            </div>
            <span className="font-black text-xl tracking-tighter text-slate-900 italic">Wedding<span style={{ color: primaryColor }}>Studio</span></span>
          </div>
          <nav className="space-y-2 flex-1">
            <SidebarLink href="/dashboard" icon={<LayoutDashboard />} label="Tableau de bord" active={pathname === '/dashboard'} />
            <SidebarLink href="/dashboard/guests" icon={<Users />} label="Invités" active={pathname.includes('/guests')} />
            <SidebarLink href="/dashboard/tables" icon={<LayoutDashboard />} label="Plan de table" active={pathname.includes('/tables')} color={primaryColor} />
            <SidebarLink href="/dashboard/settings" icon={<Settings />} label="Paramètres" active={pathname.includes('/settings')} />
          </nav>
        </aside>

        <main className="flex-1 lg:ml-72 p-6 lg:p-12">
          <div className="max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Organisation</p>
                </div>
                <h1 className="text-4xl lg:text-5xl font-black italic text-slate-900">
                  Plan des <span className="bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">Tables</span>
                </h1>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 justify-center">
                <Plus className="w-5 h-5" /> Nouvelle table
              </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-4">
                <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-2xl p-8 sticky top-12 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 to-orange-300" />
                  <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                     <div className="p-2 bg-rose-50 rounded-xl"><UserPlus className="w-4 h-4 text-rose-500" /></div>
                     À placer <span className="text-rose-500">({unplacedGuests.length})</span>
                  </h2>
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Chercher un nom..." className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none" />
                  </div>
                  <SortableContext items={unplacedGuests.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      {loading ? <div className="animate-pulse h-12 bg-slate-50 rounded-2xl" /> : unplacedGuests.map(g => (
                        <DraggableGuest key={g.id} guest={g} />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </div>

              <div className="xl:col-span-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tables.map(table => (
                    <DroppableTable 
                      key={table.id} 
                      table={table} 
                      onDelete={deleteTable}
                      onRemoveGuest={removeGuestFromTable}
                      guestsAtTable={guests.filter(g => g.table_id === table.id)} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        <DragOverlay>
          {activeGuest ? (
            <div className="flex items-center gap-3 p-4 bg-white border-2 border-rose-400 rounded-2xl font-bold text-sm text-slate-700 shadow-2xl rotate-3 scale-105 pointer-events-none">
              <GripVertical className="w-4 h-4 text-rose-400" />
              {activeGuest.name}
            </div>
          ) : null}
        </DragOverlay>

      </DndContext>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[3.5rem] p-10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: primaryColor }} />
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black italic text-slate-900 leading-tight">Nouvelle <span style={{ color: primaryColor }}>Table</span></h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-all"><X /></button>
              </div>
              <form onSubmit={handleCreateTable} className="space-y-6">
                <input required placeholder="Nom de la table" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-5 px-6 font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400" value={newTable.name} onChange={e => setNewTable({...newTable, name: e.target.value})} />
                <input required type="number" min="1" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-5 px-6 font-bold text-slate-800 outline-none transition-all" value={newTable.capacity} onChange={e => setNewTable({...newTable, capacity: parseInt(e.target.value)})} />
                <button type="submit" disabled={isSubmitting} className="w-full py-6 rounded-[2.5rem] bg-slate-900 text-white font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:bg-rose-500 transition-all">
                  {isSubmitting ? "Création..." : "Confirmer la table"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border-2 ${toast.type === 'success' ? 'bg-slate-900 border-rose-500 text-white' : 'bg-white border-rose-500 text-rose-500'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-rose-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
            <span className="font-black text-xs uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({ href, icon, label, active, color }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all ${active ? 'bg-white shadow-xl text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
      <div className={active ? 'text-rose-500' : ''}>{icon}</div>
      <span>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
    </Link>
  );
}