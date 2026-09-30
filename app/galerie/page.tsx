"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Lock, Loader2, Sparkles, 
  Download, RefreshCw, Grid, Maximize2, X, MessageCircle, Calendar
} from 'lucide-react';
interface EnrichedImage {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

interface GuestPost {
  guest_name: string;
  message: string | null;
  created_at: string;
  images: EnrichedImage[];
}

export default function GaleriePage() {
  // null = vérification en cours auprès du serveur
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Le mot de passe est vérifié côté serveur, qui pose un cookie httpOnly
  const fetchPhotosAndMetadata = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/galerie/photos', { cache: 'no-store' });
      if (res.status === 401) { setIsAuthenticated(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { posts } = await res.json();
      setPosts(posts);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Erreur lors du chargement de l'album:", err);
      setIsAuthenticated((prev) => prev ?? false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Nettoie l'ancien accès stocké dans le navigateur (non sécurisé)
    try { localStorage.removeItem('maries_gallery_access'); } catch {}
    fetchPhotosAndMetadata();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput || submitting) return;
    setSubmitting(true);
    setPasswordError(null);
    try {
      const res = await fetch('/api/galerie/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        setPasswordError(error || 'Mot de passe incorrect.');
        return;
      }
      setPasswordInput('');
      await fetchPhotosAndMetadata();
    } catch {
      setPasswordError('Connexion impossible. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] bg-white rounded-[1.75rem] p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-normal text-slate-900">Espace Mariés</h1>
          <p className="text-xs font-medium text-slate-500 mt-2 mb-6">Saisissez le code d&apos;accès pour ouvrir la galerie.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" placeholder="Mot de passe" value={passwordInput} autoComplete="current-password"
              onChange={(e) => setPasswordInput(e.target.value)}
              aria-invalid={Boolean(passwordError)}
              className={`w-full p-4 bg-slate-50 rounded-2xl text-center font-bold outline-none border ${passwordError ? 'border-rose-500 bg-rose-50' : 'border-slate-100'}`}
            />
            {passwordError && <p role="alert" className="text-xs font-bold text-rose-500">{passwordError}</p>}
            <button type="submit" disabled={submitting} className="w-full py-4 bg-slate-950 text-white font-black uppercase tracking-widest text-[11px] rounded-full shadow-lg flex items-center justify-center gap-2 disabled:opacity-60">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Accéder
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-[450px] bg-white shadow-2xl relative min-h-screen pb-12 flex flex-col">
        
        {/* EN-TÊTE */}
        <div className="px-6 pt-12 pb-4 bg-white sticky top-0 z-20 border-b border-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-amber-500">
              <Sparkles className="w-3 h-3" />
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Album Souvenirs & Mots doux</p>
            </div>
            <h1 className="text-2xl font-normal text-slate-900">Le Livre d&apos;Or</h1>
          </div>
          <button 
            onClick={fetchPhotosAndMetadata} disabled={loading}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* FIL D'ACTUALITÉ */}
        <div className="p-4 flex-1 space-y-6">
          {loading && posts.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Regroupement des souvenirs...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-center px-6">
              <Grid className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-700">Aucun partage pour le moment</p>
            </div>
          ) : (
            posts.map((post, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4 space-y-3.5 shadow-sm"
              >
                {/* Infos Invité */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-950 text-white rounded-full flex items-center justify-center font-black text-[10px]">
                      {post.guest_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 leading-tight">{post.guest_name}</h3>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  
                  <span className="bg-slate-200/60 text-slate-600 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {post.images.length} {post.images.length > 1 ? 'Photos' : 'Photo'}
                  </span>
                </div>

                {/* Message textuel de l'invité */}
                {post.message && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5 mx-0.5 shadow-sm">
                    <MessageCircle size={14} className="text-rose-300 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed italic">
                      « {post.message} »
                    </p>
                  </div>
                )}

                {/* Gestion de l'affichage des images selon le nombre envoyé */}
                <div className={`grid gap-1.5 ${
                  post.images.length === 1 ? 'grid-cols-1' : 
                  post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                }`}>
                  {post.images.map((img) => (
                    <div 
                      key={img.id}
                      onClick={() => setSelectedImage(img.url)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer bg-slate-200 group border border-slate-200/40 ${
                        post.images.length > 2 && post.images.indexOf(img) === 0 ? 'col-span-3 aspect-[16/10]' : 'aspect-square'
                      }`}
                    >
                      <img src={img.url} alt="Souvenir" className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300" loading="lazy" />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 size={14} className="text-white drop-shadow-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* PIED DE PAGE */}
        <div className="text-center pt-8 border-t border-slate-50 mx-6 mt-auto">
          <Heart className="w-4 h-4 text-rose-200 mx-auto mb-1 fill-rose-200" />
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Album des mariés • Livre d&apos;Or</p>
        </div>

        {/* LIGHTBOX UNIFIÉE (ZOOM SIMPLE) */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 text-white/70 bg-white/10 p-3 rounded-full backdrop-blur-md">
                <X size={20} />
              </button>
              <img src={selectedImage} alt="Zoom" className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl" />
              <div className="mt-4">
                <a href={selectedImage} download target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-slate-900 rounded-full font-black uppercase text-[10px] tracking-wider flex items-center gap-2">
                  <Download size={12} /> Télécharger l&apos;original
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}