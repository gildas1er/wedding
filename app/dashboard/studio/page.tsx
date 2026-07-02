"use client";
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Save, Palette, Image as ImageIcon, 
  Upload, Loader2, Clock, MapPin, Calendar, 
  ArrowLeft, Check, Church, PartyPopper, 
  Link as LinkIcon, Cross, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Utilisation de ton client existant

import Link from 'next/link';

export default function InvitationStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [marriage, setMarriage] = useState<any>(null);
  
  const [config, setConfig] = useState({
    primary_color: '#f43f5e',
    invitation_text: 'On se marie !',
    bg_image_url: '',
    mairie_date: '', // NOUVEAU
    mairie_hour: '',
    mairie_location: '',
    mairie_maps_url: '',
    religious_date: '', // NOUVEAU
    religious_hour: '',
    religious_location: '',
    religious_maps_url: '',
    reception_hour: '',
    reception_location: '',
    reception_maps_url: ''
  });

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('marriages')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setMarriage(data);
        setConfig({
          primary_color: data.primary_color || '#f43f5e',
          invitation_text: data.invitation_text || 'On se marie !',
          bg_image_url: data.bg_image_url || '',
          mairie_date: data.mairie_date || '', // NOUVEAU
          mairie_hour: data.mairie_hour || '',
          mairie_location: data.mairie_location || '',
          mairie_maps_url: data.mairie_maps_url || '',
          religious_date: data.religious_date || '', // NOUVEAU
          religious_hour: data.religious_hour || '',
          religious_location: data.religious_location || '',
          religious_maps_url: data.religious_maps_url || '',
          reception_hour: data.reception_hour || '',
          reception_location: data.reception_location || '',
          reception_maps_url: data.reception_maps_url || ''
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('marriages').update({
      primary_color: config.primary_color,
      invitation_text: config.invitation_text,
      bg_image_url: config.bg_image_url,
      mairie_date: config.mairie_date, // NOUVEAU
      mairie_hour: config.mairie_hour,
      mairie_location: config.mairie_location,
      mairie_maps_url: config.mairie_maps_url,
      religious_date: config.religious_date, // NOUVEAU
      religious_hour: config.religious_hour,
      religious_location: config.religious_location,
      religious_maps_url: config.religious_maps_url,
      reception_hour: config.reception_hour,
      reception_location: config.reception_location,
      reception_maps_url: config.reception_maps_url
    }).eq('id', marriage.id);

    setSaving(false);
    if (!error) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      alert("Erreur lors de la sauvegarde : " + error.message);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${marriage.id}-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('invitations')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('invitations')
        .getPublicUrl(filePath);

      setConfig(prev => ({ ...prev, bg_image_url: publicUrl }));
    } catch (error: any) {
      alert("Erreur upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFCFB]">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}>
        <Heart className="w-16 h-16 text-rose-500 fill-rose-500 shadow-xl shadow-rose-200" />
      </motion.div>
      <p className="mt-4 font-black italic text-rose-400 animate-pulse">Chargement du studio...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-4 lg:p-12 pt-24 text-slate-900" style={{ fontFamily: '"Quicksand", sans-serif' }}>
      
      {/* Notifications */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-8 left-1/2 z-[200] bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 font-black italic border border-white/10"
          >
            <div className="bg-rose-500 rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>
            L'invitation est prête !
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-6 left-6 z-[100]">
        <Link href="/dashboard" className="flex items-center gap-3 bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl shadow-sm hover:border-rose-200 transition-all group">
          <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Retour</span>
        </Link>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Panneau de configuration (Gauche) */}
        <div className="lg:col-span-7 space-y-10">
          <header className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-rose-50 px-4 py-1.5 rounded-full text-rose-500 text-[10px] font-black uppercase tracking-widest border border-rose-100">
              <Palette className="w-3 h-3" /> Éditeur Digital
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight italic">Studio <span className="text-rose-500">Créatif</span></h1>
            <p className="text-slate-700 font-bold text-lg">Personnalisez le RSVP que vos invités recevront.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-50 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500"><Palette className="w-5 h-5" /></div>
                <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-600">Identité Visuelle</h3>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase ml-1 flex items-center gap-2">Couleur Signature</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border-2 border-transparent focus-within:border-rose-100 transition-all shadow-inner">
                    <input type="color" value={config.primary_color} onChange={(e) => setConfig({...config, primary_color: e.target.value})} className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-none" />
                    <span className="text-sm font-black text-slate-900 font-mono tracking-widest">{config.primary_color}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase ml-1">Titre de l'invitation</label>
                  <input type="text" value={config.invitation_text} onChange={(e) => setConfig({...config, invitation_text: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus:border-rose-100 text-slate-900 font-bold outline-none shadow-inner" placeholder="Ex: On se marie !" />
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-50 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500"><ImageIcon className="w-5 h-5" /></div>
                <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-600">Photo de Couverture</h3>
              </div>
              <div onClick={() => fileInputRef.current?.click()} className="group relative h-44 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all overflow-hidden shadow-inner">
                {uploading && <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-rose-500" /></div>}
                {config.bg_image_url ? (
                  <img src={config.bg_image_url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="text-center space-y-2">
                    <Upload className="w-6 h-6 text-slate-300 mx-auto" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Importer une photo</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-sm border-2 border-slate-50 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500"><Clock className="w-5 h-5" /></div>
              <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-600">Le Programme du RSVP</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Mairie */}
              <div className="bg-rose-50/30 p-6 rounded-[2rem] border-2 border-rose-100 space-y-4">
                <div className="flex items-center gap-3 text-rose-600 font-black text-[13px] uppercase tracking-wider">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><Church className="w-4 h-4" /></div>
                  Cérémonie Civile
                </div>
                <div className="space-y-3">
                  {/* MODIFICATION : Ajout du champ Date Civile */}
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                    <input type="text" placeholder="Date de la mairie (ex: Vendredi 12 Juin)" value={config.mairie_date} onChange={(e) => setConfig({...config, mairie_date: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-slate-900 font-bold outline-none border-2 border-transparent focus:border-rose-200 shadow-inner" />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                    <input type="text" placeholder="Heure (ex: 14h30)" value={config.mairie_hour} onChange={(e) => setConfig({...config, mairie_hour: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-slate-900 font-bold outline-none border-2 border-transparent focus:border-rose-200 shadow-inner" />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                    <input type="text" placeholder="Lieu (Hôtel de ville...)" value={config.mairie_location} onChange={(e) => setConfig({...config, mairie_location: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-slate-900 font-bold outline-none border-2 border-transparent focus:border-rose-200 shadow-inner" />
                  </div>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-300" />
                    <input type="text" placeholder="Lien Google Maps" value={config.mairie_maps_url} onChange={(e) => setConfig({...config, mairie_maps_url: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-white/60 rounded-xl text-xs text-slate-500 italic outline-none border border-rose-100" />
                  </div>
                </div>
              </div>

              {/* Église */}
              <div className="bg-blue-50/30 p-6 rounded-[2rem] border-2 border-blue-100 space-y-4">
                <div className="flex items-center gap-3 text-blue-600 font-black text-[13px] uppercase tracking-wider">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><Cross className="w-4 h-4" /></div>
                  Cérémonie Religieuse
                </div>
                <div className="space-y-3">
                  {/* MODIFICATION : Ajout du champ Date Religieuse */}
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                    <input type="text" placeholder="Date église (ex: Samedi 13 Juin)" value={config.religious_date} onChange={(e) => setConfig({...config, religious_date: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-slate-900 font-bold outline-none border-2 border-transparent focus:border-blue-200 shadow-inner" />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                    <input type="text" placeholder="Heure" value={config.religious_hour} onChange={(e) => setConfig({...config, religious_hour: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-slate-900 font-bold outline-none border-2 border-transparent focus:border-blue-200 shadow-inner" />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                    <input type="text" placeholder="Nom de l'église" value={config.religious_location} onChange={(e) => setConfig({...config, religious_location: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-slate-900 font-bold outline-none border-2 border-transparent focus:border-blue-200 shadow-inner" />
                  </div>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                    <input type="text" placeholder="Lien Google Maps" value={config.religious_maps_url} onChange={(e) => setConfig({...config, religious_maps_url: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-white/60 rounded-xl text-xs text-slate-500 italic outline-none border border-blue-100" />
                  </div>
                </div>
              </div>

              {/* Réception */}
              <div className="bg-amber-50/30 p-6 rounded-[2rem] border-2 border-amber-100 space-y-4 md:col-span-2">
                <div className="flex items-center gap-3 text-amber-700 font-black text-[13px] uppercase tracking-wider">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><PartyPopper className="w-4 h-4" /></div>
                  Réception & Dîner
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                    <input type="text" placeholder="Heure du cocktail" value={config.reception_hour} onChange={(e) => setConfig({...config, reception_hour: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-slate-900 font-bold outline-none border-2 border-transparent focus:border-amber-200 shadow-inner" />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                    <input type="text" placeholder="Lieu de la fête" value={config.reception_location} onChange={(e) => setConfig({...config, reception_location: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-slate-900 font-bold outline-none border-2 border-transparent focus:border-amber-200 shadow-inner" />
                  </div>
                </div>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                  <input type="text" placeholder="Lien Google Maps de la réception" value={config.reception_maps_url} onChange={(e) => setConfig({...config, reception_maps_url: e.target.value})} className="w-full pl-12 pr-4 py-3 bg-white/60 rounded-xl text-xs text-slate-500 italic outline-none border border-amber-100" />
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            {saving ? "Sauvegarde en cours..." : "Publier les modifications"}
          </button>
        </div>

        {/* Aperçu Mobile (Droite) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-12 space-y-6 flex flex-col items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Aperçu en temps réel</h3>
            
            <div className="w-[360px] h-[740px] bg-slate-900 border-[10px] border-slate-900 rounded-[3.5rem] shadow-[0_60px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden">
              <div className="absolute inset-0 bg-white rounded-[2.8rem] overflow-hidden flex flex-col">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-2xl z-50" />
                
                {/* Photo Header */}
                <div className="h-[35%] relative">
                  {config.bg_image_url ? (
                    <img src={config.bg_image_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-slate-200" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/10" />
                </div>

                {/* Contenu Invitation */}
                <div className="flex-1 p-6 flex flex-col items-center justify-between text-center relative">
                  <div className="absolute -top-8 bg-white p-3 rounded-full shadow-lg border border-slate-50">
                    <Heart className="w-6 h-6 fill-current" style={{ color: config.primary_color }} />
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: config.primary_color }}>
                      {config.invitation_text}
                    </p>
                    <h2 className="text-3xl font-black text-slate-900 leading-tight italic">
                      {marriage?.partner_1_name} <br/> 
                      <span className="text-2xl" style={{ color: config.primary_color }}>&</span> <br/> 
                      {marriage?.partner_2_name}
                    </h2>
                  </div>

                  {/* Date Badge */}
                  <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    <div className="text-left">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Rendez-vous le</p>
                      <p className="text-xs font-black text-slate-900">
                        {marriage?.wedding_date ? new Date(marriage.wedding_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date à définir'}
                      </p>
                    </div>
                  </div>

                  {/* Timeline Rapide */}
                  <div className="w-full space-y-4">
                    <div className="flex justify-around items-center text-[8px] font-black border-t border-slate-50 pt-4 gap-2">
                      <div className="flex-1 flex flex-col gap-0.5">
                        <span className="text-rose-400 uppercase tracking-widest">Mairie</span>
                        {/* MODIFICATION : Affiche la date custom si elle existe, sinon l'heure d'origine */}
                        <span className="text-slate-900 truncate max-w-[70px]">{config.mairie_date || config.mairie_hour || '--:--'}</span>
                      </div>
                      
                      {config.religious_hour && (
                        <>
                          <div className="w-px h-5 bg-slate-100" />
                          <div className="flex-1 flex flex-col gap-0.5">
                            <span className="text-blue-500 uppercase tracking-widest">Église</span>
                            {/* MODIFICATION : Affiche la date custom religieuse si elle existe, sinon l'heure */}
                            <span className="text-slate-900 truncate max-w-[70px]">{config.religious_date || config.religious_hour}</span>
                          </div>
                        </>
                      )}

                      <div className="w-px h-5 bg-slate-100" />
                      <div className="flex-1 flex flex-col gap-0.5">
                        <span className="text-amber-500 uppercase tracking-widest">Fête</span>
                        <span className="text-slate-900">{config.reception_hour || '--:--'}</span>
                      </div>
                    </div>
                    
                    {/* Bouton RSVP Simulation */}
                    <button className="w-full py-4 rounded-2xl text-white text-[9px] font-black tracking-widest uppercase shadow-lg" 
                      style={{ backgroundColor: config.primary_color, boxShadow: `0 10px 25px -5px ${config.primary_color}40` }}>
                      Je confirme ma venue
                    </button>
                  </div>
                </div>
                <div className="h-1 w-24 bg-slate-100 mx-auto mb-2 rounded-full" />
              </div>
            </div>
            
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-start gap-3 max-w-[360px]">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-rose-600 font-medium leading-relaxed">
                <b>Note :</b> Ces informations seront visibles sur la page RSVP personnalisée de chaque invité et incluses dans le message WhatsApp d'invitation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}