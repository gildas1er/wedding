"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Plus, Trash2, Search, Loader2, ZoomIn, ZoomOut, Crown,
  X, ArrowLeft, Printer, Users, Grid, Layout,
  Disc, Compass, Move
} from 'lucide-react';

export default function SeatingPlannerV24() {
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [marriage, setMarriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'canvas'>('canvas');
  
  const [zoom, setZoom] = useState(0.85);
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [danceFloor, setDanceFloor] = useState({ x: 750, y: 380, width: 340, height: 200 });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterSide, setFilterSide] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<{show: boolean, shape: 'circle' | 'rectangle'}>({ show: false, shape: 'circle' });
  const [newTableData, setNewTableData] = useState({ name: '', capacity: 10, is_vip: false });

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

  const toggleVipStatus = async (tableId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, is_vip: nextStatus } : t));
    await supabase.from('tables').update({ is_vip: nextStatus }).eq('id', tableId);
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
    if (!confirm("Voulez-vous vraiment supprimer cette table ?")) return;
    const { error } = await supabase.from('tables').delete().eq('id', tableId);
    if (!error) {
      setTables(prev => prev.filter(t => t.id !== tableId));
      setGuests(prev => prev.map(g => g.table_id === tableId ? { ...g, table_id: null } : g));
    }
  };

  const applyLayoutPreset = async (preset: 'U' | 'square' | 'double_line') => {
    if (tables.length === 0) return;

    const updatedTables = [...tables];
    const centerX = 900;
    const centerY = 500;
    const spacingX = 300;
    const spacingY = 260;

    if (preset === 'U') {
      const count = updatedTables.length;
      const topCount = Math.ceil(count / 3);
      const sideCount = Math.floor((count - topCount) / 2);

      let index = 0;
      for (let i = 0; i < topCount && index < count; i++) {
        updatedTables[index].position_x = centerX - ((topCount - 1) * spacingX) / 2 + i * spacingX;
        updatedTables[index].position_y = centerY - 300;
        index++;
      }
      for (let i = 0; i < sideCount && index < count; i++) {
        updatedTables[index].position_x = centerX - ((topCount - 1) * spacingX) / 2;
        updatedTables[index].position_y = centerY - 300 + (i + 1) * spacingY;
        index++;
      }
      for (let i = 0; i < sideCount && index < count; i++) {
        updatedTables[index].position_x = centerX + ((topCount - 1) * spacingX) / 2;
        updatedTables[index].position_y = centerY - 300 + (i + 1) * spacingY;
        index++;
      }
      setDanceFloor({ x: centerX - 170, y: centerY - 60, width: 340, height: 200 });

    } else if (preset === 'square') {
      const radius = Math.max(350, updatedTables.length * 48);
      updatedTables.forEach((t, i) => {
        const angle = (i / updatedTables.length) * 2 * Math.PI;
        t.position_x = centerX + radius * Math.cos(angle);
        t.position_y = centerY + radius * Math.sin(angle);
      });
      setDanceFloor({ x: centerX - 170, y: centerY - 100, width: 340, height: 200 });

    } else if (preset === 'double_line') {
      const half = Math.ceil(updatedTables.length / 2);
      updatedTables.forEach((t, i) => {
        const row = i < half ? 0 : 1;
        const col = i % half;
        t.position_x = centerX - ((half - 1) * spacingX) / 2 + col * spacingX;
        t.position_y = row === 0 ? centerY - 280 : centerY + 280;
      });
      setDanceFloor({ x: centerX - 190, y: centerY - 90, width: 380, height: 180 });
    }

    setTables(updatedTables);
    for (const t of updatedTables) {
      await supabase.from('tables').update({ position_x: t.position_x, position_y: t.position_y }).eq('id', t.id);
    }
  };

  const getGuestCategory = (guest: any) => guest.category || guest.relation || guest.group || 'Invité';
  const getSideLabel = (side: string) => side === 'partenaire_1' ? 'Marié' : side === 'partenaire_2' ? 'Mariée' : 'Commun';
  const categoriesList = Array.from(new Set(guests.map(g => getGuestCategory(g))));

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-slate-700" size={36} />
        <p className="text-sm font-semibold text-slate-600">Chargement du plan...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F1F5F9] flex flex-col font-sans overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 6px; }
        
        @media print {
          body { background: white !important; color: black !important; }
          body * { visibility: hidden; }
          #pco-print-zone, #pco-print-zone * { visibility: visible; }
          #pco-print-zone { 
            position: absolute !important; left: 0 !important; top: 0 !important; 
            width: 100% !important; display: block !important; margin: 0 !important; padding: 0 !important;
          }
          .no-print { display: none !important; }
          .print-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: inline-block !important;
            width: 100% !important;
            margin-bottom: 1.5rem !important;
          }
        }
      `}} />

      {/* HEADER TOP BAR */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-30 shadow-xs shrink-0 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900">{marriage?.partner_1_name} & {marriage?.partner_2_name}</h1>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Users size={13} className="text-slate-500" />
                {totalAssignedGuests} / {totalReceptionGuests} Placé(s)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
            <button onClick={() => setViewMode('canvas')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'canvas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
              <Layout size={14} /> Plan 2D Interactif
            </button>
            <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
              <Grid size={14} /> Vue Liste / Cartes
            </button>
          </div>

          <button onClick={() => window.print()} className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xs">
            <Printer size={14} /> Feuille PCO
          </button>

          <button onClick={() => setShowAddModal({ show: true, shape: 'circle' })} className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-xs">
            <Plus size={15} /> Nouvelle Table
          </button>
        </div>
      </header>

      {/* BODY MAIN */}
      <div className="flex-1 flex overflow-hidden no-print">
        
        {/* ASIDE - PANNEAU GAUCHE DE GESTION */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Invités non placés</h3>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {guests.filter(g => !g.table_id).length} en attente
              </span>
            </div>

            <div className="relative mb-2.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium outline-none focus:border-blue-500" placeholder="Chercher un nom..." onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex gap-1 bg-slate-200/60 p-1 rounded-lg">
                {['all', 'partenaire_1', 'partenaire_2'].map((s) => (
                  <button key={s} onClick={() => setFilterSide(s)} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all ${filterSide === s ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}>
                    {s === 'all' ? 'Tous' : s === 'partenaire_1' ? 'Marié' : 'Mariée'}
                  </button>
                ))}
              </div>

              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-700 outline-none">
                <option value="all">Toutes catégories</option>
                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/30">
            {guests.filter(g => !g.table_id && 
              (filterSide === "all" || g.side === filterSide) && 
              (filterCategory === "all" || getGuestCategory(g) === filterCategory) &&
              (g.name || g.nom || "").toLowerCase().includes(searchTerm.toLowerCase())
            ).map(guest => {
              const groupSize = parseInt(guest.guests_count) || 1;
              return (
                <div key={guest.id} className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-xs text-slate-900 truncate max-w-[150px]">{guest.name || guest.nom}</p>
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-bold border border-slate-200">
                      {getGuestCategory(guest)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Users size={11} /> {groupSize} pers.
                    </span>
                    <select onChange={(e) => assignGuest(guest.id, e.target.value)} className="text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200 rounded-md p-1 outline-none cursor-pointer hover:bg-blue-100">
                      <option value="">Placer sur...</option>
                      {tables.map(t => {
                        const remaining = t.capacity - getTableOccupancy(t.id);
                        return (
                          <option key={t.id} value={t.id} disabled={remaining < groupSize}>
                            {t.is_vip ? '⭐ ' : ''}{t.name} ({remaining} disp.)
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

        {/* CONTENEUR PRINCIPAL (CANEVAS 2D / VUE GRILLE) */}
        <main className="flex-1 bg-slate-200/50 relative overflow-hidden flex flex-col">
          {viewMode === 'canvas' && (
            <>
              {/* BARRE DE DISPOSITION VUE 2D */}
              <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
                <div className="bg-white p-1.5 rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 pointer-events-auto">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
                    <Compass size={13} className="text-blue-600" /> Dispositions :
                  </span>
                  <button onClick={() => applyLayoutPreset('U')} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all">
                    Schéma en U
                  </button>
                  <button onClick={() => applyLayoutPreset('square')} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all">
                    Cercle
                  </button>
                  <button onClick={() => applyLayoutPreset('double_line')} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all">
                    Lignes parallèles
                  </button>
                </div>

                <div className="bg-white p-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1 pointer-events-auto">
                  <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"><ZoomOut size={15}/></button>
                  <span className="text-xs font-bold text-slate-700 w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(1.4, z + 0.1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"><ZoomIn size={15}/></button>
                </div>
              </div>

              {/* CANEVAS DE DESSIN 2D (VUE DU DESSUS) */}
              <div 
                className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
                onMouseDown={(e) => { if (e.button === 0 && (e.target as HTMLElement).tagName === 'DIV') setIsPanning(true); }}
                onMouseMove={(e) => { if (isPanning) setCameraPos(p => ({ x: p.x + e.movementX, y: p.y + e.movementY })); }}
                onMouseUp={() => setIsPanning(false)}
              >
                <div 
                  style={{ 
                    transform: `translate(${cameraPos.x}px, ${cameraPos.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
                    backgroundSize: '30px 30px'
                  }}
                  className="w-[4000px] h-[3000px] absolute top-0 left-0 transition-transform duration-75"
                >
                  {/* PISTE DE DANSE 2D */}
                  <motion.div 
                    drag 
                    dragMomentum={false}
                    onDragEnd={(e, info) => setDanceFloor(prev => ({ ...prev, x: prev.x + info.delta.x / zoom, y: prev.y + info.delta.y / zoom }))}
                    style={{ x: danceFloor.x, y: danceFloor.y, width: danceFloor.width, height: danceFloor.height }}
                    className="absolute z-0 bg-slate-100 border-2 border-dashed border-slate-400 rounded-2xl flex flex-col items-center justify-center p-3 cursor-move shadow-2xs hover:border-slate-600 transition-colors"
                  >
                    <Disc size={24} className="text-slate-500 mb-1" />
                    <p className="font-bold text-slate-800 text-xs tracking-wider uppercase">Piste de Danse / Scène</p>
                    <span className="text-[9px] font-semibold text-slate-500">Vue du dessus 2D</span>
                  </motion.div>

                  {/* TABLES RONDES 2D */}
                  {tables.map((table) => {
                    const tableGuests = guests.filter(g => g.table_id === table.id);
                    const currentOccupancy = getTableOccupancy(table.id);
                    const isOverloaded = currentOccupancy > table.capacity;

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
                        className="absolute z-10 group cursor-grab active:cursor-grabbing"
                      >
                        {/* CONTENEUR TABLE ET CHAISES (VUE DE DESSUS) */}
                        <div className="relative flex items-center justify-center w-64 h-64">

                          {/* REPRÉSENTATION VISUELLE DES CHAISES AUTOUR DE LA TABLE */}
                          {Array.from({ length: table.capacity }).map((_, i) => {
                            const angle = (i / table.capacity) * (2 * Math.PI);
                            const radius = 100; // Distance des chaises du centre
                            const cx = Math.cos(angle) * radius;
                            const cy = Math.sin(angle) * radius;
                            const isChairOccupied = i < currentOccupancy;

                            return (
                              <div 
                                key={i}
                                style={{
                                  transform: `translate(${cx}px, ${cy}px)`,
                                }}
                                className={`absolute w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                                  isChairOccupied 
                                    ? table.is_vip ? 'bg-amber-400 border-amber-500 text-amber-950' : 'bg-blue-500 border-blue-600 text-white' 
                                    : 'bg-white border-slate-300'
                                }`}
                              >
                                <span className="text-[8px] font-bold">{i + 1}</span>
                              </div>
                            );
                          })}

                          {/* PLATEAU DE TABLE CENTRAL (2D CERCLE) */}
                          <div className={`w-44 h-44 rounded-full border-2 bg-white shadow-lg flex flex-col items-center justify-between p-3 relative transition-all ${
                            table.is_vip 
                              ? 'border-amber-400 ring-4 ring-amber-100' 
                              : isOverloaded 
                              ? 'border-red-500 bg-red-50/20' 
                              : 'border-slate-300 hover:border-slate-400'
                          }`}>

                            {/* BOUTON ACTIONS : VIP & SUPPRIMER */}
                            <div className="w-full flex justify-between items-center px-1 z-20">
                              <button 
                                onClick={() => toggleVipStatus(table.id, table.is_vip)} 
                                title="Basculer VIP"
                                className={`p-1 rounded-full transition-all ${table.is_vip ? 'bg-amber-400 text-amber-950' : 'text-slate-300 hover:text-amber-500'}`}
                              >
                                <Crown size={13} />
                              </button>

                              <button onClick={() => deleteTable(table.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* TITRE TABLE ET COMPTEUR */}
                            <div className="text-center w-full px-1">
                              <input 
                                className="font-bold text-slate-900 text-xs text-center bg-transparent outline-none w-full truncate focus:border-b focus:border-slate-400" 
                                defaultValue={table.name} 
                                onBlur={(e) => supabase.from('tables').update({ name: e.target.value }).eq('id', table.id)} 
                              />
                              <span className={`text-[9px] font-extrabold uppercase block mt-0.5 ${isOverloaded ? 'text-red-600' : 'text-slate-500'}`}>
                                {currentOccupancy} / {table.capacity} places
                              </span>
                            </div>

                            {/* LISTE DES INVITÉS ASSIGNÉS (PETITE LISTE 2D SCROLLABLE) */}
                            <div className="w-full flex-1 overflow-y-auto my-1 space-y-1 custom-scrollbar px-1 max-h-[60px] text-[8px]">
                              {tableGuests.length === 0 ? (
                                <p className="text-[8px] text-slate-300 italic text-center">Vide</p>
                              ) : (
                                tableGuests.map(g => (
                                  <div key={g.id} className="bg-slate-100 text-slate-800 font-semibold px-1.5 py-0.5 rounded flex justify-between items-center group/item">
                                    <span className="truncate max-w-[80px]">{g.name || g.nom}</span>
                                    <button onClick={() => assignGuest(g.id, null)} className="text-slate-400 hover:text-red-500 hidden group-hover/item:block">
                                      <X size={9} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>

                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* VUE CARTES / GRILLE */}
          {viewMode === 'grid' && (
            <div className="p-8 overflow-y-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-20">
                {tables.map(table => {
                  const tableGuests = guests.filter(g => g.table_id === table.id);
                  const currentOccupancy = getTableOccupancy(table.id);
                  
                  return (
                    <div 
                      key={table.id} 
                      className={`bg-white rounded-2xl border shadow-xs p-5 relative transition-all ${
                        table.is_vip ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'
                      }`}
                    >
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button 
                          onClick={() => toggleVipStatus(table.id, table.is_vip)} 
                          title="Basculer VIP"
                          className={`p-1.5 rounded-lg transition-all ${table.is_vip ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`}
                        >
                          <Crown size={14} />
                        </button>
                        <button onClick={() => deleteTable(table.id)} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          {table.is_vip && <Crown size={16} className="text-amber-500" />}
                          <h3 className="font-bold text-base text-slate-900">{table.name}</h3>
                        </div>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                          {currentOccupancy} / {table.capacity} p.
                        </span>
                      </div>

                      <div className="space-y-2">
                        {tableGuests.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-4">Aucun invité assigné</p>
                        ) : (
                          tableGuests.map(g => {
                            const sideLabel = getSideLabel(g.side);
                            const isMarie = g.side === 'partenaire_1';
                            const isMariee = g.side === 'partenaire_2';

                            return (
                              <div key={g.id} className="text-xs p-2.5 bg-slate-50 rounded-xl flex justify-between items-center hover:bg-slate-100 transition-all group">
                                <span className="font-semibold text-slate-800">{g.name || g.nom}</span>
                                
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => assignGuest(g.id, null)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity mr-1">
                                    <X size={12} />
                                  </button>

                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                    isMarie 
                                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                      : isMariee 
                                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {sideLabel}
                                  </span>

                                  <span className="text-[9px] font-semibold text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded">
                                    {getGuestCategory(g)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DOCUMENT DE SÉCURITÉ ET IMPRESSION PCO SANS CHEVAUCHEMENT */}
      <div id="pco-print-zone" className="hidden p-8 bg-white font-sans text-black">
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

        <div className="grid grid-cols-2 gap-6 items-start">
          {tables.map(table => {
            const tableGuests = guests.filter(g => g.table_id === table.id);
            const currentOccupancy = getTableOccupancy(table.id);

            return (
              <div 
                key={table.id} 
                className="print-card border border-slate-300 rounded-2xl p-5 bg-white shadow-xs"
                style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
              >
                <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                  <h3 className="font-bold text-base flex items-center gap-1.5 text-slate-900">
                    {table.is_vip && "⭐ [VIP] "}
                    {table.name}
                  </h3>
                  <span className="text-xs font-extrabold bg-slate-100 text-slate-800 px-3 py-1 rounded-full border border-slate-200">
                    {currentOccupancy} / {table.capacity} Couverts
                  </span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2 pr-2">Nom / Groupe</th>
                      <th className="py-2 px-2">Catégorie</th>
                      <th className="py-2 px-2">Côté</th>
                      <th className="py-2 pl-2 text-right">Couverts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableGuests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-3 text-center text-slate-400 italic">Aucun invité assigné</td>
                      </tr>
                    ) : (
                      tableGuests.map(g => (
                        <tr key={g.id} className="border-b border-slate-100">
                          <td className="py-2 pr-2 font-bold text-slate-900">{g.name || g.nom}</td>
                          <td className="py-2 px-2 text-slate-600">{getGuestCategory(g)}</td>
                          <td className="py-2 px-2 text-slate-600">{getSideLabel(g.side)}</td>
                          <td className="py-2 pl-2 text-right font-bold text-slate-900">{g.guests_count || 1}</td>
                        </tr>
                      ))
                    )}
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 no-print">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200">
              <h3 className="text-base font-bold mb-4 text-slate-900">Ajouter une Table</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">Nom de la table</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500" placeholder="ex: Table Orchidée" value={newTableData.name} onChange={(e) => setNewTableData({...newTableData, name: e.target.value})} />
                </div>
                
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">Nombre de chaises (Capacité)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-500" placeholder="ex: 10" value={newTableData.capacity || ''} onChange={(e) => setNewTableData({...newTableData, capacity: parseInt(e.target.value) || 0})} />
                </div>
                
                <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl cursor-pointer border border-amber-200 mt-2">
                  <input 
                    type="checkbox" 
                    checked={newTableData.is_vip} 
                    onChange={(e) => setNewTableData({ ...newTableData, is_vip: e.target.checked })} 
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Crown size={14} className="text-amber-600" /> Marquer cette table comme VIP
                  </span>
                </label>

                <div className="flex gap-2 pt-3">
                  <button onClick={() => setShowAddModal({ show: false, shape: 'circle' })} className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Annuler</button>
                  <button onClick={async () => {
                    const cap = newTableData.capacity <= 0 ? 10 : newTableData.capacity;
                    const { data } = await supabase.from('tables').insert([{ marriage_id: marriage.id, name: newTableData.name || `Table ${tables.length + 1}`, capacity: cap, shape: showAddModal.shape, is_vip: newTableData.is_vip, position_x: 850, position_y: 300 }]).select().single();
                    if (data) { setTables([...tables, data]); setShowAddModal({ show: false, shape: 'circle' }); }
                  }} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-xs">Créer la table</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}