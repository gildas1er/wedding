"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, LayoutDashboard, Users, Settings as SettingsIcon, 
  Palette, UserPlus, Download, Save, Trash2, 
  Calendar, MapPin, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsPage() {
  const supabase = createClient();
  const pathname = usePathname();
  
  // États des données
  const [marriageId, setMarriageId] = useState<string | null>(null);
  const [partner1, setPartner1] = useState("");
  const [partner2, setPartner2] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#f43f5e");
  const [location, setLocation] = useState("");
  
  // États UI
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: marriageData } = await supabase
        .from('marriages')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (marriageData) {
        setMarriageId(marriageData.id);
        setPartner1(marriageData.partner_1_name || "");
        setPartner2(marriageData.partner_2_name || "");
        setPrimaryColor(marriageData.primary_color || "#f43f5e");
        setLocation(marriageData.location_city || "");
        
        // Sécurité formatage date (YYYY-MM-DD) pour l'input HTML
        if (marriageData.wedding_date) {
          setEventDate(marriageData.wedding_date.split('T')[0]);
        }
      }
      setLoading(false);
    };

    fetchSettings();
  }, [supabase]);

  const handleSave = async () => {
    if (!marriageId) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('marriages')
      .update({ 
        partner_1_name: partner1.trim(),
        partner_2_name: partner2.trim(),
        ...(eventDate ? { wedding_date: eventDate } : {}),
        primary_color: primaryColor,
        location_city: location
      })
      .eq('id', marriageId);

    if (!error) {
      showToast("Changements enregistrés !");
    } else {
      showToast("Erreur de sauvegarde", "error");
    }
    setIsSaving(false);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
       <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { id: 'general', label: 'Général', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'design', label: 'Apparence', icon: <Palette className="w-4 h-4" /> },
    { id: 'team', label: 'Équipe', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: '"Quicksand", sans-serif' }}>
      

      <main className="p-4 sm:p-6 lg:p-12">
        <div className="max-w-4xl mx-auto">
          
          <header className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-black italic text-slate-900">
               Vos <span style={{ color: primaryColor }}>Settings</span>
            </h1>
          </header>

          {/* ONGLETS */}
          <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all ${
                  activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-xl scale-105' 
                  : 'bg-white text-slate-400 border border-slate-50'
                }`}
              >
                <div style={{ color: activeTab === tab.id ? 'white' : primaryColor }}>{tab.icon}</div>
                {tab.label}
              </button>
            ))}
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] sm:rounded-[3rem] border-2 border-slate-50 shadow-2xl p-5 sm:p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: primaryColor }} />

            {activeTab === 'general' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Les mariés</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ value: partner1, set: setPartner1, label: 'Prénom 1' }, { value: partner2, set: setPartner2, label: 'Prénom 2' }].map(({ value, set, label }) => (
                        <div key={label} className="relative">
                          <Heart className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: primaryColor }} />
                          <input 
                            type="text" 
                            aria-label={label}
                            placeholder={label}
                            value={value}
                            onChange={(e) => set(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl py-5 pl-10 pr-3 font-bold text-slate-700 outline-none focus:ring-2 transition-all"
                            style={{'--tw-ring-color': `${primaryColor}20`} as any}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="date" 
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl py-5 pl-12 pr-6 font-bold text-slate-700 outline-none focus:ring-2 transition-all" 
                        style={{'--tw-ring-color': `${primaryColor}20`} as any}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Lieu de réception</label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-5 pl-12 pr-6 font-bold text-slate-700 outline-none focus:ring-2 transition-all"
                      style={{'--tw-ring-color': `${primaryColor}20`} as any}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Couleur thématique</label>
                  <div className="flex flex-wrap gap-4 p-2">
                    {['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#0f172a'].map((color) => (
                      <button 
                        key={color} 
                        onClick={() => setPrimaryColor(color)}
                        className={`w-12 h-12 rounded-2xl transition-all ${primaryColor === color ? 'scale-125 ring-4 ring-slate-100' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && <p className="text-slate-400 font-bold italic py-10 text-center">Gestion de l'équipe bientôt disponible...</p>}
            {activeTab === 'export' && <p className="text-slate-400 font-bold italic py-10 text-center">Export PDF bientôt disponible...</p>}

            <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-between">
              <button className="flex items-center gap-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Zone de danger</span>
              </button>
              
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {isSaving ? "Synchronisation..." : <><Save className="w-4 h-4" /> Sauvegarder</>}
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 bg-slate-900 border-2 border-rose-500 text-white">
            <CheckCircle2 className="w-5 h-5 text-rose-500" />
            <span className="font-black text-xs uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
