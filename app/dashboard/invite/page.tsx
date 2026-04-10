"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Users, Search, Plus, Send, Edit3, Trash2, 
  Users as UsersIcon, X, Heart, LayoutDashboard,
  MessageSquare, Settings, CheckCircle2, Clock, XCircle, Banknote, 
  ClipboardList, Utensils, Phone, Loader2, Check, AlertCircle
} from 'lucide-react';

// --- 1. COMPOSANTS DE SOUTIEN (DOIVENT ÊTRE HORS DU COMPOSANT PRINCIPAL) ---

function SidebarItem({ icon: Icon, label, active = false, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
      active ? 'bg-[#0D1C41] text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`}>
      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
      <span>{label}</span>
    </button>
  );
}

function BentoStatCard({ label, value, emoji, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group transition-transform hover:scale-105 hover:shadow-lg">
      <div className={`text-4xl font-black tabular-nums leading-none ${color}`}>{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 mb-2">{label}</div>
      <div className="bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center m-auto text-xl">{emoji}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const configs: any = {
    confirmé: { label: 'Confirmé Présent', icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-600' },
    en_attente: { label: 'En attente', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-600' },
    décliné: { label: 'Absent/Décliné', icon: XCircle, bg: 'bg-rose-50', text: 'text-rose-600' },
  };
  const config = configs[status] || configs.en_attente;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${config.bg} ${config.text}`}>
      <Icon size={12} strokeWidth={3} />
      {config.label}
    </span>
  );
}

// --- 2. MODAL D'AJOUT AVEC GESTION D'ERREUR ---

function GuestModal({ isOpen, onClose, onSuccess, marriageId, guestToEdit }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAccompanist, setHasAccompanist] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', guests_count: 1, side: 'partenaire_1', status: 'en_attente'
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (guestToEdit) {
        setFormData({
          name: guestToEdit.name || '',
          phone: guestToEdit.phone || '',
          guests_count: guestToEdit.guests_count || 1,
          side: guestToEdit.side || 'partenaire_1',
          status: guestToEdit.status || 'en_attente'
        });
        setHasAccompanist(guestToEdit.guests_count > 1);
      } else {
        setFormData({ name: '', phone: '', guests_count: 1, side: 'commun', status: 'en_attente' });
        setHasAccompanist(false);
      }
    }
  }, [guestToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marriageId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const finalCount = hasAccompanist ? formData.guests_count : 1;

    try {
      let error;
      const dataToSave = {
        marriage_id: marriageId,
        name: formData.name,
        phone: formData.phone,
        guests_count: finalCount,
        side: formData.side,
        status: formData.status
      };

      if (guestToEdit) {
        const { error: updateError } = await supabase.from('invite').update(dataToSave).eq('id', guestToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('invite').insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.code === '23505') {
        setErrorMessage("Ce numéro WhatsApp est déjà utilisé pour un autre invité. ✨");
      } else {
        setErrorMessage("Oups ! Une petite erreur technique s'est glissée.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-10 bg-[#161B2E] text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">{guestToEdit ? "Modifier" : "Ajouter"} Invité 🥂</h3>
                <p className="text-slate-400 font-medium text-xs uppercase tracking-widest mt-1">Liste d'honneur</p>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto">
              
              <AnimatePresence>
                {errorMessage && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                    <AlertCircle size={18} /> {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">👤 Nom de l'invité</label>
                <input required type="text" placeholder="Ex: Jean Dupont" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-400 outline-none transition-all font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">📞 Numéro WhatsApp</label>
                <input required type="tel" placeholder="+225..." className={`w-full px-6 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all ${errorMessage?.includes('numéro') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-100 focus:border-rose-400'}`} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">👥 Accompagné ?</label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setHasAccompanist(false)} className={`flex-1 py-3 rounded-xl font-black text-xs border-2 transition-all ${!hasAccompanist ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>NON</button>
                  <button type="button" onClick={() => setHasAccompanist(true)} className={`flex-1 py-3 rounded-xl font-black text-xs border-2 transition-all ${hasAccompanist ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>OUI</button>
                </div>
                {hasAccompanist && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <input type="number" min="2" className="w-full mt-2 px-6 py-4 bg-rose-50 border border-rose-100 rounded-2xl outline-none font-black text-rose-600" value={formData.guests_count} onChange={(e) => setFormData({...formData, guests_count: parseInt(e.target.value)})} />
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">📢 Statut</label>
                <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold appearance-none" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <option value="en_attente">En attente</option>
                  <option value="confirmé">Confirmé</option>
                  <option value="décliné">Décliné</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">💒 Côté</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'partenaire_1', label: 'Marié' },
                    { id: 'partenaire_2', label: 'Mariée' },
                    { id: 'commun', label: 'Commun' }
                  ].map((side) => (
                    <button key={side.id} type="button" onClick={() => setFormData({...formData, side: side.id})} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${formData.side === side.id ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                      {side.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={onClose} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors">Annuler</button>
                <button disabled={isSubmitting} type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-rose-600 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />} Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- 3. COMPOSANT DE PAGE (EXPORT DEFAULT OBLIGATOIRE) ---

export default function GuestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [marriage, setMarriage] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    
    const { data: marriageData } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
    
    if (marriageData) {
      setMarriage(marriageData);
      const { data: guestsData } = await supabase.from('invite').select('*').eq('marriage_id', marriageData.id).order('created_at', { ascending: false });
      setGuests(guestsData || []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: string) => {
    if (confirm("Voulez-vous retirer cet invité précieux ? ✨")) {
      const { error } = await supabase.from('invite').delete().eq('id', id);
      if (error) alert("Erreur technique lors du retrait");
      else loadData();
    }
  };

  const sendWhatsAppRSVP = (guest: any) => {
    const message = `Bonjour ${guest.name} ! ✨ Nous préparons notre mariage et votre présence nous tient à cœur. Merci de nous confirmer votre venue ici : [LIEN]`;
    const cleanPhone = guest.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
      <p className="mt-4 font-bold text-rose-500">Ouverture du registre...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBFD] flex text-[#1E293B]" style={{ fontFamily: '"DM Sans", sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-200 flex flex-col bg-white sticky top-0 h-screen z-50">
        <div className="p-8">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Général</p>
          <div className="space-y-1">
            <SidebarItem icon={LayoutDashboard} label="Tableau de bord" onClick={() => router.push('/dashboard')} />
            <SidebarItem icon={MessageSquare} label="Messages" />
          </div>

          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-8 mb-1 ml-1">Organisation</p>
          <div className="space-y-1">
            <SidebarItem icon={Users} label="Liste des invités" active />
            <SidebarItem icon={Send} label="Invitations (RSVP)" />
            <SidebarItem icon={Utensils} label="Gestion des tables" />
            <SidebarItem icon={ClipboardList} label="Mes tâches" />
            <SidebarItem icon={Banknote} label="Budget" />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 relative">
          <div className="space-y-2">
            <div className="text-xs font-black uppercase text-rose-500 tracking-[0.2em] flex items-center gap-2"><UsersIcon size={14}/> Communauté du Bonheur</div>
            <h1 className="text-4xl font-black tracking-tighter">Liste des <span className="text-rose-500 italic">Invités Précieux</span></h1>
          </div>
          <button onClick={() => { setSelectedGuest(null); setIsModalOpen(true); }} className="flex items-center gap-3 bg-slate-900 text-white pl-8 pr-2 py-2 rounded-full hover:bg-rose-500 transition-all shadow-xl">
            <span className="font-bold text-sm">Ajouter un proche</span>
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Plus size={20} strokeWidth={3} /></div>
          </button>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <BentoStatCard label="Total Invités" value={guests.reduce((acc, g) => acc + (g.guests_count || 1), 0)} emoji="👥" color="text-[#0D1C41]" />
          <BentoStatCard label="Confirmés" value={guests.filter(g => g.status === 'confirmé').length} emoji="✅" color="text-emerald-500" />
          <BentoStatCard label="En attente" value={guests.filter(g => g.status === 'en_attente').length} emoji="⏳" color="text-amber-500" />
          <BentoStatCard label="Absent" value={guests.filter(g => g.status === 'décliné').length} emoji="❌" color="text-rose-500" />
        </div>

        <div className="mb-8 relative max-w-xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
          <input type="text" placeholder="Rechercher..." className="w-full pl-16 pr-8 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-10 py-6">Invité</th>
                <th className="px-10 py-6 text-center">Accompagnants</th>
                <th className="px-10 py-6">Statut RSVP</th>
                <th className="px-10 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {guests.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).map((guest) => (
                <tr key={guest.id} className="hover:bg-rose-50/20 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="font-bold text-lg text-slate-700 flex items-center gap-2">
                       {guest.name}
                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${guest.side === 'partenaire_2' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                         {guest.side === 'partenaire_1' ? 'Marié' : guest.side === 'partenaire_2' ? 'Mariée' : 'Commun'}
                       </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5"><Phone size={12}/> {guest.phone}</div>
                  </td>
                  <td className="px-10 py-6 text-center font-black text-slate-600 text-xl tabular-nums">x{guest.guests_count || 1}</td>
                  <td className="px-10 py-6"><StatusPill status={guest.status} /></td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => sendWhatsAppRSVP(guest)} className="p-3 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Send size={18}/></button>
                      <button onClick={() => { setSelectedGuest(guest); setIsModalOpen(true); }} className="p-3 bg-white border border-slate-100 text-slate-400 rounded-xl transition-all"><Edit3 size={18} /></button>
                      <button onClick={() => handleDelete(guest.id)} className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <GuestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        marriageId={marriage?.id} 
        onSuccess={loadData} 
        guestToEdit={selectedGuest} 
      />
    </div>
  );
}