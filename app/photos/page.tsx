"use client";
import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, Loader2, Sparkles, Heart, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Ajuste le chemin selon ton projet
import imageCompression from 'browser-image-compression';

const MAX_PHOTOS_LIMIT = 5; 

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
}

export default function DepotPhotosPage() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [guestName, setGuestName] = useState('');
  const [message, setMessage] = useState('');
  
  // États pour le chargement avancé
  const [isUploading, setIsUploading] = useState(false);
  const [currentUploadingName, setCurrentUploadingName] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      if (selectedFiles.length + filesArray.length > MAX_PHOTOS_LIMIT) {
        setErrorMsg(`Vous ne pouvez pas envoyer plus de ${MAX_PHOTOS_LIMIT} photos à la fois.`);
        return;
      }

      setErrorMsg(null);
      setIsSuccess(false);

      const newFiles: SelectedFile[] = filesArray.map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file: file,
        previewUrl: URL.createObjectURL(file)
      }));

      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string, previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    setSelectedFiles(prev => prev.filter(item => item.id !== id));
    setErrorMsg(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const currentItem = selectedFiles[i];
        
        // Mettre à jour les indicateurs visuels pour l'invité
        setUploadProgress({ current: i + 1, total: selectedFiles.length });
        setCurrentUploadingName(currentItem.file.name);

        // 1. Compression intelligente
        const options = {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(currentItem.file, options);

        // 2. Nom unique
        const fileExt = currentItem.file.name.split('.').pop();
        const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `invites/${cleanFileName}`;

        // 3. Storage Supabase
        const { error: storageError } = await supabase.storage
          .from('wedding-photos')
          .upload(filePath, compressedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (storageError) throw storageError;

        // 4. Base de données
        const { error: dbError } = await supabase
          .from('photos_metadata')
          .insert([
            {
              file_name: filePath,
              guest_name: guestName.trim() || "Invité anonyme",
              message: message.trim() || null
            }
          ]);

        if (dbError) throw dbError;
        
        URL.revokeObjectURL(currentItem.previewUrl);
      }

      setIsSuccess(true);
      setSelectedFiles([]);
      setGuestName('');
      setMessage('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Une erreur est survenue durant le transfert. Veuillez réessayer.");
    } finally {
      setIsUploading(false);
      setCurrentUploadingName('');
    }
  };

  // Calcul du pourcentage brut pour la barre de chargement
  const progressPercentage = uploadProgress.total > 0 
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center p-4">
      <div className="w-full max-w-[450px] bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100/50 flex flex-col relative overflow-hidden">
        
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-300 via-amber-200 to-rose-300" />

        {/* EN-TÊTE */}
        <div className="text-center mt-4 mb-6">
          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" /> Live Album
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Partagez vos souvenirs</h1>
          <p className="text-xs text-slate-400 mt-1 px-4">
            Envoyez vos photos en un instant pour alimenter l'album des mariés.
          </p>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleUpload} className="space-y-4 flex-1 flex flex-col">
          
          {/* ZONE DE SÉLECTION */}
          {selectedFiles.length === 0 && !isUploading && (
            <label className="relative aspect-[4/3] w-full bg-slate-50 hover:bg-slate-100/70 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-4 cursor-pointer transition-all group">
              <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
              <div className="text-center space-y-2 text-slate-400">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-600 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">Prendre ou sélectionner des photos</p>
                <p className="text-[10px] text-slate-400">Maximum {MAX_PHOTOS_LIMIT} photos à la fois</p>
              </div>
            </label>
          )}

          {/* LISTE DES MINIATURES */}
          {selectedFiles.length > 0 && !isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Photos sélectionnées ({selectedFiles.length}/{MAX_PHOTOS_LIMIT})
                </span>
                <label className="text-[11px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer">
                  + Ajouter
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                </label>
              </div>
              
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-[1.5rem] border border-slate-100">
                {selectedFiles.map((item) => (
                  <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-200 border border-slate-200">
                    <img src={item.previewUrl} alt="Miniature" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(item.id, item.previewUrl)}
                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISU DE CHARGEMENT AVANCÉ (S'affiche pendant l'upload actif) */}
          {isUploading && (
            <div className="bg-slate-950 text-white rounded-[2rem] p-5 space-y-4 shadow-inner animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">Envoi en cours</span>
                </div>
                <span className="text-xs font-black bg-white/10 px-2.5 py-1 rounded-full">
                  {uploadProgress.current} / {uploadProgress.total}
                </span>
              </div>

              {/* Barre de progression physique */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-300 to-rose-400 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* Détails du fichier actuel */}
              <div className="flex items-center gap-2 text-white/60 bg-white/5 p-2.5 rounded-xl truncate">
                <ImageIcon size={14} className="shrink-0 text-white/40" />
                <p className="text-[10px] font-medium truncate">
                  Envoi de : <span className="text-white font-bold">{currentUploadingName || "Fichier..."}</span>
                </p>
              </div>
            </div>
          )}

          {/* CHAMPS FORMULAIRE */}
          {selectedFiles.length > 0 && !isUploading && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1 ml-1">
                  Votre Prénom & Nom
                </label>
                <input
                  type="text"
                  placeholder="Ex: Priscille"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-slate-50 focus:bg-white rounded-2xl text-sm font-medium border border-slate-100 focus:border-rose-200 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1 ml-1">
                  Un petit mot pour les mariés (Optionnel)
                </label>
                <textarea
                  placeholder="Laissez un message attentionné..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 focus:bg-white rounded-2xl text-sm font-medium border border-slate-100 focus:border-rose-200 outline-none transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* SUCCÈS & ERREURS */}
          {isSuccess && !isUploading && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-xs font-bold">Vos photos et votre message ont été transmis ! Merci ❤️</p>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-bold text-rose-500 text-center bg-rose-50 py-3 rounded-2xl border border-rose-100">
              {errorMsg}
            </p>
          )}

          {/* BOUTON SOUMISSION DÉSACTIVÉ PENDANT L'UPLOAD */}
          {!isUploading && (
            <button
              type="submit"
              disabled={selectedFiles.length === 0}
              className={`w-full py-4 rounded-full font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 shadow-md ${
                selectedFiles.length > 0
                  ? 'bg-slate-950 hover:bg-slate-800 text-white active:scale-98 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Upload className="w-4 h-4" />
              Envoyer les {selectedFiles.length} photos
            </button>
          )}
        </form>

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