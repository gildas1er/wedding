"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Calendar, MapPin, GlassWater, 
  CheckCircle2, Clock, Users, Loader2, Sparkles,
  Church, Cross, Compass 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function PublicRSVP() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-rose-500" /></div>}>
      <RSVPContent />
    </Suspense>
  );
}

function RSVPContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const guestId = searchParams.get('guest');
  
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [marriage, setMarriage] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  
  const [hasPlusOne, setHasPlusOne] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    status: 'confirmé',
    guests_count: 1,
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id || id === 'id') { setLoading(false); return; }
      try {
        const { data: mData } = await supabase.from('marriages').select('*').eq('id', id).single();
        if (mData) setMarriage(mData);
        if (guestId) {
          const { data: gData } = await supabase.from('guests').select('name').eq('id', guestId).single();
          if (gData) setGuestName(gData.name);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [id, guestId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId) return;
    setSending(true);

    const finalCount = form.status === 'décliné' ? 0 : (hasPlusOne ? form.guests_count : 1);

    const { error } = await supabase
      .from('guests')
      .update({
        status: form.status,
        guests_count: finalCount,
        notes: form.notes
      })
      .eq('id', guestId);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setSubmitted(true);
    }
    setSending(false);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Heart className="w-12 h-12 text-rose-500 animate-pulse fill-current" />
    </div>
  );

  const m = marriage || {
    partner_1_name: "Chargement...", partner_2_name: "...",
    primary_color: "#f43f5e", invitation_text: "VOUS ÊTES INVITÉS",
    wedding_date: new Date(), mairie_hour: "14:00", mairie_location: "Mairie",
    reception_hour: "19:00", reception_location: "Réception"
  };

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto relative shadow-2xl pb-10" style={{ fontFamily: '"Quicksand", sans-serif' }}>
      
      <div className="h-[45vh] relative">
        <img src={m.bg_image_url || "https://images.unsplash.com/photo-1519741497674-611481863552"} className="w-full h-full object-cover" alt="Wedding" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/50" />
      </div>

      <div className="px-6 -mt-24 relative z-10">
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[2.5rem] shadow-2xl p-7 mb-10 border-t-4 flex flex-col items-center text-center"
          style={{ borderTopColor: m.primary_color }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2" style={{ color: m.primary_color }}>Le Grand Jour</p>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">
            {new Date(m.wedding_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
        </motion.div>

        <div className="text-center space-y-4 mb-12">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" style={{ color: m.primary_color }} />
            <p className="text-[13px] font-black uppercase tracking-[0.4em] text-slate-600">{m.invitation_text}</p>
            <Sparkles className="w-4 h-4" style={{ color: m.primary_color }} />
          </div>
          <h1 className="text-5xl font-black italic leading-tight text-slate-900">
            {m.partner_1_name} <br/>
            <span style={{ color: m.primary_color }}>&</span> <br/>
            {m.partner_2_name}
          </h1>
        </div>

        {/* PROGRAMME - ADRESSES COMPLÈTES SANS COUPURE */}
        <div className="space-y-5 mb-12">
          {/* MAIRIE */}
          <div className="bg-slate-50/80 p-5 rounded-[2.5rem] border border-slate-100 flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-4 flex-1">
                <div className="bg-white p-3.5 rounded-2xl shadow-md border border-rose-50 flex-shrink-0">
                    <Church className="w-6 h-6 text-rose-500" />
                </div>
                <div className="space-y-1 pt-1">
                    <h4 className="text-lg font-black leading-tight" style={{ color: m.primary_color }}>La Mairie • {m.mairie_hour}</h4>
                    <p className="text-[13px] font-bold text-slate-600 flex items-start gap-1.5 leading-snug">
                        <MapPin className="w-3.5 h-3.5 opacity-70 mt-0.5 flex-shrink-0" /> 
                        <span>{m.mairie_location}</span>
                    </p>
                </div>
            </div>
            {m.mairie_maps_url && (
              <a href={m.mairie_maps_url} target="_blank" rel="noopener noreferrer" 
                className="bg-white pl-3 pr-4 py-2 rounded-full shadow-md border border-slate-100 text-rose-500 flex items-center gap-2 active:scale-95 transition-all mt-1 flex-shrink-0">
                <Compass className="w-4 h-4 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Y aller</span>
              </a>
            )}
          </div>

          {/* RELIGIEUX */}
          {m.religious_hour && (
            <div className="bg-slate-50/80 p-5 rounded-[2.5rem] border border-slate-100 flex items-start justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-4 flex-1">
                    <div className="bg-white p-3.5 rounded-2xl shadow-md border border-blue-50 flex-shrink-0">
                        <Cross className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="space-y-1 pt-1">
                        <h4 className="text-lg font-black text-blue-600 leading-tight">L'Église • {m.religious_hour}</h4>
                        <p className="text-[13px] font-bold text-slate-600 flex items-start gap-1.5 leading-snug">
                            <MapPin className="w-3.5 h-3.5 opacity-70 mt-0.5 flex-shrink-0" /> 
                            <span>{m.religious_location}</span>
                        </p>
                    </div>
                </div>
                {m.religious_maps_url && (
                <a href={m.religious_maps_url} target="_blank" rel="noopener noreferrer" 
                  className="bg-white pl-3 pr-4 py-2 rounded-full shadow-md border border-slate-100 text-blue-500 flex items-center gap-2 active:scale-95 transition-all mt-1 flex-shrink-0">
                    <Compass className="w-4 h-4 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Y aller</span>
                </a>
                )}
            </div>
          )}

          {/* RÉCEPTION */}
          <div className="bg-slate-50/80 p-5 rounded-[2.5rem] border border-slate-100 flex items-start justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-4 flex-1">
                <div className="bg-white p-3.5 rounded-2xl shadow-md border border-amber-50 flex-shrink-0">
                    <GlassWater className="w-6 h-6 text-amber-500" />
                </div>
                <div className="space-y-1 pt-1">
                    <h4 className="text-lg font-black text-amber-600 leading-tight">La Réception • {m.reception_hour}</h4>
                    <p className="text-[13px] font-bold text-slate-600 flex items-start gap-1.5 leading-snug">
                        <MapPin className="w-3.5 h-3.5 opacity-70 mt-0.5 flex-shrink-0" /> 
                        <span>{m.reception_location}</span>
                    </p>
                </div>
            </div>
            {m.reception_maps_url && (
              <a href={m.reception_maps_url} target="_blank" rel="noopener noreferrer" 
                className="bg-white pl-3 pr-4 py-2 rounded-full shadow-md border border-slate-100 text-amber-500 flex items-center gap-2 active:scale-95 transition-all mt-1 flex-shrink-0">
                <Compass className="w-4 h-4 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Y aller</span>
              </a>
            )}
          </div>
        </div>

        {/* FORMULAIRE RSVP */}
        <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 shadow-2xl p-8 mb-10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: m.primary_color }} />
          
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Présence de</p>
                <h2 className="text-3xl font-black text-slate-800 italic" style={{ color: m.primary_color }}>
                    {guestName || "Invité(e)"}
                </h2>
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setForm({...form, status: 'confirmé'})}
                  className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all border-2 ${form.status === 'confirmé' ? 'text-white border-transparent shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100'}`}
                  style={{ backgroundColor: form.status === 'confirmé' ? m.primary_color : '' }}>
                  Je viens
                </button>
                <button type="button" onClick={() => setForm({...form, status: 'décliné'})}
                  className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all border-2 ${form.status === 'décliné' ? 'bg-slate-900 text-white border-transparent shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100'}`}>
                  Désolé
                </button>
              </div>

              <AnimatePresence>
                {form.status === 'confirmé' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6 overflow-hidden">
                    <div className="space-y-3 pt-4 text-center">
                      <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Accompagné(e) ?</p>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setHasPlusOne(true)} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${hasPlusOne === true ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}>Oui</button>
                        <button type="button" onClick={() => { setHasPlusOne(false); setForm({...form, guests_count: 1}); }} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${hasPlusOne === false ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}>Non</button>
                      </div>
                    </div>

                    {hasPlusOne && (
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-slate-400" />
                          <span className="text-[11px] font-black uppercase text-slate-600">Nombre</span>
                        </div>
                        <select className="bg-white px-4 py-2 rounded-xl font-black text-slate-900 border border-slate-200" value={form.guests_count} onChange={e => setForm({...form, guests_count: parseInt(e.target.value)})}>
                          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} pers.</option>)}
                        </select>
                      </div>
                    )}

                    <textarea 
                      placeholder="Laissez un petit mot aux mariés ici..." 
                      className="w-full p-6 bg-slate-100/50 rounded-3xl border-2 border-slate-200 font-bold outline-none text-slate-800 text-sm h-32 resize-none shadow-inner placeholder:text-slate-500 placeholder:font-bold focus:border-slate-300 transition-all" 
                      value={form.notes} 
                      onChange={e => setForm({...form, notes: e.target.value})} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="submit" disabled={sending || !guestId || (form.status === 'confirmé' && hasPlusOne === null)}
                className="w-full py-6 rounded-[2.5rem] text-white font-black uppercase tracking-[0.3em] text-xs shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                style={{ backgroundColor: m.primary_color, boxShadow: `0 20px 50px -10px ${m.primary_color}60` }}>
                {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                Envoyer ma réponse
              </button>
            </form>
          ) : (
            <div className="text-center py-12 space-y-6">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 className="w-12 h-12" /></div>
              <div className="space-y-2"><h3 className="text-2xl font-black text-slate-900">Merci {guestName} !</h3><p className="text-slate-500 font-bold italic text-sm">Votre réponse a bien été enregistrée.</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}