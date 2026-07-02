"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Lock, Eye, Loader2, Sparkles, 
  Download, RefreshCw, Grid, Maximize2, X 
} from 'lucide-react';
import { supabase } from '../lib/supabase'; // Ajuste selon ton projet

// 🔑 COUPLAGE SÉCURITÉ : Définis le mot de passe d'accès pour les mariés ici
const GALLERY_PASSWORD = "GildasMariette2026"; 

export default function GaleriePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Vérifier si les mariés se sont déjà connectés auparavant (via le localStorage)
  useEffect(() => {
    const access = localStorage.getItem('maries_gallery_access');
    if (access === 'true') {
      setIsAuthenticated(true);
      fetchPhotos();
    }
  }, []);

  // Gérer la soumission du mot de passe
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === GALLERY_PASSWORD) {
      localStorage.setItem('maries_gallery_access', 'true');
      setIsAuthenticated(true);
      setPasswordError(false);
      fetchPhotos();
    } else {
      setPasswordError(true);
    }
  };

  // Récupérer la liste des photos depuis Supabase Storage
  const fetchPhotos = async () => {
    setLoading(true);
    try {
      // 1. Lister les fichiers dans le dossier "invites" du bucket
      const { data, error } = await supabase.storage
        .from('wedding-photos')
        .list('invites', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }, // Les plus récentes en premier
        });

      if (error) throw error;

      if (data) {
        // 2. Générer les URLs publiques pour chaque image trouvée
        const imageUrls = data
          .filter(file => file.name !== '.emptyFolderPlaceholder') // Ignorer le fichier fantôme de Supabase
          .map(file => {
            const { data: publicUrlData } = supabase.storage
              .from('wedding-photos')
              .getPublicUrl(`invites/${file.name}`);
            
            return {
              id: file.id,
              name: file.name,
              url: publicUrlData.publicUrl,
              created_at: file.created_at
            };
          });
        
        setImages(imageUrls);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des photos:", err);
    } finally {
      setLoading(false);
    }
  };

  // ÉCRAN 1 : FORMULAIRE DE SÉCURITÉ (ACCÈS MARIÉS)
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
            Veuillez saisir le code d'accès confidentiel pour visionner l'album des invités.
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
              className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] rounded-full shadow-lg transition-all active:scale-98"
            >
              Accéder à la galerie
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ÉCRAN 2 : LA GALERIE PHOTOS
  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-[450px] bg-white shadow-2xl relative min-h-screen pb-12 overflow-x-hidden flex flex-col">
        
        {/* EN-TÊTE FIXE */}
        <div className="px-6 pt-12 pb-4 bg-white sticky top-0 z-20 border-b border-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-amber-400">
              <Sparkles className="w-3 h-3" />
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Album Privé</p>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Les Souvenirs</h1>
          </div>
          
          <button 
            onClick={fetchPhotos}
            disabled={loading}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-all active:scale-95"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* CONTENU / GRILLE DE PHOTOS */}
        <div className="p-4 flex-1">
          {loading && images.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Chargement des clichés...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-center px-6">
              <Grid className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-700">Aucune photo pour l'instant</p>
              <p className="text-xs text-slate-400 mt-1">Les photos envoyées par vos invités via le QR Code apparaîtront ici en temps réel.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img) => (
                <motion.div 
                  key={img.id}
                  layoutId={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative shadow-sm cursor-pointer group border border-slate-100"
                >
                  <img 
                    src={img.url} 
                    alt="Souvenir invité" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <Maximize2 size={14} className="text-white" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* PIED DE PAGE */}
        <div className="text-center pt-8 border-t border-slate-50 mx-6 mt-auto">
          <Heart className="w-4 h-4 text-rose-200 mx-auto mb-1 fill-rose-200" />
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            Gildas & Mariette • Tout droits réservés
          </p>
        </div>

        {/* LIGHTBOX / ZOOM PLEIN ÉCRAN */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 p-3 rounded-full backdrop-blur-md transition-all"
              >
                <X size={20} />
              </button>

              <motion.img 
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                src={selectedImage} 
                alt="Zoom souvenir" 
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()} 
              />

              <div className="mt-6 flex gap-4">
                <a 
                  href={selectedImage}
                  download={`mariage-${Date.now()}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-full font-black uppercase text-[11px] tracking-wider shadow-xl active:scale-95 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={14} />
                  Télécharger la photo
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}