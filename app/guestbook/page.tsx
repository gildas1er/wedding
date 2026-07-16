"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Heart, Send, Sparkles, MessageSquare, Clock, User } from 'lucide-react';

// 1. On sépare la logique qui utilise useSearchParams dans un sous-composant
function GuestbookContent() {
  const searchParams = useSearchParams();
  // On récupère l'ID du mariage dans l'URL (ex: /guestbook?id=ID_DU_MARIAGE)
  const marriageId = searchParams.get('id');

  const [messages, setMessages] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
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
        setMessages((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [marriageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marriageId || !name.trim() || !text.trim() || submitting) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('guestbook')
      .insert([
        {
          marriage_id: marriageId,
          author_name: name.trim(),
          message: text.trim()
        }
      ]);

    if (!error) {
      setText('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } else {
      alert("Oups, impossible d'envoyer le message. Réessayez ! ✨");
    }
    setSubmitting(false);
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

          <button 
            disabled={submitting}
            type="submit" 
            className="w-full py-4 bg-slate-900 hover:bg-rose-500 text-white rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {submitting ? "Envoi en cours..." : "Envoyer mon message"} <Send size={16} />
          </button>
        </form>

        {/* Toast de succès éphémère */}
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
              <p className="text-xs text-slate-500 mt-1">Votre message a été ajouté au livre d'or avec succès.</p>
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
          <div className="space-y-4">
            {messages.map((msg) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative group"
              >
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
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 2. Le composant par défaut englobe le contenu dans un Suspense
export default function PublicGuestbook() {
  return (
    <div className="min-h-screen bg-[#FCF9FC] text-[#1E293B] pb-16" style={{ fontFamily: '"DM Sans", sans-serif' }}>
      {/* HEADER DE LA PAGE */}
      <div className="bg-white border-b border-rose-100/40 text-center py-12 px-6 shadow-sm">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-500 flex items-center justify-center gap-1.5 mb-2">
          <Sparkles size={12} className="fill-rose-100" /> Livre d'or Virtuel <Sparkles size={12} className="fill-rose-100" />
        </span>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Laissez-nous un <span className="text-rose-500 italic">mot doux</span></h1>
        <p className="text-xs text-slate-400 font-bold mt-1.5 max-w-xs mx-auto">Vos vœux et souvenirs resteront gravés à jamais dans notre cœur 🕊️💍</p>
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