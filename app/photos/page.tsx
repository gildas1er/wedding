"use client";
import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, Loader2, Sparkles, Heart, X } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Ajuste le chemin selon ton projet
import imageCompression from 'browser-image-compression';

// ⚙️ CONFIGURATION : Limite maximale de photos par envoi
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
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gérer la sélection multiple des images
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      // Vérifier si le total dépasse la limite autorisée
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

  // Supprimer une photo de la liste avant l'envoi
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
      // Boucle sur chaque fichier sélectionné
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(prev => ({ ...prev, current: i + 1 }));
        const currentItem = selectedFiles[i];

        // 1. Compression intelligente (~1.5 Mo)
        const options = {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(currentItem.file, options);

        // 2. Générer un nom unique
        const fileExt = currentItem.file.name.split('.').pop();
        const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `invites/${cleanFileName}`;

        // 3. Stockage dans Supabase
        const { error: storageError } = await supabase.storage
          .from('wedding-photos')
          .upload(filePath, compressedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (storageError) throw storageError;

        // 4. Enregistrement des métadonnées (Liaison prénom + message)
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
        
        // Libérer la mémoire de l'URL d'aperçu
        URL.revokeObjectURL(currentItem.previewUrl);
      }

      // Réinitialisation globale après succès complet
      setIsSuccess(true);
      setSelectedFiles([]);
      setGuestName('');
      setMessage('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Une erreur est survenue durant l'envoi de vos clichés. Veuillez réessayer.");
    } finally {
      setIsUploading(false);
    }
  };

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
            Envoyez jusqu'à {MAX_PHOTOS_LIMIT} clichés simultanément pour alimenter l'album des mariés.
          </p>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleUpload} className="space-y-4 flex-1 flex flex-col">
          
          {/* ZONE DE DÉPÔT / DÉCLENCHEUR SÉLECTION */}
          {selectedFiles.length === 0 ? (
            <label className="relative aspect-[4/3] w-full bg-slate-50 hover:bg-slate-100/70 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-4 cursor-pointer transition-all group">
              <input 
                type="file" 
                accept="image/*" 
                multiple // 👈 Permet la multi-sélection
                onChange={handleFileChange} 
                className="hidden" 
                disabled={isUploading}
              />
              <div className="text-center space-y-2 text-slate-400">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-600 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">Prendre ou sélectionner des photos</p>
                <p className="text-[10px] text-slate-400">Maximum {MAX_PHOTOS_LIMIT} photos par envoi</p>
              </div>
            </label>
          ) : (
            /* GRILLE D'APERÇUS SI DES PHOTOS SONT SÉLECTIONNÉES */
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Photos sélectionnées ({selectedFiles.length}/{MAX_PHOTOS_LIMIT})
                </span>
                {!isUploading && (
                  <label className="text-[11px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer">
                    + Ajouter
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-[1.5rem] border border-slate-100">
                {selectedFiles.map((item) => (
                  <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden group bg-slate-200 border border-slate-200">
                    <img src={item.previewUrl} alt="Aperçu miniature" className="w-full h-full object-cover" />
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(item.id, item.previewUrl)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAMPS D'IDENTIFICATION (S'AFFICHENT DÈS QU'IL Y A AU MOINS UNE PHOTO) */}
          {selectedFiles.length > 0 && (
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
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1 ml-1">
                  Un petit mot pour les mariés (Optionnel)
                </label>
                <textarea
                  placeholder="Laissez un message global pour accompagner vos photos..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 focus:bg-white rounded-2xl text-sm font-medium border border-slate-100 focus:border-rose-200 outline-none transition-all resize-none"
                  disabled={isUploading}
                />
              </div>
            </div>
          )}

          {/* NOTIFICATIONS DE SUCCÈS ET D'ERREURS */}
          {isSuccess && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-800 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-xs font-bold">Vos photos et votre message ont été transmis ! Merci ❤️</p>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-bold text-rose-500 text-center bg-rose-50 py-3 rounded-2xl border border-rose-100 animate-in shake">
              {errorMsg}
            </p>
          )}

          {/* BOUTON SOUMISSION DYNAMIQUE */}
          <button
            type="submit"
            disabled={selectedFiles.length === 0 || isUploading}
            className={`w-full py-4 rounded-full font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 shadow-md ${
              selectedFiles.length > 0 && !isUploading
                ? 'bg-slate-950 hover:bg-slate-800 text-white active:scale-98 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi : {uploadProgress.current} / {uploadProgress.total} ...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Envoyer {selectedFiles.length > 0 ? `les ${selectedFiles.length} photos` : 'aux mariés'}
              </>
            )}
          </button>
        </form>

        {/* FOOTER */}
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