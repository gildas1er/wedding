"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Calendar, MapPin, GlassWater, 
  CheckCircle2, Clock, Users, Loader2, Sparkles,
  Church, Cross, Compass, MessageCircle, XCircle 
} from 'lucide-react';
import { supabase } from '../../../lib/supabase'; // Utilisation de ton client existant

export default function PublicRSVP() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-rose-500" />
      </div>
    }>
      <RSVPContent />
    </Suspense>
  );
}

function RSVPContent() {
  const params = useParams();
  const id = params?.id; // ID du mariage
  const searchParams = useSearchParams();
  

  // SÉCURITÉ & NETTOYAGE : Élimine les guillemets (" ou ') qui font planter le type UUID de PostgreSQL
  const rawGuestId = searchParams.get('guest');
  const guestId = rawGuestId ? rawGuestId.replace(/['"]+/g, '') : null;
  
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [marriage, setMarriage] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  
  const [hasPlusOne, setHasPlusOne] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    status: 'en_attente',
    guests_count: 1,
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) { setLoading(false); return; }
      try {
        // 1. Récupérer les infos du mariage
        const { data: mData } = await supabase
          .from('marriages')
          .select('*')
          .eq('id', id)
          .single();
        if (mData) setMarriage(mData);

        // 2. Récupérer les infos de l'invité spécifique
        if (guestId) {
          const { data: gData } = await supabase
            .from('invite')
            .select('name, status, guests_count')
            .eq('id', guestId)
            .single();
          
          if (gData) {
            setGuestName(gData.name);
            setForm(prev => ({ 
              ...prev, 
              status: gData.status || 'en_attente',
              guests_count: gData.guests_count || 1 
            }));
          }
        }
      } catch (e) { 
        console.error("Erreur de chargement:", e); 
      }
      setLoading(false);
    };
    fetchData();
  }, [id, guestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId) return;
    setSending(true);

    // Si décliné, le compte retombe à 0 (ou 1 par défaut selon ta logique métier)
    const finalCount = form.status === 'décliné' ? 0 : form.guests_count;

    const { error } = await supabase
      .from('invite')
      .update({
        status: form.status,
        guests_count: finalCount,
        // notes: form.notes // Assure-toi d'avoir une colonne 'notes' dans ta table invite
      })
      .eq('id', guestId);

    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      setSubmitted(true);
    }
    setSending(false);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Heart className="w-12 h-12 text-rose-500 animate-pulse fill-rose-500" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Préparation de votre invitation...</p>
      </div>
    </div>
  );

  // Valeurs par défaut si le mariage n'est pas encore chargé ou inexistant
  const m = marriage || {
    partner_1_name: "Sarah", partner_2_name: "Marc",
    primary_color: "#f43f5e", invitation_text: "VOUS ÊTES INVITÉS",
    wedding_date: new Date(), mairie_hour: "14:00", mairie_location: "Hôtel de Ville",
    reception_hour: "19:00", reception_location: "Domaine de la Rose"
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-[450px] bg-white shadow-2xl relative min-h-screen pb-12 overflow-x-hidden">
        
        {/* BANNIÈRE IMAGE */}
        <div className="h-[40vh] relative">
          <img 
            src={m.bg_image_url || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80"} 
            className="w-full h-full object-cover" 
            alt="Wedding" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-black/40" />
        </div>

        {/* CARTE DATE */}
        <div className="px-6 -mt-20 relative z-10">
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] shadow-xl p-6 mb-8 border-b-4 text-center"
            style={{ borderBottomColor: m.primary_color }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 text-slate-400">Enregistrez la date</p>
            <h3 className="text-xl font-black text-slate-800">
              {new Date(m.wedding_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
          </motion.div>

          {/* NOMS DES MARIÉS */}
          <div className="text-center mb-10">
             <div className="flex items-center justify-center gap-3 mb-3">
                <div className="h-[1px] w-8 bg-slate-200" />
                <Sparkles className="w-4 h-4 text-amber-400" />
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{m.invitation_text}</p>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div className="h-[1px] w-8 bg-slate-200" />
             </div>
             <h1 className="text-4xl font-black text-slate-900 leading-tight">
               {m.partner_1_name} <br/>
               <span className="text-rose-500 italic text-3xl font-serif">&</span> <br/>
               {m.partner_2_name}
             </h1>
          </div>

          {/* PROGRAMME */}
          <div className="space-y-4 mb-10">
            <ProgramItem 
                icon={Church} 
                title="La Cérémonie" 
                time={m.mairie_hour} 
                loc={m.mairie_location} 
                color="rose"
                maps={m.mairie_maps_url}
            />
            <ProgramItem 
                icon={GlassWater} 
                title="Le Cocktail & Dîner" 
                time={m.reception_hour} 
                loc={m.reception_location} 
                color="amber"
                maps={m.reception_maps_url}
            />
          </div>

          {/* FORMULAIRE RSVP */}
          <div className="bg-slate-50 rounded-[3rem] p-8 border border-slate-100 shadow-inner relative">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Confirmation pour</p>
                  <h2 className="text-2xl font-black text-slate-800">{guestName || "Cher invité"}</h2>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setForm({...form, status: 'confirmé'})}
                    className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                        form.status === 'confirmé' 
                        ? 'bg-slate-900 text-white shadow-lg scale-105' 
                        : 'bg-white text-slate-400 border border-slate-200'
                    }`}
                  >
                    Je serai là
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setForm({...form, status: 'décliné'})}
                    className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                        form.status === 'décliné' 
                        ? 'bg-rose-500 text-white shadow-lg scale-105' 
                        : 'bg-white text-slate-400 border border-slate-200'
                    }`}
                  >
                    Je décline
                  </button>
                </div>

                <AnimatePresence>
                  {form.status === 'confirmé' && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-[11px] font-black uppercase text-slate-600">Nombre de personnes</span>
                        </div>
                        <select 
                            className="bg-slate-50 px-3 py-1.5 rounded-lg font-bold text-sm outline-none border border-slate-100"
                            value={form.guests_count} 
                            onChange={e => setForm({...form, guests_count: parseInt(e.target.value)})}
                        >
                          {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      
                      <div className="h-[1px] bg-slate-100 w-full" />
                      
                      <textarea 
                        placeholder="Un petit mot pour nous ? (Allergies, musique...)" 
                        className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-medium outline-none h-24 resize-none focus:ring-1 focus:ring-rose-200 transition-all"
                        value={form.notes}
                        onChange={e => setForm({...form, notes: e.target.value})}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit" 
                  disabled={sending || !guestId}
                  className="w-full py-5 rounded-full text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                  style={{ backgroundColor: m.primary_color }}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Valider ma réponse
                </button>
              </form>
            ) : (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900">C'est noté !</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Merci pour votre réponse, {guestName}.</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-10 text-center px-8">
            <Heart className="w-5 h-5 text-rose-200 mx-auto mb-2 fill-rose-200" />
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
              Fait avec amour pour le mariage de <br/> {m.partner_1_name} & {m.partner_2_name}
            </p>
        </div>
      </div>
    </div>
  );
}

// Composant Interne pour les items du programme
function ProgramItem({ icon: Icon, title, time, loc, color, maps }: any) {
    const colors: any = {
        rose: "text-rose-500 bg-rose-50",
        amber: "text-amber-600 bg-amber-50"
    };

    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-slate-100 shadow-sm group">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${colors[color]}`}>
                    <Icon size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{time}</p>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{title}</h4>
                    <p className="text-[11px] font-medium text-slate-500 truncate max-w-[150px]">{loc}</p>
                </div>
            </div>
            {maps && (
                <a 
                  href={maps} 
                  target="_blank" 
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
                >
                    <Compass size={18} />
                </a>
            )}
        </div>
    );
}