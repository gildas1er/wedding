"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, ShieldCheck, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PendingPhoto {
  id: string;
  file_name: string;
  guest_name: string;
  message: string | null;
  url: string;
  created_at: string;
}

export default function ModerationPage() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingPhotos();
  }, []);

  const fetchPendingPhotos = async () => {
    setLoading(true);
    try {
      // 1. Récupérer uniquement les métadonnées non approuvées
      const { data: dbData, error: dbError } = await supabase
        .from('photos_metadata')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;

      if (dbData) {
        // 2. Générer les URLs publiques correspondantes
        const enriched = dbData.map(meta => {
          const { data: publicUrlData } = supabase.storage
            .from('wedding-photos')
            .getPublicUrl(meta.file_name);

          return {
            id: meta.id,
            file_name: meta.file_name,
            guest_name: meta.guest_name,
            message: meta.message,
            url: publicUrlData.publicUrl,
            created_at: meta.created_at
          };
        });
        setPhotos(enriched);
      }
    } catch (err) {
      console.error("Erreur chargement modération:", err);
    } finally {
      setLoading(false);
    }
  };

  // Action : Approuver la photo
  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const { error } = await supabase
        .from('photos_metadata')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) throw error;

      // Retirer localement de la liste des flux à modérer
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Erreur approbation:", err);
    } finally {
      setActionId(null);
    }
  };

  // Action : Refuser et supprimer définitivement (BDD + Storage)
  const handleReject = async (id: string, fileName: string) => {
    if (!confirm("Supprimer définitivement ce cliché ?")) return;
    setActionId(id);
    try {
      // 1. Supprimer du Storage Supabase
      const { error: storageError } = await supabase.storage
        .from('wedding-photos')
        .remove([fileName]);

      if (storageError) throw storageError;

      // 2. Supprimer la ligne en BDD
      const { error: dbError } = await supabase
        .from('photos_metadata')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Erreur suppression:", err);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex justify-center p-4">
      <div className="w-full max-w-[450px] bg-slate-950 rounded-[2.5rem] p-6 my-4 border border-slate-800 shadow-2xl flex flex-col">
        
        {/* EN-TÊTE MODÉRATION */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">Espace Modération</h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {photos.length} {photos.length > 1 ? 'photos en attente' : 'photo en attente'}
            </p>
          </div>
        </div>

        {/* LISTE DES FLUX */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="h-[50vh] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Analyse du flux...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-center px-6 text-slate-500 space-y-2">
              <ImageIcon size={32} className="mx-auto text-slate-700" />
              <p className="text-xs font-bold">Toutes les photos ont été traitées !</p>
              <p className="text-[10px] text-slate-600">Le flux en direct est totalement propre.</p>
            </div>
          ) : (
            <AnimatePresence>
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  className="bg-slate-900 border border-slate-800/60 rounded-3xl p-3 space-y-3 relative overflow-hidden"
                >
                  {/* Visuel */}
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950">
                    <img src={photo.url} alt="Modération" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white">
                      De : {photo.guest_name}
                    </div>
                  </div>

                  {/* Message associé s'il existe */}
                  {photo.message && (
                    <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                      « {photo.message} »
                    </p>
                  )}

                  {/* Actions de validation/rejet */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleReject(photo.id, photo.file_name)}
                      disabled={actionId !== null}
                      className="py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                    
                    <button
                      onClick={() => handleApprove(photo.id)}
                      disabled={actionId !== null}
                      className="py-3 bg-emerald-500 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all hover:bg-emerald-400 active:scale-98 shadow-lg shadow-emerald-500/10"
                    >
                      <Check size={14} strokeWidth={3} /> Valider
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}