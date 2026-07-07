"use client";
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Plus, Trash2, Search, Calendar, Loader2,
  Circle, Square, ZoomIn, ZoomOut, Sparkles, Move, 
  AlertCircle, X, ArrowLeft, Printer, Users
} from 'lucide-react';

export default function SeatingPlannerV21() {
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [marriage, setMarriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(0.85);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSide, setFilterSide] = useState<string>("all");
  
  const [error, setError] = useState<string | null>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0 });
  
  const [showAddModal, setShowAddModal] = useState<{show: boolean, shape: 'circle' | 'rectangle'}>({ show: false, shape: 'circle' });
  const [newTableData, setNewTableData] = useState({ name: '', capacity: 10 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      const { data: mData } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
      
      if (mData) {
        setMarriage(mData);
        const [tRes, gRes] = await Promise.all([
          supabase.from('tables').select('*').eq('marriage_id', mData.id),
          supabase.from('invite')
            .select('*')
            .eq('marriage_id', mData.id)
            .eq('status', 'confirmé') 
        ]);
        setTables(tRes.data || []);
        setGuests(gRes.data || []);
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  // Calcule l'occupation réelle d'une table en sommant les guests_count
  const getTableOccupancy = (tableId: string) => {
    return guests
      .filter(g => g.table_id === tableId)
      .reduce((sum, g) => sum + (parseInt(g.guests_count) || 1), 0);
  };

  const assignGuest = async (guestId: string, tableId: string | null) => {
    if (tableId) {
        const table = tables.find(t => t.id === tableId);
        const guest = guests.find(g => g.id === guestId);
        const groupSize = parseInt(guest?.guests_count) || 1;
        const currentOccupancy = getTableOccupancy(tableId);

        if (currentOccupancy + groupSize > table.capacity) {
            setError(`Capacité insuffisante : ce groupe compte ${groupSize} personnes.`);
            return;
        }
    }
    await supabase.from('invite').update({ table_id: tableId }).eq('id', guestId);
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, table_id: tableId } : g));
  };

  const deleteTable = async (tableId: string) => {
    const { error } = await supabase.from('tables').delete().eq('id', tableId);
    if (!error) {
      setTables(prev => prev.filter(t => t.id !== tableId));
      setGuests(prev => prev.map(g => g.table_id === tableId ? { ...g, table_id: null } : g));
    } else {
      setError("Erreur lors de la suppression de la table.");
    }
  };

  const getSideLabel = (side: string) => {
    if (side === 'partenaire_1') return 'Marié';
    if (side === 'partenaire_2') return 'Mariée';
    return 'Commun';
  };

  const getSideColor = (side: string) => {
    if (side === 'partenaire_1') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (side === 'partenaire_2') return 'bg-pink-50 text-pink-700 border-pink-100';
    return 'bg-purple-50 text-purple-700 border-purple-100';
  };

  // ÉCRAN DE CHARGEMENT ÉLÉGANT (Fini le carré blanc vide)
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#FDFBF7] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-amber-600" size={40} />
        <p className="font-luxury italic text-xl text-slate-800 tracking-wide animate-pulse">
          Chargement du plan de table...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#FDFBF7] flex overflow-hidden font-ui">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Montserrat:wght@300;400;600;800&display=swap');
        .font-luxury { font-family: 'Playfair Display', serif; }
        .font-ui { font-family: 'Montserrat', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D4AF37; border-radius: 10px; }
        
        @media print {
          aside, header, .no-print { display: none !important; }
          main { width: 100% !important; height: auto !important; position: static !important; }
          .canvas-container { 
            transform: scale(1) !important; 
            position: relative !important;
            background-image: none !important;
            width: 100% !important;
            height: auto !important;
          }
          .table-card { border: 1px solid #eee !important; box-shadow: none !important; }
        }
      `}} />

      {/* NOTIFICATION */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 20, x: 20 }} animate={{ opacity: 1, y: 0, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed bottom-8 right-8 z-[200] flex items-center gap-4 bg-white border-l-4 border-red-500 shadow-2xl p-5 rounded-r-2xl min-w-[300px] no-print">
            <div className="bg-red-50 p-2 rounded-full text-red-500"><AlertCircle size={20} /></div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-0.5">Attention</p>
              <p className="text-[12px] font-bold text-slate-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-slate-300 hover:text-slate-500"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside className="w-[400px] bg-white border-r border-amber-100 flex flex-col z-40 shadow-xl h-full overflow-hidden shrink-0 no-print">
        <div className="p-8 pb-4 shrink-0 border-b border-amber-50">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-600 mb-1">Gestion</h2>
          <h3 className="text-2xl font-luxury italic">Liste des Confirmés</h3>
          <div className="flex gap-1 mt-6 p-1 bg-slate-50 rounded-lg">
            {['all', 'partenaire_1', 'partenaire_2', 'commun'].map((s) => (
              <button key={s} onClick={() => setFilterSide(s)} className={`flex-1 py-2 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all ${filterSide === s ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {s === 'all' ? 'Tous' : s === 'partenaire_1' ? 'Marié' : s === 'partenaire_2' ? 'Mariée' : 'Commun'}
              </button>
            ))}
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border-none text-[11px] font-bold outline-none focus:ring-1 focus:ring-amber-400" placeholder="Rechercher..." onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3 custom-scrollbar bg-slate-50/30">
          {guests.filter(g => !g.table_id && (filterSide === "all" || g.side === filterSide) && (g.name || g.nom || "").toLowerCase().includes(searchTerm.toLowerCase())).map(guest => {
            const groupSize = parseInt(guest.guests_count) || 1;
            return (
              <div key={guest.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm relative group">
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[7px] font-bold uppercase border ${getSideColor(guest.side)}`}>{getSideLabel(guest.side)}</span>
                <div className="flex items-center gap-2 mb-3 pr-12">
                  <p className="font-bold text-[11px] text-slate-800">{guest.name || guest.nom}</p>
                  {groupSize > 1 && (
                    <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full font-black flex items-center gap-1">
                      <Users size={8} /> {groupSize}
                    </span>
                  )}
                </div>
                <select onChange={(e) => assignGuest(guest.id, e.target.value)} className="w-full text-[10px] font-bold bg-slate-50 rounded-lg p-2 outline-none">
                  <option value="">Placer...</option>
                  {tables.map(t => {
                    const remaining = t.capacity - getTableOccupancy(t.id);
                    return (
                      <option key={t.id} value={t.id} disabled={remaining < groupSize}>
                        {t.name} ({remaining} places libres)
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {/* HEADER */}
        <header className="h-28 bg-white/90 backdrop-blur-md border-b border-amber-100 flex justify-between items-center px-12 z-50 shrink-0 no-print">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/dashboard')} className="p-3 bg-slate-50 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all border border-slate-100 shadow-sm group">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-3xl font-luxury text-slate-900">{marriage?.partner_1_name} <span className="text-amber-500 italic">&</span> {marriage?.partner_2_name}</h1>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-2">
                  <Calendar size={12} className="text-amber-500" /> {marriage?.wedding_date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-3 bg-white border border-amber-200 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all shadow-sm">
              <Printer size={14} /> Imprimer
            </button>
            <div className="flex items-center bg-white rounded-full p-1 border border-amber-100 shadow-sm">
              <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 text-slate-400 hover:text-amber-600"><ZoomOut size={18}/></button>
              <span className="text-[10px] font-black w-12 text-center text-slate-600">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 text-slate-400 hover:text-amber-600"><ZoomIn size={18}/></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setNewTableData({ name: '', capacity: 10 }); setShowAddModal({show: true, shape: 'circle'}); }} className="bg-white border border-amber-200 text-amber-700 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-amber-50 transition-colors">+ Ronde</button>
              <button onClick={() => { setNewTableData({ name: '', capacity: 10 }); setShowAddModal({show: true, shape: 'rectangle'}); }} className="bg-slate-900 text-white px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-colors">+ Rectangulaire</button>
            </div>
          </div>
        </header>

        {/* CANEVAS */}
        <div 
          ref={containerRef}
          className={`flex-1 relative overflow-hidden bg-[#FDFBF7] ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
          onMouseDown={(e) => { if (e.button === 1 || (e.button === 0 && e.altKey)) setIsPanning(true); }}
          onMouseMove={(e) => { if (isPanning) setCameraPos(p => ({ x: p.x + e.movementX, y: p.y + e.movementY })); }}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
        >
          <motion.div 
            style={{ 
              x: cameraPos.x, y: cameraPos.y, scale: zoom,
              backgroundImage: 'radial-gradient(#D4AF37 0.8px, transparent 0.8px)', backgroundSize: '80px 80px' 
            }}
            className="w-[10000px] h-[10000px] absolute top-0 left-0 origin-top-left canvas-container"
          >
            <AnimatePresence>
              {tables.map((table) => {
                const tableGuests = guests.filter(g => g.table_id === table.id);
                const currentOccupancy = getTableOccupancy(table.id);
                return (
                  <motion.div key={table.id} drag dragMomentum={false} 
                    onDragEnd={(e, info) => {
                        const x = (info.point.x - cameraPos.x) / zoom;
                        const y = (info.point.y - cameraPos.y) / zoom;
                        supabase.from('tables').update({ position_x: x, position_y: y }).eq('id', table.id);
                        setTables(prev => prev.map(t => t.id === table.id ? { ...t, position_x: x, position_y: y } : t));
                    }} 
                    style={{ x: table.position_x, y: table.position_y }}
                    className="absolute z-10 group"
                  >
                    <div className={`table-card bg-white shadow-xl flex flex-col items-center justify-center p-6 border border-amber-50 cursor-grab active:cursor-grabbing transition-all hover:border-amber-300 relative ${table.shape === 'circle' ? 'rounded-full w-72 h-72' : 'rounded-[2rem] w-80 h-60'}`}>
                      <button onClick={() => deleteTable(table.id)} className="absolute -top-2 -right-2 bg-white text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full shadow-lg border border-red-50 opacity-0 group-hover:opacity-100 transition-all z-20 no-print">
                        <Trash2 size={14} />
                      </button>
                      <input className="text-center font-luxury text-lg text-slate-800 bg-transparent border-none w-full" defaultValue={table.name} onBlur={(e) => supabase.from('tables').update({ name: e.target.value }).eq('id', table.id)} />
                      
                      {/* Compteur d'occupation réelle */}
                      <span className={`text-[9px] font-black uppercase tracking-widest mb-4 ${currentOccupancy > table.capacity ? 'text-red-600' : 'text-amber-600'}`}>
                        {currentOccupancy} / {table.capacity} PLACES
                      </span>

                      <div className="flex flex-wrap justify-center gap-1 overflow-y-auto max-h-[120px] px-2 custom-scrollbar">
                        {tableGuests.map(g => {
                          const gCount = parseInt(g.guests_count) || 1;
                          return (
                            <div key={g.id} onClick={() => assignGuest(g.id, null)} className={`text-[8px] font-bold px-2 py-1 rounded-md border cursor-pointer hover:bg-red-500 hover:text-white transition-all flex items-center gap-1 ${getSideColor(g.side)}`}>
                              {g.name || g.nom}
                              {gCount > 1 && <span className="opacity-60 text-[7px]">x{gCount}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* MODAL AJOUT (Logique d'input nettoyée) */}
      <AnimatePresence>
        {showAddModal.show && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[3rem] p-12 w-full max-w-md shadow-2xl border border-amber-100">
              <h3 className="text-3xl font-luxury text-center mb-8">Nouvelle Table</h3>
              <div className="space-y-6">
                <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm outline-none focus:ring-1 focus:ring-amber-300 transition-all" placeholder="Nom de la table" value={newTableData.name} onChange={(e) => setNewTableData({...newTableData, name: e.target.value})} />
                
                <input 
                    type="number" 
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm outline-none focus:ring-1 focus:ring-amber-300 transition-all" 
                    placeholder="Capacité (ex: 10)" 
                    value={newTableData.capacity || ''} 
                    onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setNewTableData({...newTableData, capacity: val});
                    }} 
                />

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowAddModal({show: false, shape: 'circle'})} className="flex-1 font-bold text-slate-400 text-[11px] uppercase tracking-widest hover:text-slate-600 transition-colors">Annuler</button>
                  <button onClick={async () => {
                     const capacityToSend = newTableData.capacity <= 0 ? 10 : newTableData.capacity;
                     const { data } = await supabase.from('tables').insert([{ marriage_id: marriage.id, name: newTableData.name || `Table ${tables.length + 1}`, capacity: capacityToSend, shape: showAddModal.shape, position_x: 200, position_y: 200 }]).select().single();
                     if (data) { setTables([...tables, data]); setShowAddModal({ show: false, shape: 'circle' }); }
                  }} className="flex-1 bg-amber-500 text-white py-4 rounded-full font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-amber-600 transition-colors">Créer</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}