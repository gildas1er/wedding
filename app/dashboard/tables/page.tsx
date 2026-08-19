"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Heart, Users, Banknote, Calendar, LogOut, 
  MessageSquare, ChevronRight, LayoutDashboard, 
  Clock, ClipboardList, Utensils, Send, 
  Search, Plus, Trash2, Edit2, Crown, UserMinus, 
  AlertCircle
} from 'lucide-react';

interface TableItem {
  id: string;
  marriage_id: string;
  name: string;
  capacity: number;
  shape: string;
}

interface GuestItem {
  id: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  guests_count?: number;
  count?: number;
  category?: string;
  status?: string;
  table_id?: string | null;
  is_vip?: boolean;
  presence_dinner?: boolean;
  dinner?: boolean;
  attend_dinner?: boolean;
  presence?: string;
}

export default function TablesDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [marriageId, setMarriageId] = useState<string | null>(null);
  
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);

  // Formulaires & Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableCapacity, setTableCapacity] = useState(10);
  const [tableShape, setTableShape] = useState('circle');

  // Filtres (Par défaut sur 'all' pour éviter de masquer la liste au chargement)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // 1. Récupération du mariage
      const { data: marriage } = await supabase
        .from('marriages')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!marriage) return;
      setMarriageId(marriage.id);

      // 2. Récupération des tables
      const { data: tablesData } = await supabase
        .from('tables')
        .select('*')
        .eq('marriage_id', marriage.id)
        .order('created_at', { ascending: true });

      if (tablesData) setTables(tablesData);

      // 3. Récupération exacte des invités confirmés au Dîner
      const { data: guestsData } = await supabase
        .from('invite')
        .select('*')
        .eq('marriage_id', marriage.id);

      const allGuests = guestsData || [];

      // Filtre strict équivalent à la liste officielle (97 personnes)
      const dinnerGuests = allGuests.filter((g: any) => {
        const statusClean = String(g.status || '').toLowerCase().trim();
        const isConfirmed = statusClean === 'confirmé' || statusClean === 'confirme' || statusClean.includes('confirm');

        // Vérification présence au dîner
        const presenceClean = String(g.presence || '').toLowerCase();
        const isAtDinner = g.presence_dinner === true || 
                           g.dinner === true || 
                           g.attend_dinner === true ||
                           presenceClean.includes('dîner') ||
                           presenceClean.includes('diner') ||
                           presenceClean.includes('reception') ||
                           presenceClean.includes('réception');

        // Si aucun champ spécifique au dîner n'est renseigné, on se base sur la confirmation globale
        const hasSpecificDinnerField = ('presence_dinner' in g) || ('dinner' in g) || ('attend_dinner' in g);

        return isConfirmed && (hasSpecificDinnerField ? isAtDinner : true);
      });

      setGuests(dinnerGuests);
    } catch (err) {
      console.error("Erreur de chargement :", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sauvegarder Table
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marriageId || !tableName.trim()) return;

    if (editingTable) {
      const { error } = await supabase
        .from('tables')
        .update({
          name: tableName.trim(),
          capacity: Number(tableCapacity),
          shape: tableShape
        })
        .eq('id', editingTable.id);

      if (!error) {
        setTables(tables.map(t => t.id === editingTable.id ? { ...t, name: tableName.trim(), capacity: Number(tableCapacity), shape: tableShape } : t));
      }
    } else {
      const { data, error } = await supabase
        .from('tables')
        .insert([{
          marriage_id: marriageId,
          name: tableName.trim(),
          capacity: Number(tableCapacity),
          shape: tableShape
        }])
        .select()
        .single();

      if (!error && data) {
        setTables([...tables, data]);
      }
    }

    closeModal();
  };

  // Supprimer une table
  const handleDeleteTable = async (tableId: string) => {
    if (!confirm("Voulez-vous supprimer cette table ? Les invités seront détachés.")) return;

    await supabase.from('invite').update({ table_id: null }).eq('table_id', tableId);
    const { error } = await supabase.from('tables').delete().eq('id', tableId);
    
    if (!error) {
      setTables(tables.filter(t => t.id !== tableId));
      setGuests(guests.map(g => g.table_id === tableId ? { ...g, table_id: null } : g));
    }
  };

  // Attribuer un invité avec contrôle STRICT de capacité
  const handleAssignGuest = async (guest: GuestItem, targetTableId: string | null) => {
    const guestCount = Number(guest.guests_count || guest.count || 1);

    if (targetTableId) {
      const targetTable = tables.find(t => t.id === targetTableId);
      if (targetTable) {
        const tableGuests = guests.filter(g => g.table_id === targetTableId);
        const currentOccupied = tableGuests.reduce((acc, g) => acc + Number(g.guests_count || g.count || 1), 0);
        const remainingSeats = targetTable.capacity - currentOccupied;

        if (guestCount > remainingSeats) {
          alert(`Impossible d'ajouter cet invité (${guestCount} place(s)) à la table "${targetTable.name}". Il ne reste que ${remainingSeats} place(s) disponible(s).`);
          return;
        }
      }
    }

    const { error } = await supabase
      .from('invite')
      .update({ table_id: targetTableId })
      .eq('id', guest.id);

    if (!error) {
      setGuests(guests.map(g => g.id === guest.id ? { ...g, table_id: targetTableId } : g));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const openModal = (table?: TableItem) => {
    if (table) {
      setEditingTable(table);
      setTableName(table.name);
      setTableCapacity(table.capacity);
      setTableShape(table.shape || 'circle');
    } else {
      setEditingTable(null);
      setTableName(`Table ${tables.length + 1}`);
      setTableCapacity(10);
      setTableShape('circle');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTable(null);
  };

  // Calculs totaux
  const unassignedGuests = guests.filter(g => !g.table_id);
  const totalDinnerPersons = guests.reduce((acc, g) => acc + Number(g.guests_count || g.count || 1), 0);
  const assignedDinnerPersons = guests.filter(g => Boolean(g.table_id)).reduce((acc, g) => acc + Number(g.guests_count || g.count || 1), 0);

  // Filtrage insensible à la casse
  const filteredUnassigned = unassignedGuests.filter(g => {
    const guestName = (g.name || g.full_name || `${g.first_name || ''} ${g.last_name || ''}`).toLowerCase();
    const matchesSearch = guestName.includes(searchQuery.toLowerCase().trim());
    
    const guestCat = (g.category || '').toLowerCase().trim();
    const filterCat = selectedCategory.toLowerCase().trim();
    const matchesCat = filterCat === 'all' || guestCat.includes(filterCat) || filterCat.includes(guestCat);

    return matchesSearch && matchesCat;
  });

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-[#1E293B]" style={{ fontFamily: '"Inter", sans-serif' }}>
      
      {/* SIDEBAR DASHBOARD */}
      <aside className="w-64 border-r border-slate-200 flex flex-col bg-white sticky top-0 h-screen z-50 shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
            <Heart size={20} className="text-white fill-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Mariage</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Général</p>
          <SidebarItem icon={LayoutDashboard} label="Tableau de bord" onClick={() => router.push('/dashboard')} />
          <SidebarItem icon={MessageSquare} label="Messages" />
          
          <p className="px-4 py-2 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organisation</p>
          <SidebarItem icon={Users} label="Liste des invités" onClick={() => router.push('/dashboard/invite')} />
          <SidebarItem icon={Send} label="Invitations (RSVP)" onClick={() => router.push('/dashboard/studio')} />
          <SidebarItem icon={Utensils} label="Gestion des tables" active onClick={() => router.push('/dashboard/table')} />
          <SidebarItem icon={ClipboardList} label="Mes tâches" onClick={() => router.push('/dashboard/tasks')} />
          <SidebarItem icon={Banknote} label="Budget" onClick={() => router.push('/dashboard/budget')} />
          <SidebarItem icon={Clock} label="Planning Jour J" onClick={() => router.push('/dashboard/planning')} />
          
          <div className="mt-8 p-6 bg-gradient-to-br from-indigo-600 to-rose-500 rounded-[2rem] text-white shadow-xl relative overflow-hidden group mx-2">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <h4 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <Crown size={12} /> Version Premium
            </h4>
            <p className="text-[10px] leading-relaxed mb-4 opacity-90 font-medium text-white/80">
              Plan de salle interactif & invités illimités.
            </p>
            <button className="w-full py-3 bg-white text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">
              Upgrade
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-500 mb-1">
              <Utensils size={14} /> Plan de Réception
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Placement du Dîner 🍷
            </h1>
            <p className="text-slate-400 text-xs font-bold mt-1">
              Seules les personnes confirmées <span className="text-slate-800 underline">présentes au Dîner</span> sont affichées ici.
            </p>
          </div>

          <button
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all hover:scale-[1.02]"
          >
            <Plus size={16} />
            <span>Ajouter une table</span>
          </button>
        </header>

        {/* CARTES STATISTIQUES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
              🍽️
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Couverts Dîner</p>
              <p className="text-2xl font-black text-slate-900">{totalDinnerPersons} convives</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
              ✨
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Convives Placés</p>
              <p className="text-2xl font-black text-emerald-600">{assignedDinnerPersons} / {totalDinnerPersons}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-black">
              🪑
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tables Configurées</p>
              <p className="text-2xl font-black text-slate-900">{tables.length} tables</p>
            </div>
          </div>
        </div>

        {/* SECTION DOUBLE COLONNE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLONNE GAUCHE : INVITÉS DÎNER À PLACER */}
          <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex flex-col h-[680px]">
            
            <div className="pb-4 border-b border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                  À placer au Dîner
                </h3>
                <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-3 py-1 rounded-full">
                  {filteredUnassigned.length} restants
                </span>
              </div>

              {/* RECHERCHE & FILTRES */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Chercher un invité..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>

                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
                >
                  <option value="all">Toutes les catégories</option>
                  <option value="collègues">Collègues</option>
                  <option value="famille">Famille</option>
                  <option value="amis">Amis</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>

            {/* LISTE DES CONVIVES NON PLACÉS */}
            <div className="flex-1 overflow-y-auto pt-3 space-y-2 pr-1">
              {filteredUnassigned.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs font-bold">
                  {unassignedGuests.length === 0 
                    ? "Tous les convives du dîner sont installés ! 🎉" 
                    : "Aucun invité ne correspond à la recherche."}
                </div>
              ) : (
                filteredUnassigned.map((guest) => {
                  const guestName = guest.name || guest.full_name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
                  const count = Number(guest.guests_count || guest.count || 1);

                  return (
                    <div key={guest.id} className="p-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-2 transition-all">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {guest.is_vip && <Crown size={12} className="text-amber-500 fill-amber-400 shrink-0" />}
                          <p className="text-xs font-bold text-slate-900 truncate">{guestName}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {guest.category || 'Invité'}
                          </span>
                          <span className="text-[10px] font-black bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                            x{count}
                          </span>
                        </div>
                      </div>

                      {/* SELECTEUR DE TABLE DYNAMIQUE */}
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleAssignGuest(guest, e.target.value);
                          e.target.value = "";
                        }}
                        defaultValue=""
                        className="text-[11px] font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-700 focus:ring-2 focus:ring-rose-400 shrink-0 shadow-sm cursor-pointer"
                      >
                        <option value="" disabled>Placer à...</option>
                        {tables.map(t => {
                          const tableGuests = guests.filter(g => g.table_id === t.id);
                          const occupied = tableGuests.reduce((acc, g) => acc + Number(g.guests_count || g.count || 1), 0);
                          const remaining = t.capacity - occupied;
                          const isDisabled = count > remaining;

                          return (
                            <option key={t.id} value={t.id} disabled={isDisabled}>
                              {t.name} ({remaining} place{remaining > 1 ? 's' : ''} libre{remaining > 1 ? 's' : ''}) {isDisabled ? '- Pleine' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLONNE DROITE : LES TABLES */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {tables.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center rounded-[2.5rem] border border-slate-100 shadow-sm">
                <Utensils size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-black text-slate-800 text-base">Aucune table créée</h3>
                <p className="text-xs text-slate-400 mt-1 mb-6">Créez votre première table pour organiser la salle du dîner.</p>
                <button
                  onClick={() => openModal()}
                  className="bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-rose-500 transition-colors shadow-lg"
                >
                  + Créer une table
                </button>
              </div>
            ) : (
              tables.map((table) => {
                const tableGuests = guests.filter(g => g.table_id === table.id);
                const occupiedSeats = tableGuests.reduce((acc, g) => acc + Number(g.guests_count || g.count || 1), 0);
                const isFull = occupiedSeats >= table.capacity;

                return (
                  <div key={table.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-xl hover:border-rose-100 transition-all">
                    
                    <div>
                      {/* EN-TÊTE TABLE */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <h3 className="font-black text-slate-900 text-base">{table.name}</h3>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Table {table.shape === 'circle' ? 'Ronde ⭕' : 'Rectangulaire 🟩'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => openModal(table)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTable(table.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* JAUGE DE PLACES */}
                      <div className="mt-4 mb-5">
                        <div className="flex justify-between items-center text-xs font-black mb-1.5">
                          <span className={isFull ? 'text-rose-600' : 'text-slate-700'}>
                            {occupiedSeats} / {table.capacity} places
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {table.capacity - occupiedSeats} disponibles
                          </span>
                        </div>

                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${isFull ? 'bg-rose-500' : 'bg-slate-900'}`}
                            style={{ width: `${Math.min((occupiedSeats / table.capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* INVITÉS SUR LA TABLE */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {tableGuests.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl">
                            <p className="text-xs text-slate-400 font-bold">Table vide</p>
                          </div>
                        ) : (
                          tableGuests.map((guest) => {
                            const guestName = guest.name || guest.full_name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
                            const count = Number(guest.guests_count || guest.count || 1);

                            return (
                              <div key={guest.id} className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-100/60">
                                <span className="font-bold text-slate-800 truncate">
                                  {guestName} <span className="text-slate-400 font-normal">(x{count})</span>
                                </span>
                                <button 
                                  onClick={() => handleAssignGuest(guest, null)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white transition-colors"
                                  title="Retirer de la table"
                                >
                                  <UserMinus size={14} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

      </main>

      {/* MODALE CRÉATION / ÉDITION DE TABLE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <h2 className="text-xl font-black text-slate-900 mb-6">
              {editingTable ? 'Modifier la Table' : 'Nouvelle Table de Dîner'}
            </h2>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Nom de la table
                </label>
                <input 
                  type="text" 
                  required
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Ex: Table d'Honneur, Table VIP..."
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Capacité (Nombre de personnes)
                </label>
                <input 
                  type="number" 
                  min="1"
                  max="50"
                  required
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(Number(e.target.value))}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Forme géométrique
                </label>
                <select 
                  value={tableShape}
                  onChange={(e) => setTableShape(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none"
                >
                  <option value="circle">Ronde</option>
                  <option value="rectangle">Rectangulaire</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-rose-500 transition-colors shadow-lg"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function SidebarItem({ icon: Icon, label, active = false, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
        active 
          ? 'bg-slate-900 text-white shadow-lg' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}