"use client";
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, Image as ImageIcon, Camera, 
  CheckCircle2, Loader2, X, Heart, Sparkles 
} from 'lucide-react';
import { supabase } from '../lib/supabase'; // Ajuste le chemin selon ton projet

export default function PhotosUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gérer la sélection des fichiers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);

      // Générer les aperçus visuels
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
      
      // Réinitialiser le statut si l'utilisateur rajoute des photos
      if (status === 'success') setStatus('idle');
    }
  };

  // Supprimer une photo de la liste avant l'envoi
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Envoyer les photos vers Supabase Storage
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setStatus('idle');
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Création d'un nom unique : dossier "invites" / timestamp - nom_fichier
        const fileExt = file.name.split('.').pop();
        const fileName = `invites/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        // Initialiser la progression de ce fichier à 10%
        setProgress(prev => ({ ...prev, [file.name]: 10 }));

        const { error } = await supabase.storage
          .from('wedding-photos') // Doit correspondre exactement au nom de ton bucket Supabase
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Fichier envoyé avec succès
        setProgress(prev => ({ ...prev, [file.name]: 100 }));
      }

      // Tout s'est bien passé
      setStatus('success');
      setFiles([]);
      setPreviews([]);
      setProgress({});
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || "Une erreur est survenue lors du transfert.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-[450px] bg-white shadow-2xl relative min-h-screen pb-12 overflow-x-hidden flex flex-col justify-between">
        
        <div className="px-6 pt-12">
          {/* EN-TÊTE DE LA PAGE */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Album Photo Partagé</p>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 leading-tight">
              Partagez vos <br/>
              <span className="text-rose-500 italic font-serif">plus beaux souvenirs</span>
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-3 max-w-[280px] mx-auto leading-relaxed">
              Pas besoin d'application ! Prenez une photo en direct ou choisissez vos meilleurs clichés depuis votre galerie.
            </p>
          </div>

          {/* ZONE DE DÉPÔT / BOUTON APPAREIL */}
          {status !== 'success' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-[2.5rem] p-8 text-center cursor-pointer transition-all duration-300 group active:scale-98 relative overflow-hidden"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*" 
                multiple 
                className="hidden" 
              />
              
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-4 border border-slate-100 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-8 h-8 text-rose-500" />
              </div>
              
              <p className="text-sm font-bold text-slate-800">Cliquez ici pour ajouter</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">Photos ou vidéos depuis votre téléphone</p>
              
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-100 text-slate-500">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider">
                  <Camera size={14} className="text-slate-400" /> Appareil
                </div>
                <div className="h-3 w-[1px] bg-slate-200" />
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider">
                  <ImageIcon size={14} className="text-slate-400" /> Galerie
                </div>
              </div>
            </div>
          )}

          {/* LISTE ET APERÇU DES SÉLECTIONS */}
          <AnimatePresence>
            {previews.length > 0 && !uploading && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="mt-6 bg-slate-50 p-4 rounded-[2rem] border border-slate-100"
              >
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-1">
                  Sélection ({previews.length})
                </p>
                <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {previews.map((src, index) => (
                    <div key={src} className="aspect-square relative rounded-xl overflow-hidden bg-slate-200 shadow-inner group">
                      <img src={src} alt="Aperçu" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white p-1 rounded-full backdrop-blur-sm transition-all"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PROGRESSION DU CHARGEMENT */}
          <AnimatePresence>
            {uploading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="mt-6 bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                  <div>
                    <h4 className="font-bold text-sm">Envoi des souvenirs en cours...</h4>
                    <p className="text-[10px] text-slate-400">Ne fermez pas cette page</p>
                  </div>
                </div>
                
                {/* Barre globale simplifiée */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    className="bg-rose-500 h-full rounded-full"
                    layoutId="progressBar"
                    initial={{ width: "5%" }}
                    animate={{ width: "95%" }}
                    transition={{ duration: 10 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ÉCRANS DE RÉSULTAT (SUCCÈS / ERREUR) */}
          <AnimatePresence>
            {status === 'success' && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8 px-4 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] mt-6 space-y-4"
              >
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Merci beaucoup !</h3>
                  <p className="text-slate-600 font-medium text-xs mt-1 px-4 leading-relaxed">
                    Vos photos ont bien été ajoutées à l'album du mariage. Elles feront chaud au cœur aux mariés !
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="px-5 py-2.5 bg-white text-emerald-700 border border-emerald-200 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-100/50 transition-all shadow-sm"
                >
                  Envoyer d'autres photos
                </button>
              </motion.div>
            )}

            {status === 'error' && (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold text-center mt-6 border border-rose-100">
                {errorMessage}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* ACTIONS & FOOTER */}
        <div className="px-6 mt-8">
          {files.length > 0 && !uploading && (
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleUpload}
              className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-black uppercase tracking-[0.2em] text-[11px] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              Envoyer les {files.length} photo(s)
            </motion.button>
          )}

          <div className="text-center pt-8">
            <Heart className="w-4 h-4 text-rose-200 mx-auto mb-2 fill-rose-200" />
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
              Album partagé sécurisé <br/> Merci pour votre participation !
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}