"use client";
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Plus, Trash2, Search, Calendar, Loader2, ZoomIn, ZoomOut, Sparkles, 
  AlertCircle, X, ArrowLeft, Printer, Users, Tag, Grid, Layout, UserPlus,
  Move, Disc, Compass
} from 'lucide-react';

export default function SeatingPlannerV23() {
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [marriage, setMarriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'canvas'>('canvas');
  
  const [zoom, setZoom] = useState(0.8);
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [danceFloor, setDanceFloor] = useState({ x: 650, y: 350, width: 300, height: 200 });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterSide, setFilterSide] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<{show: boolean, shape: 'circle' | 'rectangle'}>({ show: false, shape: 'circle' });
  const [newTableData, setNewTableData] = useState({ name: '', capacity: 10 });

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
      if (!user) return;
      
      const { data: mData } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
      
      if (mData) {
        setMarriage(mData);
        const [tRes, gRes] = await Promise.all([
          supabase.from('tables').select('*').eq('marriage_id', mData.id).order('created_at', { ascending: true }),
          supabase.from('invite')
            .select('*')
            .eq('marriage_id', mData.id)
            .eq('status', 'confirmé')
            .eq('attending_reception', true) 
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

  const totalReceptionGuests = guests.reduce((sum, g) => sum + (parseInt(g.guests_count) || 1), 0);
  const totalAssignedGuests = guests.filter(g => g.table_id).reduce((sum, g) => sum + (parseInt(g.guests_count) || 1), 0);

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
            setError(`Capacité dépassée : ce groupe compte ${groupSize} p.`);
            return;
        }
    }
    await supabase.from('invite').update({ table_id: tableId }).eq('id', guestId);
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, table_id: tableId } : g));
  };

  const deleteTable = async (tableId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette table ? Les invités replaceront en liste d'attente.")) return;
    const { error } = await supabase.from('tables').delete().eq('id', tableId);
    if (!error) {
      setTables(prev => prev.filter(t => t.id !== tableId));
      setGuests(prev => prev.map(g => g.table_id === tableId ? { ...g, table_id: null } : g));
    }
  };

  // ALGORITHME DE DISPOSITION DE SALLE
  const applyLayoutPreset = async (preset: 'U' | 'square' | 'banquet' | 'double_line') => {
    if (tables.length === 0) {
      setError("Veuillez d'abord créer des tables avant d'appliquer une disposition.");
      return;
    }

    const updatedTables = [...tables];
    const centerX = 800;
    const centerY = 450;
    const spacingX = 260;
    const spacingY = 220;

    if (preset === 'U') {
      const count = updatedTables.length;
      const topCount = Math.ceil(count / 3);
      const sideCount = Math.floor((count - topCount) / 2);

      let index = 0;
      // Haut du U
      for (let i = 0; i < topCount && index < count; i++) {
        updatedTables[index].position_x = centerX - ((topCount - 1) * spacingX) / 2 + i * spacingX;
        updatedTables[index].position_y = centerY - 250;
        index++;
      }
      // Branche Gauche
      for (let i = 0; i < sideCount && index < count; i++) {
        updatedTables[index].position_x = centerX - ((topCount - 1) * spacingX) / 2;
        updatedTables[index].position_y = centerY - 250 + (i + 1) * spacingY;
        index++;
      }
      // Branche Droite
      for (let i = 0; i < sideCount && index < count; i++) {
        updatedTables[index].position_x = centerX + ((topCount - 1) * spacingX) / 2;
        updatedTables[index].position_y = centerY - 250 + (i + 1) * spacingY;
        index++;
      }
      setDanceFloor({ x: centerX - 125, y: centerY - 50, width: 250, height: 180 });

    } else if (preset === 'square') {
      const radius = Math.max(320, updatedTables.length * 45);
      updatedTables.forEach((t, i) => {
        const angle = (i / updatedTables.length) * 2 * Math.PI;
        t.position_x = centerX + radius * Math.cos(angle);
        t.position_y = centerY + radius * Math.sin(angle);
      });
      setDanceFloor({ x: centerX - 140, y: centerY - 100, width: 280, height: 200 });

    } else if (preset === 'double_line') {
      const half = Math.ceil(updatedTables.length / 2);
      updatedTables.forEach((t, i) => {
        const row = i < half ? 0 : 1;
        const col = i % half;
        t.position_x = centerX - ((half - 1) * spacingX) / 2 + col * spacingX;
        t.position_y = row === 0 ? centerY - 280 : centerY + 280;
      });
      setDanceFloor({ x: centerX - 180, y: centerY - 80, width: 360, height: 160 });
    }

    setTables(updatedTables);

    // Sauvegarde des nouvelles positions
    for (const t of updatedTables) {
      await supabase.from('tables').update({ position_x: t.position_x, position_y: t.position_y }).eq('id', t.id);
    }
  };

  const getGuestCategory = (guest: any) => guest.category || guest.relation || guest.group || 'Invité';
  const getSideLabel = (side: string) => side === 'partenaire_1' ? 'Marié' : side === 'partenaire_2' ? 'Mariée' : 'Commun';
  
  const categoriesList = Array.from(new Set(guests.map(g => getGuestCategory(g))));

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-amber-600" size={40} />
        <p className="font-luxury italic text-xl text-slate-800">Chargement de la gestion des tables...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#FAF8F5] flex flex-col font-ui overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,600&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        .font-luxury { font-family: 'Playfair Display', serif; }
        .font-ui { font-family: 'Montserrat', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D4AF37; border-radius: 10px; }
        
        @media print {
          body * { visibility: hidden; }
          #pco-print-zone, #pco-print-zone * { visibility: visible; }
          #pco-print-zone { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* ALERTE */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-6 right-6 z-[200] flex items-center gap-3 bg-red-600 text-white px-5 py-4 rounded-2xl shadow-2xl no-print">
            <AlertCircle size={20} />
            <p className="text-xs font-bold">{error}</p>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER PRINCIPAL */}
      <header className="bg-white border-b border-amber-100/80 px-8 py-4 flex justify-between items-center z-30 shadow-sm shrink-0 no-print">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push('/dashboard')} className="p-2.5 bg-slate-50 text-slate-500 hover:text-amber-600 rounded-xl transition-all border border-slate-200">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-luxury font-bold text-slate-900">{marriage?.partner_1_name} <span className="text-amber-500 italic">&</span> {marriage?.partner_2_name}</h1>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Users size={14} className="text-amber-600" />
                {totalAssignedGuests} / {totalReceptionGuests} Placé(s)
              </span>
            </div>
          </div>
        </div>

        {/* SWITCHER DE VUES + ACTIONS */}
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button onClick={() => setViewMode('canvas')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'canvas' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Layout size={15} /> Plan Visuel (Salle)
            </button>
            <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Grid size={15} /> Vue Cartes
            </button>
          </div>

          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md">
            <Printer size={15} /> Feuille PCO
          </button>

          <button onClick={() => setShowAddModal({ show: true, shape: 'circle' })} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-md">
            <Plus size={16} /> Ajouter Table
          </button>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden no-print">
        {/* PANNEAU GAUCHE : INVITÉS NON PLACÉS */}
        <aside className="w-96 bg-white border-r border-amber-100 flex flex-col shrink-0">
          <div className="p-5 border-b border-amber-50 bg-slate-50/50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Non placés</h3>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {guests.filter(g => !g.table_id).length} fiche(s)
              </span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-medium outline-none focus:border-amber-400" placeholder="Rechercher par nom..." onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {['all', 'partenaire_1', 'partenaire_2'].map((s) => (
                  <button key={s} onClick={() => setFilterSide(s)} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all ${filterSide === s ? 'bg-amber-500 text-white' : 'text-slate-500'}`}>
                    {s === 'all' ? 'Tous' : s === 'partenaire_1' ? 'Marié' : 'Mariée'}
                  </button>
                ))}
              </div>

              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700 outline-none">
                <option value="all">Toutes les mentions (Amis, Parents...)</option>
                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-slate-50/30">
            {guests.filter(g => !g.table_id && 
              (filterSide === "all" || g.side === filterSide) && 
              (filterCategory === "all" || getGuestCategory(g) === filterCategory) &&
              (g.name || g.nom || "").toLowerCase().includes(searchTerm.toLowerCase())
            ).map(guest => {
              const groupSize = parseInt(guest.guests_count) || 1;
              return (
                <div key={guest.id} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-xs text-slate-800">{guest.name || guest.nom}</p>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-bold border border-slate-200">
                      {getGuestCategory(guest)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                      <Users size={10} /> {groupSize} p.
                    </span>
                    <select onChange={(e) => assignGuest(guest.id, e.target.value)} className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-1.5 outline-none cursor-pointer">
                      <option value="">Placer sur...</option>
                      {tables.map(t => {
                        const remaining = t.capacity - getTableOccupancy(t.id);
                        return (
                          <option key={t.id} value={t.id} disabled={remaining < groupSize}>
                            {t.name} ({remaining} p. libres)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ZONE DE CANVAS VISUEL AVEC DISPOSITIONS AUTOMATIQUES */}
        <main className="flex-1 bg-[#F5F2EB] relative overflow-hidden flex flex-col">
          {viewMode === 'canvas' && (
            <>
              {/* BARRE D'OUTILS DISPOSITIONS ET ZOOM */}
              <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-amber-100/80 flex items-center gap-2 pointer-events-auto">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2 flex items-center gap-1">
                    <Compass size={12} className="text-amber-500" /> Dispositions :
                  </span>
                  <button onClick={() => applyLayoutPreset('U')} className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-xl text-xs font-bold transition-all">
                    Disposition en U
                  </button>
                  <button onClick={() => applyLayoutPreset('square')} className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-xl text-xs font-bold transition-all">
                    Autour du Bal
                  </button>
                  <button onClick={() => applyLayoutPreset('double_line')} className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-xl text-xs font-bold transition-all">
                    Lignes Parallèles
                  </button>
                </div>

                <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-amber-100/80 flex items-center gap-2 pointer-events-auto">
                  <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600"><ZoomOut size={16}/></button>
                  <span className="text-xs font-bold text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600"><ZoomIn size={16}/></button>
                </div>
              </div>

              {/* CANEVAS INTERACTIF */}
              <div 
                className={`flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden`}
                onMouseDown={(e) => { if (e.button === 0 && (e.target as HTMLElement).tagName === 'DIV') setIsPanning(true); }}
                onMouseMove={(e) => { if (isPanning) setCameraPos(p => ({ x: p.x + e.movementX, y: p.y + e.movementY })); }}
                onMouseUp={() => setIsPanning(false)}
              >
                <div 
                  style={{ 
                    transform: `translate(${cameraPos.x}px, ${cameraPos.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    backgroundImage: 'radial-gradient(#D4AF37 0.7px, transparent 0.7px)',
                    backgroundSize: '40px 40px'
                  }}
                  className="w-[4000px] h-[3000px] absolute top-0 left-0 transition-transform duration-75"
                >
                  {/* PISTE DE DANSE */}
                  <motion.div 
                    drag 
                    dragMomentum={false}
                    onDragEnd={(e, info) => setDanceFloor(prev => ({ ...prev, x: prev.x + info.delta.x, y: prev.y + info.delta.y }))}
                    style={{ x: danceFloor.x, y: danceFloor.y, width: danceFloor.width, height: danceFloor.height }}
                    className="absolute z-0 bg-gradient-to-br from-amber-100/80 via-amber-200/50 to-amber-100/80 border-2 border-dashed border-amber-400/80 rounded-3xl shadow-inner flex flex-col items-center justify-center p-4 cursor-move backdrop-blur-xs"
                  >
                    <Disc size={28} className="text-amber-600 mb-1 animate-spin-slow" />
                    <p className="font-luxury font-bold text-amber-900 text-sm tracking-wider uppercase">Piste de Danse</p>
                    <span className="text-[9px] font-bold text-amber-700/70 uppercase">Espace Réception</span>
                  </motion.div>

                  {/* TABLES SUR LE PLAN */}
                  {tables.map((table) => {
                    const tableGuests = guests.filter(g => g.table_id === table.id);
                    const currentOccupancy = getTableOccupancy(table.id);

                    return (
                      <motion.div 
                        key={table.id} 
                        drag 
                        dragMomentum={false} 
                        onDragEnd={(e, info) => {
                          const newX = table.position_x + info.delta.x / zoom;
                          const newY = table.position_y + info.delta.y / zoom;
                          supabase.from('tables').update({ position_x: newX, position_y: newY }).eq('id', table.id);
                          setTables(prev => prev.map(t => t.id === table.id ? { ...t, position_x: newX, position_y: newY } : t));
                        }}
                        style={{ x: table.position_x || 200, y: table.position_y || 200 }}
                        className="absolute z-10 group"
                      >
                        <div className={`bg-white/95 backdrop-blur-md border-2 border-amber-200/90 shadow-xl flex flex-col items-center justify-between p-4 cursor-grab active:cursor-grabbing hover:border-amber-400 transition-all ${table.shape === 'circle' ? 'rounded-full w-64 h-64' : 'rounded-3xl w-72 h-52'}`}>
                          
                          <button onClick={() => deleteTable(table.id)} className="absolute -top-2 -right-2 bg-white text-red-500 hover:bg-red-50 p-1.5 rounded-full shadow-md border border-red-100 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={13} />
                          </button>

                          <div className="text-center mt-1">
                            <input className="font-luxury font-bold text-slate-800 text-sm text-center bg-transparent outline-none" defaultValue={table.name} onBlur={(e) => supabase.from('tables').update({ name: e.target.value }).eq('id', table.id)} />
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">
                              {currentOccupancy} / {table.capacity} places
                            </span>
                          </div>

                          <div className="w-full flex-1 overflow-y-auto my-2 space-y-1 custom-scrollbar px-1">
                            {tableGuests.map(g => (
                              <div key={g.id} className="text-[9px] font-bold bg-amber-50/80 border border-amber-100 text-slate-700 px-2 py-1 rounded-lg flex justify-between items-center">
                                <span className="truncate max-w-[110px]">{g.name || g.nom}</span>
                                <span className="text-[7px] text-amber-800 font-extrabold bg-amber-200/50 px-1 rounded">{getGuestCategory(g)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, (currentOccupancy / table.capacity) * 100)}%` }} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {viewMode === 'grid' && (
            <div className="p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {tables.map(table => {
                  const tableGuests = guests.filter(g => g.table_id === table.id);
                  const currentOccupancy = getTableOccupancy(table.id);
                  return (
                    <div key={table.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                      <div className="flex justify-between items-center border-b pb-2 mb-3">
                        <h3 className="font-luxury font-bold text-slate-800">{table.name}</h3>
                        <span className="text-xs font-bold text-amber-600">{currentOccupancy} / {table.capacity} p.</span>
                      </div>
                      <div className="space-y-1.5">
                        {tableGuests.map(g => (
                          <div key={g.id} className="text-xs p-2 bg-slate-50 rounded-lg flex justify-between">
                            <span>{g.name || g.nom}</span>
                            <span className="font-bold text-amber-700">{getGuestCategory(g)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DOCUMENT D'IMPRESSION PCO */}
      <div id="pco-print-zone" className="hidden p-8 bg-white font-ui text-black">
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">Feuille de Route PCO - Plan de Table</h1>
            <p className="text-sm font-medium text-slate-600">Mariage : {marriage?.partner_1_name} & {marriage?.partner_2_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold">Date : {marriage?.wedding_date}</p>
            <p className="text-xs font-bold">Total Réception : {totalReceptionGuests} Invités</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {tables.map(table => {
            const tableGuests = guests.filter(g => g.table_id === table.id);
            const currentOccupancy = getTableOccupancy(table.id);

            return (
              <div key={table.id} className="border border-slate-400 rounded-lg p-4 break-inside-avoid">
                <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
                  <h3 className="font-bold text-base">{table.name}</h3>
                  <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    {currentOccupancy} / {table.capacity} Couverts
                  </span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-1">Nom / Groupe</th>
                      <th className="py-1">Catégorie</th>
                      <th className="py-1">Côté</th>
                      <th className="py-1 text-right">Couverts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableGuests.map(g => (
                      <tr key={g.id} className="border-b border-slate-100">
                        <td className="py-1.5 font-bold">{g.name || g.nom}</td>
                        <td className="py-1.5">{getGuestCategory(g)}</td>
                        <td className="py-1.5">{getSideLabel(g.side)}</td>
                        <td className="py-1.5 text-right font-bold">{g.guests_count || 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL CREATION TABLE */}
      <AnimatePresence>
        {showAddModal.show && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold font-luxury mb-6 text-center">Ajouter une Table</h3>
              <div className="space-y-4">
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none" placeholder="Nom de la table (ex: Table Orchidée)" value={newTableData.name} onChange={(e) => setNewTableData({...newTableData, name: e.target.value})} />
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none" placeholder="Capacité (ex: 10)" value={newTableData.capacity || ''} onChange={(e) => setNewTableData({...newTableData, capacity: parseInt(e.target.value) || 0})} />
                
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAddModal({ show: false, shape: 'circle' })} className="flex-1 py-3 text-xs font-bold text-slate-400">Annuler</button>
                  <button onClick={async () => {
                    const cap = newTableData.capacity <= 0 ? 10 : newTableData.capacity;
                    const { data } = await supabase.from('tables').insert([{ marriage_id: marriage.id, name: newTableData.name || `Table ${tables.length + 1}`, capacity: cap, shape: showAddModal.shape, position_x: 750, position_y: 200 }]).select().single();
                    if (data) { setTables([...tables, data]); setShowAddModal({ show: false, shape: 'circle' }); }
                  }} className="flex-1 bg-amber-500 text-white py-3 rounded-xl text-xs font-bold shadow-md">Créer la table</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}