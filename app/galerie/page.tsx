"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Lock, Loader2, Sparkles, 
  Download, RefreshCw, Grid, Maximize2, X, User, MessageCircle 
} from 'lucide-react';
import { supabase } from '../lib/supabase'; // Ajuste selon ton projet

// 🔑 SÉCURITÉ : Mot de passe d'accès pour les mariés
const GALLERY_PASSWORD = "GildasMariette2026"; 

interface EnrichedImage {
  id: string;
  name: string;
  url: string;
  created_at: string;
  guest_name: string;
  message: string | null;
}

export default function GaleriePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [images, setImages] = useState<EnrichedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<EnrichedImage | null>(null);

  useEffect(() => {
    const access = localStorage.getItem('maries_gallery_access');
    if (access === 'true') {
      setIsAuthenticated(true);
      fetchPhotosAndMetadata();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === GALLERY_PASSWORD) {
      localStorage.setItem('maries_gallery_access', 'true');
      setIsAuthenticated(true);
      setPasswordError(false);
      fetchPhotosAndMetadata();
    } else {
      setPasswordError(true);
    }
  };

  // Récupération combinée : Fichiers Storage + Lignes de la Table SQL
  const fetchPhotosAndMetadata = async () => {
    setLoading(true);
    try {
      // 1. Récupérer toutes les métadonnées de la table SQL (les plus récentes d'abord)
      const { data: dbData, error: dbError } = await supabase
        .from('photos_metadata')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      // 2. Récupérer la liste des fichiers bruts dans le Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('wedding-photos')
        .list('invites', { limit: 100 });

      if (storageError) throw storageError;

      if (storageData && dbData) {
        // 3. Associer chaque fichier du storage à sa ligne correspondante en BDD via `file_name`
        const enrichedUrls = storageData
          .filter(file => file.name !== '.emptyFolderPlaceholder')
          .map(file => {
            const filePath = `invites/${file.name}`;
            const meta = dbData.find(d => d.file_name === filePath);
            
            const { data: publicUrlData } = supabase.storage
              .from('wedding-photos')
              .getPublicUrl(filePath);
            
            return {
              id: file.id,
              name: file.name,
              url: publicUrlData.publicUrl,
              created_at: file.created_at || new Date().toISOString(),
              guest_name: meta?.guest_name || "Invité anonyme",
              message: meta?.message || null
            };
          });

        // Retrier le résultat final par date de création (décroissant)
        enrichedUrls.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setImages(enrichedUrls as EnrichedImage[]);
      }
    } catch (err) {
      console.error("Erreur lors du chargement de l'album:", err);
    } finally {
      setLoading(false);
    }
  };

  // ÉCRAN 1 : FORMULAIRE DE SÉCURITÉ
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px] bg-white rounded-[2.5rem] p-8 shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Espace Mariés</h1>
          <p className="text-xs font-medium text-slate-500 mt-2 mb-6">
            Saisissez le code d'accès pour ouvrir le livre d'or photo.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password"
              placeholder="Mot de passe"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className={`w-full p-4 bg-slate-50 rounded-2xl text-center font-bold outline-none border focus:ring-2 focus:ring-rose-100 transition-all ${
                passwordError ? 'border-rose-500 bg-rose-50/50' : 'border-slate-100'
              }`}
            />
            {passwordError && (
              <p className="text-[11px] font-bold text-rose-500">Code incorrect. Veuillez réessayer.</p>
            )}
            <button
              type="submit"
              className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] rounded-full shadow-lg transition-all"
            >
              Accéder à la galerie
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ÉCRAN 2 : LA GALERIE LIVRE D'OR
  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-[450px] bg-white shadow-2xl relative min-h-screen pb-12 overflow-x-hidden flex flex-col">
        
        {/* EN-TÊTE */}
        <div className="px-6 pt-12 pb-4 bg-white sticky top-0 z-20 border-b border-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-amber-400">
              <Sparkles className="w-3 h-3" />
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Album Souvenirs & Mots doux</p>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Le Livre d'Or</h1>
          </div>
          
          <button 
            onClick={fetchPhotosAndMetadata}
            disabled={loading}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-all active:scale-95"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* CONTENU / FIL D'ACTUALITÉ PHOTO */}
        <div className="p-4 flex-1 space-y-4">
          {loading && images.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Génération des souvenirs...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-center px-6">
              <Grid className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-700">L'album est vide pour le moment</p>
              <p className="text-xs text-slate-400 mt-1">Dès que vos convives enverront des clichés signés, ils s'ordonneront ici magnifiquement.</p>
            </div>
          ) : (
            // Affichage en liste de "Cartes Souvenirs" pour une lecture confortable
            images.map((img) => (
              <motion.div 
                key={img.id}
                layoutId={img.id}
                className="bg-slate-50 border border-slate-100 rounded-[2rem] overflow-hidden p-3 space-y-3 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image cliquable pour zoom */}
                <div 
                  onClick={() => setSelectedImage(img)}
                  className="relative aspect-square bg-slate-200 rounded-[1.5rem] overflow-hidden cursor-pointer group"
                >
                  <img 
                    src={img.url} 
                    alt={`Photo de ${img.guest_name}`} 
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3 bg-black/40 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={12} />
                  </div>
                </div>

                {/* Pied de la carte : Auteur et Message */}
                <div className="px-2 pb-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <div className="w-5 h-5 bg-rose-50 rounded-md flex items-center justify-center text-rose-500">
                      <User size={12} />
                    </div>
                    <span className="text-xs font-black tracking-tight">{img.guest_name}</span>
                  </div>

                  {img.message && (
                    <div className="bg-white border border-slate-100/70 rounded-xl p-2.5 flex items-start gap-2">
                      <MessageCircle size={12} className="text-slate-300 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                        « {img.message} »
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* PIED DE PAGE */}
        <div className="text-center pt-8 border-t border-slate-50 mx-6 mt-auto">
          <Heart className="w-4 h-4 text-rose-200 mx-auto mb-1 fill-rose-200" />
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            Gildas & Mariette • Tout droits réservés
          </p>
        </div>

        {/* LIGHTBOX MODE PLEIN ÉCRAN */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-between p-4"
              onClick={() => setSelectedImage(null)}
            >
              {/* Bouton Fermer Haut */}
              <div className="w-full flex justify-end pt-2 pr-2">
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="text-white/70 hover:text-white bg-white/10 p-3 rounded-full backdrop-blur-md transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* L'image zoomée */}
              <motion.img 
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                src={selectedImage.url} 
                alt="Zoom souvenir" 
                className="max-w-full max-h-[65vh] rounded-2xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()} 
              />

              {/* Cartouche d'informations bas en plein écran */}
              <div 
                className="w-full max-w-[400px] bg-white/10 border border-white/10 backdrop-blur-lg rounded-[2rem] p-4 text-center text-white mb-4 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/50 font-black">Capturé par</p>
                  <p className="text-sm font-black mt-0.5">{selectedImage.guest_name}</p>
                </div>

                {selectedImage.message && (
                  <p className="text-xs font-medium text-white/80 italic px-2">
                    « {selectedImage.message} »
                  </p>
                )}

                <div className="pt-2">
                  <a 
                    href={selectedImage.url}
                    download={`mariage-${selectedImage.guest_name}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-full font-black uppercase text-[10px] tracking-wider shadow-xl transition-all active:scale-95"
                  >
                    <Download size={12} />
                    Sauvegarder la photo
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}