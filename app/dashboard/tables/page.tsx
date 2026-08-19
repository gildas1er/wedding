"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  UtensilsCrossed, Plus, Trash2, Edit2, Users, 
  UserPlus, UserMinus, Search, Crown, CheckCircle2,
  LayoutDashboard, ArrowLeft
} from 'lucide-react';

interface TableItem {
  id: string;
  marriage_id: string;
  name: string;
  capacity: number;
  shape: string;
  position_x?: number;
  position_y?: number;
}

interface GuestItem {
  id: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  guests_count?: number;
  count?: number;
  side?: string;
  category?: string;
  status?: string;
  table_id?: string | null;
  is_vip?: boolean;
}

export default function TablesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [marriageId, setMarriageId] = useState<string | null>(null);
  
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);

  // Modals & Formulaires
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableCapacity, setTableCapacity] = useState(10);
  const [tableShape, setTableShape] = useState('circle');

  // Filtres
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

      // 3. Récupération des invités confirmés
      let { data: guestsData } = await supabase
        .from('invite')
        .select('*')
        .eq('user_id', user.id);

      if (!guestsData || guestsData.length === 0) {
        const { data: fallbackGuests } = await supabase
          .from('invite')
          .select('*')
          .eq('marriage_id', marriage.id);
        guestsData = fallbackGuests || [];
      }

      // Conserver uniquement les invités confirmés pour le placement
      const confirmedGuests = (guestsData || []).filter((g: any) => 
        String(g.status || '').toLowerCase().includes('confirm')
      );

      setGuests(confirmedGuests);
    } catch (err) {
      console.error("Erreur de chargement :", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ajouter ou Modifier une table
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
    if (!confirm("Voulez-vous vraiment supprimer cette table ? Les invités associés seront détachés.")) return;

    // Réinitialiser le table_id des invités rattachés
    await supabase.from('invite').update({ table_id: null }).eq('table_id', tableId);
    
    const { error } = await supabase.from('tables').delete().eq('id', tableId);
    if (!error) {
      setTables(tables.filter(t => t.id !== tableId));
      setGuests(guests.map(g => g.table_id === tableId ? { ...g, table_id: null } : g));
    }
  };

  // Attribuer ou Retirer un invité
  const handleAssignGuest = async (guestId: string, newTableId: string | null) => {
    const { error } = await supabase
      .from('invite')
      .update({ table_id: newTableId })
      .eq('id', guestId);

    if (!error) {
      setGuests(guests.map(g => g.id === guestId ? { ...g, table_id: newTableId } : g));
    }
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
    setTableName('');
  };

  // Calculs & Métriques
  const unassignedGuests = guests.filter(g => !g.table_id);
  const totalGuestsCount = guests.reduce((acc, g) => acc + Number(g.guests_count || g.count || 1), 0);
  const assignedGuestsCount = guests.filter(g => Boolean(g.table_id)).reduce((acc, g) => acc + Number(g.guests_count || g.count || 1), 0);

  // Filtrage des invités non placés
  const filteredUnassigned = unassignedGuests.filter(g => {
    const name = (g.name || g.full_name || `${g.first_name || ''} ${g.last_name || ''}`).toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || (g.category || '').toLowerCase() === selectedCategory.toLowerCase();
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
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft size={16} /> Retour au tableau de bord
          </button>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <UtensilsCrossed className="text-rose-500" size={28} />
            Gestion des Tables & Plan de Salle
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Placez vos invités confirmés sur vos différentes tables.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-rose-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition-all"
        >
          <Plus size={18} />
          <span>Créer une nouvelle table</span>
        </button>
      </div>

      {/* STATISTIQUES */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Confirmés</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalGuestsCount} pers.</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Invités Placés</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{assignedGuestsCount} / {totalGuestsCount}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Nombre de Tables</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{tables.length} tables</p>
        </div>
      </div>

      {/* CONTENU PRINCIPAL EN 2 COLONNES */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLONNE GAUCHE : INVITÉS NON PLACÉS */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col h-[700px]">
          
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center justify-between">
              <span>Non placés</span>
              <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-0.5 rounded-full">
                {filteredUnassigned.length} invités
              </span>
            </h2>

            {/* BARRE DE RECHERCHE & FILTRE */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher un invité..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Toutes les catégories</option>
                <option value="amis">Amis</option>
                <option value="collègues">Collègues</option>
                <option value="parents">Parents</option>
              </select>
            </div>
          </div>

          {/* LISTE DES INVITÉS À PLACER */}
          <div className="flex-1 overflow-y-auto pt-3 space-y-2 pr-1">
            {filteredUnassigned.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold">
                {unassignedGuests.length === 0 ? "Tous les invités confirmés sont placés ! 🎉" : "Aucun invité ne correspond à la recherche."}
              </div>
            ) : (
              filteredUnassigned.map((guest) => {
                const guestName = guest.name || guest.full_name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
                const count = Number(guest.guests_count || guest.count || 1);

                return (
                  <div key={guest.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {guest.is_vip && <Crown size={12} className="text-amber-500 fill-amber-400 shrink-0" />}
                        <p className="text-xs font-bold text-slate-900 truncate">{guestName}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase text-slate-500">{guest.category || 'Invité'}</span>
                        <span className="text-[10px] font-black bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">x{count}</span>
                      </div>
                    </div>

                    {/* SELECTEUR RAPIDE DE TABLE */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleAssignGuest(guest.id, e.target.value);
                      }}
                      defaultValue=""
                      className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:ring-2 focus:ring-rose-500 shrink-0"
                    >
                      <option value="" disabled>Placer...</option>
                      {tables.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLONNE DROITE : LES TABLES */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-start">
          {tables.length === 0 ? (
            <div className="col-span-full bg-white p-12 text-center rounded-3xl border border-slate-200/80">
              <UtensilsCrossed size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-800">Aucune table créée</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Commencez par ajouter votre première table de réception.</p>
              <button
                onClick={() => openModal()}
                className="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-rose-600 transition-colors"
              >
                + Ajouter une table
              </button>
            </div>
          ) : (
            tables.map((table) => {
              const tableGuests = guests.filter(g => g.table_id === table.id);
              const occupiedSeats = tableGuests.reduce((acc, g) => acc + Number(g.guests_count || g.count || 1), 0);
              const isFull = occupiedSeats >= table.capacity;

              return (
                <div key={table.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between">
                  
                  {/* EN-TÊTE DE LA TABLE */}
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{table.name}</h3>
                        <p className="text-[11px] font-bold text-slate-400 capitalize">
                          Forme: {table.shape === 'circle' ? 'Ronde' : 'Rectangulaire'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openModal(table)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTable(table.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* BARRE DE CAPACITÉ */}
                    <div className="mt-3 mb-4">
                      <div className="flex justify-between items-center text-xs font-black mb-1">
                        <span className={isFull ? 'text-rose-600' : 'text-slate-700'}>
                          {occupiedSeats} / {table.capacity} places
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {table.capacity - occupiedSeats} restantes
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${isFull ? 'bg-rose-500' : 'bg-slate-900'}`}
                          style={{ width: `${Math.min((occupiedSeats / table.capacity) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* LISTE DES INVITÉS À CETTE TABLE */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {tableGuests.length === 0 ? (
                        <p className="text-xs text-slate-400 font-medium italic py-2">Aucun invité assigné à cette table.</p>
                      ) : (
                        tableGuests.map((guest) => {
                          const guestName = guest.name || guest.full_name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim();
                          const count = Number(guest.guests_count || guest.count || 1);

                          return (
                            <div key={guest.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-50 rounded-xl">
                              <span className="font-bold text-slate-800 truncate">{guestName} <span className="text-slate-400 font-normal">(x{count})</span></span>
                              <button 
                                onClick={() => handleAssignGuest(guest.id, null)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
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

      {/* MODAL CRÉATION / ÉDITION DE TABLE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              {editingTable ? 'Modifier la Table' : 'Ajouter une Table'}
            </h2>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400">Nom de la table</label>
                <input 
                  type="text" 
                  required
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Ex: Table Honoré, Table VIP 1"
                  className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400">Capacité (Nombre de places)</label>
                <input 
                  type="number" 
                  min="1"
                  max="50"
                  required
                  value={tableCapacity}
                  onChange={(e) => setTableCapacity(Number(e.target.value))}
                  className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-400">Forme de la table</label>
                <select 
                  value={tableShape}
                  onChange={(e) => setTableShape(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none"
                >
                  <option value="circle">Ronde</option>
                  <option value="rectangle">Rectangulaire</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-rose-600 transition-colors"
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