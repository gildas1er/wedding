"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, LayoutDashboard, Users, Settings as SettingsIcon, 
  Palette, UserPlus, Download, Save, Trash2, 
  Calendar, MapPin, X, CheckCircle2, AlertCircle, Printer, ChevronRight
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { PRINT_REPORTS } from '../../../lib/print-reports';
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
    <div className="flex h-screen items-center justify-center bg-ivory">
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
    <div className="min-h-screen bg-ivory">
      

      <main className="p-4 sm:p-6 lg:p-12">
        <div className="max-w-4xl mx-auto">
          
          <header className="mb-12">
            <p className="eyebrow">Compte</p>
            <h1 className="mt-2 text-3xl font-normal text-ink sm:text-4xl">Paramètres</h1>
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
            className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-50 shadow-2xl p-5 sm:p-10 relative overflow-hidden"
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
              <div className="flex flex-col gap-5 rounded-2xl bg-ivory p-6 sm:flex-row sm:items-center sm:justify-between animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                  <span className="h-12 w-12 shrink-0 rounded-full ring-4 ring-white" style={{ backgroundColor: primaryColor }} />
                  <div>
                    <p className="font-display text-xl text-ink">Couleurs et photo de l&apos;invitation</p>
                    <p className="mt-0.5 text-sm text-slate-500">Palettes, couverture et programme se règlent dans le studio, avec l&apos;aperçu en direct.</p>
                  </div>
                </div>
                <Link href="/dashboard/studio" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700">
                  Ouvrir le studio <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {activeTab === 'team' && <p className="text-slate-400 font-bold italic py-10 text-center">Gestion de l'équipe bientôt disponible...</p>}
            {activeTab === 'export' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="eyebrow">Listes des invités</p>
                    <h2 className="mt-2 text-2xl font-normal text-ink">Imprimer ou enregistrer en PDF</h2>
                    <p className="mt-1 text-sm text-slate-500">Choisissez une liste : elle s&apos;ouvre prête à imprimer (ou « Enregistrer en PDF » depuis la fenêtre d&apos;impression).</p>
                  </div>
                  <Link
                    href="/dashboard/invite/print"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                  >
                    <Printer className="h-4 w-4" /> Ouvrir l&apos;impression
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {PRINT_REPORTS.map(({ id, title, description, icon: Icon }) => (
                    <Link
                      key={id}
                      href={`/dashboard/invite/print?report=${id}`}
                      className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-amber-300 hover:shadow-md"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-700 transition-colors group-hover:bg-amber-50">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{title.replace(/^\d+\.\s*/, '')}</span>
                        <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
                      </span>
                      <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500" />
                    </Link>
                  ))}
                </div>

                <div>
                  <p className="eyebrow">Déroulé du Jour J</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      { version: 'equipe', title: 'Feuille de route de l’équipe', description: 'Heures, lieux, responsables, contacts et notes, avec cases à cocher.', Icon: Users },
                      { version: 'invites', title: 'Programme pour les invités', description: 'Les moments clés et les lieux, à afficher ou partager sur WhatsApp.', Icon: Heart },
                    ].map(({ version, title, description, Icon }) => (
                      <Link
                        key={version}
                        href={`/dashboard/planning/print?version=${version}`}
                        className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-amber-300 hover:shadow-md"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-700 transition-colors group-hover:bg-amber-50">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink">{title}</span>
                          <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
                        </span>
                        <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-500" />
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-ivory p-4 text-sm text-slate-600">
                  <span className="font-semibold text-ink">Autres documents :</span>{' '}
                  le plan de table s&apos;imprime depuis{' '}
                  <Link href="/dashboard/table" className="font-semibold text-rose-600 underline-offset-4 hover:underline">Plan de table</Link>{' '}
                  (Imprimer PCO / Word PCO), et le budget depuis{' '}
                  <Link href="/dashboard/budget" className="font-semibold text-rose-600 underline-offset-4 hover:underline">Budget</Link>.
                </div>
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-between">
              <button className="flex items-center gap-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Zone de danger</span>
              </button>
              
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
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
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 rounded-[1.5rem] shadow-2xl flex items-center gap-4 bg-slate-900 border-2 border-rose-500 text-white">
            <CheckCircle2 className="w-5 h-5 text-rose-500" />
            <span className="font-black text-xs uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
