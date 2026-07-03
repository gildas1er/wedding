"use client";
import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, Loader2, Sparkles, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Ajuste le chemin selon ton projet
import imageCompression from 'browser-image-compression';

export default function DepotPhotosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [message, setMessage] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gérer la sélection de l'image et générer l'aperçu
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setIsSuccess(false);
      setErrorMsg(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      // 1. Compression intelligente de l'image (Cible ~1.5 Mo pour fluidifier l'envoi en 4G)
      const options = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      // 2. Générer un nom de fichier unique et propre
      const fileExt = file.name.split('.').pop();
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `invites/${cleanFileName}`;

      // 3. Envoyer le fichier dans Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('wedding-photos')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) throw storageError;

      // 4. Envoyer le prénom et le petit mot dans la table photos_metadata
      const { error: dbError } = await supabase
        .from('photos_metadata')
        .insert([
          {
            file_name: filePath, // On garde le chemin exact pour faire la liaison
            guest_name: guestName.trim() || "Invité anonyme",
            message: message.trim() || null
          }
        ]);

      if (dbError) throw dbError;

      // 5. Réinitialisation en cas de succès
      setIsSuccess(true);
      setFile(null);
      setPreviewUrl(null);
      setGuestName('');
      setMessage('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Une erreur est survenue lors de l'envoi. Réessayez.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center p-4">
      <div className="w-full max-w-[450px] bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100/50 flex flex-col relative overflow-hidden">
        
        {/* Petit effet visuel décoratif en haut */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-300 via-amber-200 to-rose-300" />

        {/* EN-TÊTE */}
        <div className="text-center mt-4 mb-6">
          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" /> Live Album
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Partagez vos souvenirs</h1>
          <p className="text-xs text-slate-400 mt-1 px-4">
            Envoyez vos photos en direct. Elles s'ajouteront instantanément à l'album des mariés.
          </p>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleUpload} className="space-y-4 flex-1 flex flex-col">
          
          {/* ZONE DE DÉPÔT / CAPTURE PHOTO */}
          <label className="relative aspect-[4/3] w-full bg-slate-50 hover:bg-slate-100/70 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-4 cursor-pointer transition-all overflow-hidden group">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
              disabled={isUploading}
            />
            
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Aperçu" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="text-white w-8 h-8" />
                </div>
              </>
            ) : (
              <div className="text-center space-y-2 text-slate-400">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-600 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">Prendre ou choisir une photo</p>
                <p className="text-[10px] text-slate-400">JPEG, PNG jusqu'à 10 Mo</p>
              </div>
            )}
          </label>

          {/* NOUVEAUX CHAMPS : IDENTIFICATION ET TEXTE */}
          {previewUrl && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1 ml-1">
                  Votre Prénom & Nom
                </label>
                <input
                  type="text"
                  placeholder="Ex: Jean Dupont"
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
                  placeholder="Laissez un message attentionné ou une anecdote de la soirée..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 focus:bg-white rounded-2xl text-sm font-medium border border-slate-100 focus:border-rose-200 outline-none transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* ÉTATS ET ERREURS */}
          {isSuccess && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-800 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-xs font-bold">Photo et message envoyés avec succès ! Merci ❤️</p>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-bold text-rose-500 text-center bg-rose-50 py-3 rounded-2xl border border-rose-100">
              {errorMsg}
            </p>
          )}

          {/* BOUTON D'ENVOI DYNAMIQUE */}
          <button
            type="submit"
            disabled={!file || isUploading}
            className={`w-full py-4 rounded-full font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 shadow-md ${
              file && !isUploading
                ? 'bg-slate-950 hover:bg-slate-800 text-white active:scale-98 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Envoyer aux mariés
              </>
            )
          }
        </button>
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