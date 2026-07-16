"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Heart, Send, Sparkles, MessageSquare, Clock, User, Camera, X, Image as ImageIcon } from 'lucide-react';

function GuestbookContent() {
  const searchParams = useSearchParams();
  const marriageId = searchParams.get('id');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Charger les messages existants
  useEffect(() => {
    if (!marriageId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('guestbook')
        .select('*')
        .eq('marriage_id', marriageId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    };

    fetchMessages();

    // S'abonner aux nouveaux messages en temps réel
    const subscription = supabase
      .channel('realtime-guestbook')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'guestbook', 
        filter: `marriage_id=eq.${marriageId}` 
      }, (payload) => {
        setMessages((prev) => {
          if (prev.some(msg => msg.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [marriageId]);

  // Gérer la sélection de l'image
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marriageId || !name.trim() || !text.trim() || submitting) return;

    setSubmitting(true);
    let uploadedImageUrl = null;

    try {
      // 1. Si une image est sélectionnée, on l'upload d'abord dans Supabase Storage
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${marriageId}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('guestbook-photos')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // Récupérer l'URL publique de l'image
        const { data: { publicUrl } } = supabase.storage
          .from('guestbook-photos')
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
      }

      // 2. Insérer le message en base de données avec l'URL de l'image si elle existe
      const { data, error } = await supabase
        .from('guestbook')
        .insert([
          {
            marriage_id: marriageId,
            author_name: name.trim(),
            message: text.trim(),
            image_url: uploadedImageUrl
          }
        ])
        .select();

      if (!error && data && data[0]) {
        setMessages((prev) => [data[0], ...prev]);
        setText('');
        removeSelectedFile();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        throw error;
      }
    } catch (error) {
      console.error(error);
      alert("Oups, impossible d'envoyer votre message avec la photo. Réessayez ! ✨");
    } finally {
      setSubmitting(false);
    }
  };

  if (!marriageId) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFBFD] p-6 text-center">
        <div className="max-w-md p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
          <Heart className="text-rose-400 mx-auto mb-4 animate-pulse" size={40} />
          <h1 className="text-xl font-black text-slate-800">Livre d'or introuvable</h1>
          <p className="text-sm text-slate-500 mt-2">Le lien d'accès semble incomplet ou incorrect. ✨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 mt-8 space-y-8">
      {/* FORMULAIRE D'AJOUT */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
          <MessageSquare size={16} className="text-rose-500" /> Rédiger vos vœux
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">👤 Votre Nom / Famille</label>
            <input 
              required 
              type="text" 
              placeholder="Ex: Famille Dupont ou Sarah & Marc" 
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-400 outline-none transition-all font-bold text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">✍️ Votre Message</label>
            <textarea 
              required 
              rows={4}
              placeholder="Écrivez votre message ici..." 
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-400 outline-none transition-all font-bold text-sm resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* AJOUT DE PHOTO */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">📸 Ajouter un souvenir photo (Optionnel)</label>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              capture="environment" // 👈 Magique : force l'ouverture de l'appareil photo arrière sur mobile
              className="hidden" 
              onChange={handleFileChange}
            />
            
            {!previewUrl ? (
              <button 
                type="button" 
                onClick={triggerFileInput}
                className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-rose-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-rose-500 bg-slate-50/50 transition-all cursor-pointer"
              >
                <Camera size={24} />
                <span className="text-xs font-bold">Prendre une photo ou importer</span>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={previewUrl} alt="Aperçu" className="w-full h-48 object-cover" />
                <button 
                  type="button" 
                  onClick={removeSelectedFile}
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-rose-500 text-white rounded-full transition-all shadow-md"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <button 
            disabled={submitting}
            type="submit" 
            className="w-full py-4 bg-slate-900 hover:bg-rose-500 text-white rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {submitting ? "Envoi du message et de la photo..." : "Envoyer mon message"} <Send size={16} />
          </button>
        </form>

        {/* Toast de succès */}
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 15 }}
              className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center text-center p-6"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3 text-2xl">✨</div>
              <h4 className="text-md font-black text-slate-800">Merci infiniment ! ❤️</h4>
              <p className="text-xs text-slate-500 mt-1">Votre souvenir photo a bien été ajouté au livre d'or.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LISTE DES MESSAGES REÇUS */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 px-1">
          🕊️ Les mots partagés ({messages.length})
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-rose-100 border-t-rose-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2 font-bold">Lecture des messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white py-12 px-6 text-center rounded-3xl border border-slate-100 shadow-sm">
            <span className="text-3xl">🕯️</span>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3">Aucun message pour l'instant</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Soyez le tout premier à laisser un souvenir !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {messages.map((msg) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between relative"
              >
                {/* Image jointe */}
                {msg.image_url && (
                  <div className="w-full h-64 overflow-hidden relative border-b border-slate-50">
                    <img 
                      src={msg.image_url} 
                      alt={`Photo de ${msg.author_name}`} 
                      className="w-full h-full object-cover hover:scale-105 transition-all duration-500"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Corps du message */}
                <div className="p-6">
                  <div className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                    "{msg.message}"
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-slate-50 mt-4 pt-3 text-[10px] text-slate-400 font-bold">
                    <span className="flex items-center gap-1 text-slate-600">
                      <User size={12} className="text-rose-400" /> {msg.author_name}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={12} /> {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicGuestbook() {
  return (
    <div className="min-h-screen bg-[#FCF9FC] text-[#1E293B] pb-16" style={{ fontFamily: '"DM Sans", sans-serif' }}>
      {/* HEADER */}
      <div className="bg-white border-b border-rose-100/40 text-center py-12 px-6 shadow-sm">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-500 flex items-center justify-center gap-1.5 mb-2">
          <Sparkles size={12} className="fill-rose-100" /> Livre d'or Virtuel <Sparkles size={12} className="fill-rose-100" />
        </span>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Laissez-nous un <span className="text-rose-500 italic">mot doux</span></h1>
        <p className="text-xs text-slate-400 font-bold mt-1.5 max-w-xs mx-auto">Prenez une jolie photo et laissez-nous vos meilleurs vœux ! 📸💍</p>
      </div>

      <Suspense fallback={
        <div className="text-center py-24">
          <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 font-bold text-rose-500 text-sm">Chargement du livre d'or...</p>
        </div>
      }>
        <GuestbookContent />
      </Suspense>
    </div>
  );
}