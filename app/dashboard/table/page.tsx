"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Plus, Trash2, Search, Loader2, ZoomIn, ZoomOut, Crown,
  X, ArrowLeft, Printer, Users, Grid, Layout,
  Disc, Compass
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
  const [danceFloor, setDanceFloor] = useState({ x: 700, y: 380, width: 320, height: 180 });

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
    if (!confirm("Voulez-vous vraiment supprimer cette table ? Les invités replaceront en liste d'attente.")) return;
    const { error } = await supabase.from('tables').delete().eq('id', tableId);
    if (!error) {
      setTables(prev => prev.filter(t => t.id !== tableId));
      setGuests(prev => prev.map(g => g.table_id === tableId ? { ...g, table_id: null } : g));
    }
  };

  const applyLayoutPreset = async (preset: 'U' | 'square' | 'double_line') => {
    if (tables.length === 0) return;

    const updatedTables = [...tables];
    const centerX = 850;
    const centerY = 470;
    const spacingX = 320;
    const spacingY = 280;

    if (preset === 'U') {
      const count = updatedTables.length;
      const topCount = Math.ceil(count / 3);
      const sideCount = Math.floor((count - topCount) / 2);

      let index = 0;
      for (let i = 0; i < topCount && index < count; i++) {
        updatedTables[index].position_x = centerX - ((topCount - 1) * spacingX) / 2 + i * spacingX;
        updatedTables[index].position_y = centerY - 320;
        index++;
      }
      for (let i = 0; i < sideCount && index < count; i++) {
        updatedTables[index].position_x = centerX - ((topCount - 1) * spacingX) / 2;
        updatedTables[index].position_y = centerY - 320 + (i + 1) * spacingY;
        index++;
      }
      for (let i = 0; i < sideCount && index < count; i++) {
        updatedTables[index].position_x = centerX + ((topCount - 1) * spacingX) / 2;
        updatedTables[index].position_y = centerY - 320 + (i + 1) * spacingY;
        index++;
      }
      setDanceFloor({ x: centerX - 160, y: centerY - 60, width: 320, height: 220 });

    } else if (preset === 'square') {
      const radius = Math.max(380, updatedTables.length * 52);
      updatedTables.forEach((t, i) => {
        const angle = (i / updatedTables.length) * 2 * Math.PI;
        t.position_x = centerX + radius * Math.cos(angle);
        t.position_y = centerY + radius * Math.sin(angle);
      });
      setDanceFloor({ x: centerX - 160, y: centerY - 110, width: 320, height: 220 });

    } else if (preset === 'double_line') {
      const half = Math.ceil(updatedTables.length / 2);
      updatedTables.forEach((t, i) => {
        const row = i < half ? 0 : 1;
        const col = i % half;
        t.position_x = centerX - ((half - 1) * spacingX) / 2 + col * spacingX;
        t.position_y = row === 0 ? centerY - 300 : centerY + 300;
      });
      setDanceFloor({ x: centerX - 200, y: centerY - 90, width: 400, height: 180 });
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
      <div className="h-screen w-screen bg-[#FCFBF7] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-amber-600" size={40} />
        <p className="font-luxury italic text-xl text-slate-800">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#FCFBF7] flex flex-col font-ui overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        .font-luxury { font-family: 'Playfair Display', serif; }
        .font-ui { font-family: 'Montserrat', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D4AF37; border-radius: 10px; }
        
        .gold-vip-border {
          background: linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%);
          box-shadow: 0 12px 30px -5px rgba(212, 175, 55, 0.4);
        }
        
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          body * { 
            visibility: hidden; 
          }
          #pco-print-zone, #pco-print-zone * { 
            visibility: visible; 
          }
          #pco-print-zone { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            display: block !important; 
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { 
            display: none !important; 
          }
          .print-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: inline-block !important;
            width: 100% !important;
            margin-bottom: 1.5rem !important;
          }
        }
      `}} />

      {/* HEADER */}
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

        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button onClick={() => setViewMode('canvas')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'canvas' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Layout size={15} /> Plan Visuel Luxe
            </button>
            <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Grid size={15} /> Vue Cartes
            </button>
          </div>

          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-md">
            <Printer size={15} /> Feuille PCO
          </button>

          <button onClick={() => setShowAddModal({ show: true, shape: 'circle' })} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-md">
            <Plus size={16} /> Nouvelle Table
          </button>
        </div>
      </header>

      {/* CONTENU principal */}
      <div className="flex-1 flex overflow-hidden no-print">
        {/* PANEL GAUCHE */}
        <aside className="w-96 bg-white border-r border-amber-100 flex flex-col shrink-0">
          <div className="p-5 border-b border-amber-50 bg-slate-50/50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Invités non placés</h3>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {guests.filter(g => !g.table_id).length} fiche(s)
              </span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-medium outline-none focus:border-amber-400" placeholder="Rechercher..." onChange={(e) => setSearchTerm(e.target.value)} />
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
                <div key={guest.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-xs text-slate-800">{guest.name || guest.nom}</p>
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[8px] font-bold border border-amber-200">
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
                            {t.is_vip ? '⭐ ' : ''}{t.name} ({remaining} p. libres)
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

        {/* CANEVAS INTERACTIF & VUE CARTES */}
        <main className="flex-1 bg-[#F7F5EF] relative overflow-hidden flex flex-col">
          {viewMode === 'canvas' && (
            <>
              {/* TOOLBAR DISPOSITIONS */}
              <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-amber-100/80 flex items-center gap-2 pointer-events-auto">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2 flex items-center gap-1">
                    <Compass size={12} className="text-amber-500" /> Dispositions :
                  </span>
                  <button onClick={() => applyLayoutPreset('U')} className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-xl text-xs font-bold transition-all">
                    En U
                  </button>
                  <button onClick={() => applyLayoutPreset('square')} className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-xl text-xs font-bold transition-all">
                    En Cercle
                  </button>
                  <button onClick={() => applyLayoutPreset('double_line')} className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-xl text-xs font-bold transition-all">
                    Parallèle
                  </button>
                </div>

                <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-amber-100/80 flex items-center gap-2 pointer-events-auto">
                  <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600"><ZoomOut size={16}/></button>
                  <span className="text-xs font-bold text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600"><ZoomIn size={16}/></button>
                </div>
              </div>

              {/* ZONE DE DESSIN */}
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
                    backgroundImage: 'radial-gradient(#C5A059 0.8px, transparent 0.8px)',
                    backgroundSize: '45px 45px'
                  }}
                  className="w-[4500px] h-[3500px] absolute top-0 left-0 transition-transform duration-75"
                >
                  <motion.div 
                    drag 
                    dragMomentum={false}
                    onDragEnd={(e, info) => setDanceFloor(prev => ({ ...prev, x: prev.x + info.delta.x, y: prev.y + info.delta.y }))}
                    style={{ x: danceFloor.x, y: danceFloor.y, width: danceFloor.width, height: danceFloor.height }}
                    className="absolute z-0 bg-gradient-to-br from-amber-100/90 via-amber-50/70 to-amber-200/80 border-2 border-dashed border-amber-400 rounded-3xl shadow-xl flex flex-col items-center justify-center p-4 cursor-move backdrop-blur-md"
                  >
                    <Disc size={32} className="text-amber-600 mb-1 animate-spin-slow" />
                    <p className="font-luxury font-bold text-amber-950 text-base tracking-widest uppercase">Piste de Danse</p>
                    <span className="text-[9px] font-extrabold text-amber-700/80 uppercase tracking-wider">Espace Réception & Bal</span>
                  </motion.div>

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
                        <div className={`relative p-1 rounded-full transition-all duration-300 ${table.is_vip ? 'gold-vip-border p-1.5' : ''}`}>
                          <div className={`bg-white border-2 shadow-2xl flex flex-col items-center justify-between p-5 rounded-full w-72 h-72 cursor-grab active:cursor-grabbing transition-all ${table.is_vip ? 'border-amber-400 bg-amber-50/20' : 'border-amber-200 hover:border-amber-400'}`}>
                            
                            <button 
                              onClick={() => toggleVipStatus(table.id, table.is_vip)} 
                              title="Basculer statut VIP (Or)"
                              className={`absolute top-2 left-2 p-2 rounded-full shadow-md transition-all z-20 ${table.is_vip ? 'bg-amber-400 text-amber-950 scale-110 ring-2 ring-amber-200' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`}
                            >
                              <Crown size={14} />
                            </button>

                            <button onClick={() => deleteTable(table.id)} className="absolute top-2 right-2 bg-white text-red-500 hover:bg-red-50 p-2 rounded-full shadow-md border border-red-100 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              <Trash2 size={13} />
                            </button>

                            <div className="text-center mt-2 px-4 w-full">
                              {table.is_vip && (
                                <span className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm inline-flex items-center gap-1 mb-0.5">
                                  <Crown size={9} /> Table VIP
                                </span>
                              )}
                              <input 
                                className="font-luxury font-bold text-slate-900 text-base text-center bg-transparent outline-none w-full" 
                                defaultValue={table.name} 
                                onBlur={(e) => supabase.from('tables').update({ name: e.target.value }).eq('id', table.id)} 
                              />
                              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${currentOccupancy > table.capacity ? 'text-red-500' : 'text-amber-700'}`}>
                                {currentOccupancy} / {table.capacity} PLACES
                              </span>
                            </div>

                            <div className="w-full flex-1 overflow-y-auto my-2 space-y-1 custom-scrollbar px-3 max-h-[105px]">
                              {tableGuests.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                  <p className="text-[10px] font-bold text-slate-300 italic">Aucun invité placé</p>
                                </div>
                              ) : (
                                tableGuests.map(g => (
                                  <div key={g.id} className="text-[9px] font-bold bg-white/90 border border-slate-100 shadow-2xs text-slate-800 px-2.5 py-1 rounded-lg flex justify-between items-center group/item">
                                    <span className="truncate max-w-[110px]">{g.name || g.nom}</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[7px] text-amber-800 font-extrabold bg-amber-100 px-1 rounded">{getGuestCategory(g)}</span>
                                      <button onClick={() => assignGuest(g.id, null)} className="text-slate-300 hover:text-red-500 hidden group-hover/item:block">
                                        <X size={10} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="w-4/5 bg-slate-100 h-2 rounded-full overflow-hidden mb-1 border border-slate-200">
                              <div className={`h-full transition-all duration-300 ${table.is_vip ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (currentOccupancy / table.capacity) * 100)}%` }} />
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

          {viewMode === 'grid' && (
            <div className="p-8 overflow-y-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-20">
                {tables.map(table => {
                  const tableGuests = guests.filter(g => g.table_id === table.id);
                  const currentOccupancy = getTableOccupancy(table.id);
                  
                  return (
                    <div 
                      key={table.id} 
                      className={`bg-white rounded-3xl border shadow-sm p-6 relative transition-all ${
                        table.is_vip ? 'border-amber-400 ring-2 ring-amber-100/80 bg-amber-50/10' : 'border-slate-100'
                      }`}
                    >
                      <div className="absolute -top-3 -right-3 flex gap-2">
                        <button 
                          onClick={() => toggleVipStatus(table.id, table.is_vip)} 
                          title="Basculer VIP"
                          className={`p-2 rounded-full shadow-md transition-all ${table.is_vip ? 'bg-amber-400 text-amber-950' : 'bg-white border border-slate-200 text-slate-400 hover:text-amber-500'}`}
                        >
                          <Crown size={14} />
                        </button>
                        <button onClick={() => deleteTable(table.id)} className="p-2 rounded-full shadow-md bg-white border border-slate-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4 mt-2">
                        <div className="flex items-center gap-2">
                          {table.is_vip && <Crown size={18} className="text-amber-500" />}
                          <h3 className={`font-luxury font-bold text-xl ${
                            table.is_vip 
                              ? 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 bg-clip-text text-transparent' 
                              : 'text-amber-600'
                          }`}>
                            {table.name}
                          </h3>
                        </div>
                        <span className="text-xs font-extrabold text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full">
                          {currentOccupancy} / {table.capacity} p.
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {tableGuests.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-4">Aucun invité assigné à cette table</p>
                        ) : (
                          tableGuests.map(g => {
                            const sideLabel = getSideLabel(g.side);
                            const isMarie = g.side === 'partenaire_1';
                            const isMariee = g.side === 'partenaire_2';

                            return (
                              <div key={g.id} className="text-xs p-3 bg-slate-50/80 rounded-2xl flex justify-between items-center hover:bg-slate-100/80 transition-all group">
                                <span className="font-bold text-slate-800 uppercase tracking-wide">{g.name || g.nom}</span>
                                
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => assignGuest(g.id, null)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity mr-1">
                                    <X size={12} />
                                  </button>

                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase border ${
                                    isMarie 
                                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                      : isMariee 
                                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {sideLabel}
                                  </span>

                                  <span className="text-[9px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md">
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

      {/* DOCUMENT IMPRESSION PCO DECOUPE DE PAGE */}
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold font-luxury mb-6 text-center">Ajouter une Table</h3>
              <div className="space-y-4">
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none" placeholder="Nom de la table (ex: Table Orchidée)" value={newTableData.name} onChange={(e) => setNewTableData({...newTableData, name: e.target.value})} />
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none" placeholder="Capacité (ex: 10)" value={newTableData.capacity || ''} onChange={(e) => setNewTableData({...newTableData, capacity: parseInt(e.target.value) || 0})} />
                
                <label className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-xl cursor-pointer border border-amber-200">
                  <input 
                    type="checkbox" 
                    checked={newTableData.is_vip} 
                    onChange={(e) => setNewTableData({ ...newTableData, is_vip: e.target.checked })} 
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Crown size={14} className="text-amber-600" /> Marquer cette table comme VIP (Or)
                  </span>
                </label>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAddModal({ show: false, shape: 'circle' })} className="flex-1 py-3 text-xs font-bold text-slate-400">Annuler</button>
                  <button onClick={async () => {
                    const cap = newTableData.capacity <= 0 ? 10 : newTableData.capacity;
                    const { data } = await supabase.from('tables').insert([{ marriage_id: marriage.id, name: newTableData.name || `Table ${tables.length + 1}`, capacity: cap, shape: showAddModal.shape, is_vip: newTableData.is_vip, position_x: 850, position_y: 200 }]).select().single();
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