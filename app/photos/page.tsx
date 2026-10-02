"use client";
import React, { useEffect, useState } from 'react';
import { Camera, Upload, CheckCircle2, Loader2, Sparkles, Heart, X, Image as ImageIcon } from 'lucide-react';
import { guestSupabase } from '../../lib/supabase-guest';
import imageCompression from 'browser-image-compression';
import { usePublicMarriage } from '../../lib/use-public-marriage';

const MAX_PHOTOS_LIMIT = 5; 

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
}

class UploadError extends Error {}

// Message compréhensible à partir d'une erreur Supabase
function describeError(error: { message?: string; statusCode?: string | number }, fallback: string) {
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('space_archived')) return "Le mariage a eu lieu : l'envoi de photos est terminé.";
  if (msg.includes('album_required') || msg.includes('album_path')) return "Ce lien est incomplet : demandez aux mariés leur lien d'envoi de photos.";
  if (msg.includes('row-level security') || msg.includes('unauthorized') || msg.includes('permission')) return `${fallback} (accès refusé : les mariés doivent vérifier la configuration du dépôt de photos).`;
  if (msg.includes('payload too large') || msg.includes('exceeded') || String(error.statusCode) === '413') return 'Cette photo est trop lourde pour être envoyée.';
  if (msg.includes('bucket not found')) return "L'album n'est pas encore configuré par les mariés.";
  if (msg.includes('fetch') || msg.includes('network')) return 'La connexion semble interrompue. Vérifiez votre réseau puis réessayez.';
  return fallback;
}

export default function DepotPhotosPage() {
  // Lien partagé aux invités : /photos?id=<identifiant du mariage> reprend les prénoms et la palette du couple
  const [marriageId, setMarriageId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    queueMicrotask(() => setMarriageId(id));
  }, []);
  const { marriage, coupleNames, themeStyle, revealClass } = usePublicMarriage(marriageId);
  // Mode souvenir (J+1 mois) : l'envoi de photos est clos
  const photosClosed = marriage?.space_phase === 'souvenir';
  // Chaque photo appartient à un mariage : sans lien complet (?id=…), pas d'envoi possible
  const validMarriageId = marriageId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(marriageId) ? marriageId : null;

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
    const queue = [...selectedFiles];
    setUploadProgress({ current: 0, total: queue.length });
    let sent = 0;

    try {
      for (let i = 0; i < queue.length; i++) {
        const currentItem = queue[i];
        setUploadProgress({ current: i + 1, total: queue.length });
        setCurrentUploadingName(currentItem.file.name);

        // 1. Compression (photo allégée pour un envoi rapide, même en 3G)
        let compressedFile: File;
        try {
          compressedFile = await imageCompression(currentItem.file, { maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg' });
        } catch {
          throw new UploadError(`La photo « ${currentItem.file.name} » n'a pas pu être lue. Essayez une photo JPG ou PNG.`);
        }

        // 2. Envoi du fichier (toujours en tant qu'invité, voir lib/supabase-guest)
        if (!validMarriageId) throw new UploadError("Ce lien est incomplet : demandez aux mariés leur lien d'envoi de photos.");
        // Rangée dans le dossier du mariage (migration 14)
        const filePath = `invites/${validMarriageId}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
        const { error: storageError } = await guestSupabase.storage
          .from('wedding-photos')
          .upload(filePath, compressedFile, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
        if (storageError) {
          console.error('Envoi de la photo refusé :', storageError);
          throw new UploadError(describeError(storageError, "L'envoi de la photo a été refusé par le serveur."));
        }

        // 3. Nom et message de l'invité
        const { error: dbError } = await guestSupabase
          .from('photos_metadata')
          .insert([{ marriage_id: validMarriageId, file_name: filePath, guest_name: guestName.trim() || 'Invité anonyme', message: message.trim() || null }]);
        if (dbError) {
          console.error('Enregistrement du message refusé :', dbError);
          // Pas de photo orpheline sans son nom ni son message
          await guestSupabase.storage.from('wedding-photos').remove([filePath]);
          throw new UploadError(describeError(dbError, "Votre message n'a pas pu être enregistré."));
        }

        // Photo envoyée : retirée de la sélection pour ne jamais la renvoyer en double
        sent++;
        URL.revokeObjectURL(currentItem.previewUrl);
        setSelectedFiles((prev) => prev.filter((f) => f.id !== currentItem.id));
      }

      setIsSuccess(true);
      setGuestName('');
      setMessage('');
    } catch (err: unknown) {
      const reason = err instanceof UploadError ? err.message : 'La connexion semble interrompue. Vérifiez votre réseau puis réessayez.';
      setErrorMsg(sent > 0 ? `${sent} photo${sent > 1 ? 's' : ''} envoyée${sent > 1 ? 's' : ''}. ${reason}` : reason);
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
    <div className={`min-h-screen bg-rose-50 flex justify-center items-center p-4 ${revealClass}`} style={themeStyle}>
      <div className="w-full max-w-[450px] bg-white rounded-[1.75rem] p-6 shadow-xl border border-slate-100/50 flex flex-col relative overflow-hidden">
        
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-300 via-amber-200 to-rose-300" />

        {/* EN-TÊTE */}
        <div className="text-center mt-4 mb-6">
          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" /> Live Album
          </div>
          <h1 className="text-2xl font-normal text-slate-900 tracking-tight">Partagez vos souvenirs</h1>
          <p className="text-xs text-slate-400 mt-1 px-4">
            Envoyez vos photos en un instant pour alimenter l'album des mariés.
          </p>
        </div>

        {/* FORMULAIRE */}
        {marriageId !== undefined && !validMarriageId ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-[1.5rem] bg-slate-50 p-8 text-center">
            <p className="font-display text-xl text-ink">Lien incomplet</p>
            <p className="mt-2 text-sm text-slate-500">Pour envoyer vos photos, utilisez le lien ou le QR code partagé par les mariés.</p>
          </div>
        ) : photosClosed ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-[1.5rem] bg-slate-50 p-8 text-center">
            <p className="font-display text-xl text-ink">L&apos;envoi de photos est terminé</p>
            <p className="mt-2 text-sm text-slate-500">Le mariage a eu lieu. Merci pour tous les souvenirs partagés !</p>
          </div>
        ) : (
        <form onSubmit={handleUpload} className="space-y-4 flex-1 flex flex-col">
          
          {/* ZONE DE SÉLECTION */}
          {selectedFiles.length === 0 && !isUploading && (
            <label className="relative aspect-[4/3] w-full bg-slate-50 hover:bg-slate-100/70 border-2 border-dashed border-slate-200 rounded-[1.5rem] flex flex-col items-center justify-center p-4 cursor-pointer transition-all group">
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
            <div className="bg-slate-950 text-white rounded-[1.5rem] p-5 space-y-4 shadow-inner animate-in fade-in zoom-in-95 duration-200">
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
              <p className="text-xs font-bold">Vos photos et votre message ont été transmis ! Merci</p>
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
        )}

        {/* PIED DE PAGE */}
        <div className="text-center pt-6 mt-6 border-t border-slate-50">
          <Heart className="w-4 h-4 text-rose-200 mx-auto mb-1 fill-rose-200" />
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            {coupleNames || 'Les mariés'}
          </p>
        </div>

      </div>
    </div>
  );
}