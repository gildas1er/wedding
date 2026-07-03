"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Utensils, Users, Sparkles, Heart, Loader2, HelpCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase'; // Ajuste le chemin selon ton dossier

interface InviteRow {
  id: string;
  name: string;
  guests_count: number;
  table_name: string;
}

// Next.js injecte automatiquement 'params' de manière asynchrone
export default function PlanDeTablePublicPage({ params }: { params: Promise<{ id: string }> }) {
  // On déballe les paramètres de l'URL de manière sûre
  const resolvedParams = React.use(params);
  const marriageId = resolvedParams.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      searchGuests(searchQuery.trim());
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const searchGuests = async (query: string) => {
    setLoading(true);
    setHasSearched(true);
    try {
      // Requête ultra-précise et sécurisée :
      // On cherche uniquement dans les invités DU mariage spécifié par l'URL
      const { data, error } = await supabase
        .from('invite')
        .select(`
          id,
          name,
          guests_count,
          tables (
            name
          )
        `)
        .eq('marriage_id', marriageId) // 👈 Sécurité maximale basée sur l'URL
        .ilike('name', `%${query}%`)
        .limit(5);

      if (error) throw error;

      // Filtrage des doublons
      const uniqueInvitesMap = new Map();
      (data || []).forEach((invite: any) => {
        if (!uniqueInvitesMap.has(invite.id)) {
          uniqueInvitesMap.set(invite.id, {
            id: invite.id,
            name: invite.name,
            guests_count: invite.guests_count || 1,
            table_name: invite.tables?.name || 'Table non assignée'
          });
        }
      });

      setSearchResults(Array.from(uniqueInvitesMap.values()));
    } catch (err) {
      console.error("Erreur recherche plan de table:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center p-4">
      <div className="w-full max-w-[450px] bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100/50 flex flex-col relative overflow-hidden min-h-[550px]">
        
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-300 via-amber-200 to-rose-300" />

        {/* EN-TÊTE */}
        <div className="text-center mt-4 mb-6">
          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
            <Utensils className="w-3 h-3" /> Placement salle
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Où est ma table ?</h1>
          <p className="text-xs text-slate-400 mt-1 px-4">
            Saisissez votre prénom ou votre nom pour découvrir votre placement.
          </p>
        </div>

        {/* RECHERCHE */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Rechercher votre nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 focus:bg-white rounded-2xl text-sm font-bold border border-slate-100 focus:border-rose-200 outline-none transition-all text-slate-800 shadow-inner"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-rose-400" /> : <Search className="w-5 h-5" />}
          </div>
        </div>

        {/* ZONE DES RÉSULTATS */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {searchQuery.trim().length < 2 ? (
              <motion.div key="empty" className="text-center text-slate-300 py-8 space-y-2 my-auto">
                <HelpCircle className="w-12 h-12 mx-auto stroke-[1.5]" />
                <p className="text-xs font-bold uppercase tracking-wider">En attente</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">Tapez au moins 2 lettres de votre nom.</p>
              </motion.div>
            ) : hasSearched && searchResults.length === 0 && !loading ? (
              <motion.div key="no-result" className="text-center bg-rose-50/50 border border-rose-100 p-6 rounded-3xl my-auto">
                <p className="text-sm font-black text-rose-500">Nom introuvable</p>
                <p className="text-xs text-slate-500 mt-1">Vérifiez l'orthographe ou demandez conseil à l'entrée.</p>
              </motion.div>
            ) : (
              <motion.div key="list" className="space-y-4 my-auto w-full">
                {searchResults.map((invite) => (
                  <motion.div
                    key={invite.id}
                    className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[2rem] p-5 shadow-xl relative overflow-hidden border border-slate-800"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-amber-400" /> Présence Validée
                        </span>
                        <h3 className="text-base font-black text-white">{invite.name}</h3>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Votre Table</p>
                        <p className="text-lg font-black text-amber-300 tracking-tight mt-0.5">{invite.table_name}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-wider text-white/40 font-bold flex items-center justify-end gap-1">
                          <Users size={10} /> Couverts
                        </p>
                        <p className="text-xs font-black text-white/90 mt-0.5">
                          {invite.guests_count} {invite.guests_count > 1 ? 'personnes' : 'personne'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PIED DE PAGE */}
        <div className="text-center pt-6 mt-6 border-t border-slate-50">
          <Heart className="w-4 h-4 text-rose-200 mx-auto mb-1 fill-rose-200" />
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            Gildas & Mariette • 2026
          </p>
        </div>

      </div>
    </div>
  );
}