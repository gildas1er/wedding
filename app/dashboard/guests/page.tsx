"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, CheckCircle2, XCircle, Clock, 
  Trash2, ChevronLeft, Phone, MessageCircle, Edit3, X, 
  Search, ChevronRight, ArrowLeft, ArrowRight, MessageSquare,
  FileDown, Heart, RotateCcw, User, Hash, Pencil, Layout, Send
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function GuestsPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<any[]>([]);
  const [marriageInfo, setMarriageInfo] = useState<any>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', phone: '', side: 'marié', status: 'en_attente',
    guests_count: 1, notes: ''
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: marriage } = await supabase
        .from('marriages')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (marriage) {
        setMarriageInfo(marriage);
        const { data: guestsData } = await supabase
          .from('guests')
          .select('*')
          .eq('marriage_id', marriage.id)
          .order('created_at', { ascending: false });
        
        setGuests(guestsData || []);
      }
      setTimeout(() => setLoading(false), 800);
    };
    init();
  }, []);

  const refreshList = async () => {
    if (!marriageInfo?.id) return;
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('marriage_id', marriageInfo.id)
      .order('created_at', { ascending: false });
    setGuests(data || []);
  };

  // FONCTION RSVP WHATSAPP MISE À JOUR
  const sendWhatsAppRSVP = (guest: any) => {
    if (!guest.phone) return alert("Veuillez renseigner un numéro WhatsApp.");
    if (!marriageInfo?.id) return alert("Erreur : ID du mariage introuvable.");

    const baseUrl = window.location.origin;
    const rsvpUrl = `${baseUrl}/rsvp/${marriageInfo.id}?guest=${guest.id}`;
    
    const message = `Bonjour ${guest.name}, nous serions ravis de vous compter parmi nous pour notre mariage ! ✨ Merci de confirmer votre présence via ce lien : ${rsvpUrl}`;
    
    const cleanPhone = guest.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const exportToPDF = (filterType: string) => {
    const doc = new jsPDF();
    const p1 = marriageInfo?.partner1_name || "Marié 1";
    const p2 = marriageInfo?.partner2_name || "Marié 2";
    const weddingTitle = `Liste des Invités - Mariage de ${p1} & ${p2}`;
    let dataToExport = [...guests];
    if (filterType === 'confirmé') dataToExport = guests.filter(g => g.status === 'confirmé');

    doc.setFontSize(16);
    doc.text(weddingTitle, 14, 20);
    autoTable(doc, {
      head: [['Nom', 'Pers.', 'Côté', 'Statut', 'Note']],
      body: dataToExport.map(g => [g.name, g.status === 'confirmé' ? (g.guests_count || 1) : '-', g.side === 'marié' ? 'Marié' : 'Mariée', g.status.replace('_', ' '), g.notes || '']),
      startY: 30,
      headStyles: { fillColor: [225, 29, 72] },
    });
    doc.save(`Liste_Invites_${p1}_${p2}.pdf`);
  };

  const filteredGuests = guests.filter(guest => 
    guest.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const currentItems = filteredGuests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marriageInfo?.id) return;
    const payload = { ...formData, marriage_id: marriageInfo.id };
    if (editingGuest) {
      await supabase.from('guests').update(payload).eq('id', editingGuest.id);
    } else {
      await supabase.from('guests').insert([payload]);
    }
    setIsModalOpen(false);
    refreshList();
  };

  const deleteGuest = async (id: string) => {
    if (confirm("Supprimer cet invité ?")) {
      await supabase.from('guests').delete().eq('id', id);
      refreshList();
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFCFB]">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}>
        <Heart className="w-16 h-16 text-rose-500 fill-rose-500 shadow-xl" />
      </motion.div>
      <p className="mt-4 font-black italic text-rose-400 animate-pulse text-sm">Chargement de votre bonheur...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-20 text-slate-900" style={{ fontFamily: '"Quicksand", sans-serif' }}>
      
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-rose-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
              <ChevronLeft className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black italic text-slate-800">Liste des <span className="text-rose-600">invités</span></h1>
          </Link>
          <button 
            onClick={() => { setEditingGuest(null); setFormData({name:'', phone:'', side:'marié', status:'en_attente', guests_count: 1, notes: ''}); setIsModalOpen(true); }}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-rose-600 transition-all shadow-xl shadow-slate-200"
          >
            <UserPlus className="w-5 h-5" /> <span className="hidden md:block">Ajouter</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Invitations" value={guests.length} icon={<Users className="text-blue-500" />} color="bg-blue-50/50" />
          <StatCard label="Total Personnes" value={guests.reduce((acc, g) => acc + (g.status === 'confirmé' ? (g.guests_count || 1) : 0), 0)} icon={<CheckCircle2 className="text-emerald-500" />} color="bg-emerald-50/50" />
          <StatCard label="En attente" value={guests.filter(g => g.status === 'en_attente').length} icon={<Clock className="text-amber-500" />} color="bg-amber-50/50" />
          <StatCard label="Déclinés" value={guests.filter(g => g.status === 'décliné').length} icon={<XCircle className="text-rose-500" />} color="bg-rose-50/50" />
        </div>

        <div className="bg-white rounded-[2.5rem] border-2 border-rose-50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30">
            <div className="relative w-full md:w-96 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-rose-400 font-bold" />
              </div>
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><RotateCcw className="w-5 h-5" /></button>
              )}
            </div>
            <button onClick={() => exportToPDF('all')} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl font-black text-xs uppercase text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm"><FileDown className="w-4 h-4" /> Export PDF</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                  <th className="px-8 py-5">Invité</th>
                  <th className="px-8 py-5 text-center">Pers.</th>
                  <th className="px-8 py-5">Côté</th>
                  <th className="px-8 py-5 text-center">Statut</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentItems.map((guest) => (
                  <tr key={guest.id} className="hover:bg-rose-50/20 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="font-black text-slate-800 flex items-center gap-2">
                        {guest.name}
                        {guest.notes && (
                          <div className="relative group/tooltip">
                            <MessageSquare className="w-3.5 h-3.5 text-rose-400 cursor-help" />
                            <div className="absolute bottom-full mb-2 left-0 w-48 p-3 bg-slate-900 text-white text-[11px] font-bold rounded-xl shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all z-[60] origin-bottom-left border border-slate-800">
                              <div className="italic text-rose-300 mb-1 font-black uppercase text-[9px]">Note :</div>
                              {guest.notes}
                              <div className="absolute top-full left-3 border-8 border-transparent border-t-slate-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1"><MessageCircle className="w-3 h-3 text-emerald-500" /> {guest.phone || 'N/A'}</div>
                    </td>
                    <td className="px-8 py-4 font-black text-slate-700 text-center">{guest.status === 'confirmé' ? (guest.guests_count || 1) : '-'}</td>
                    <td className="px-8 py-4">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${guest.side === 'marié' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{guest.side}</span>
                    </td>
                    <td className="px-8 py-4 text-center"><StatusPill status={guest.status} /></td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* BOUTON RSVP WHATSAPP */}
                        <button onClick={() => sendWhatsAppRSVP(guest)} className="p-2 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm group/btn" title="Envoyer RSVP">
                          <Send className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button onClick={() => { setEditingGuest(guest); setFormData({name:guest.name, phone:guest.phone||'', side:guest.side, status:guest.status, guests_count: guest.guests_count||1, notes: guest.notes||''}); setIsModalOpen(true); }} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteGuest(guest.id)} className="p-2 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Page {currentPage} sur {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className={`p-2 rounded-xl border-2 transition-all ${currentPage === 1 ? 'border-transparent text-slate-300 cursor-not-allowed' : 'border-white bg-white text-slate-600 hover:border-rose-200'}`}><ArrowLeft className="w-5 h-5" /></button>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className={`p-2 rounded-xl border-2 transition-all ${currentPage === totalPages ? 'border-transparent text-slate-300 cursor-not-allowed' : 'border-white bg-white text-slate-600 hover:border-rose-200'}`}><ArrowRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL DESIGN AMÉLIORÉ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.form 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onSubmit={handleSubmit}
              className="relative bg-white w-full max-w-lg p-8 rounded-[3rem] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-rose-100"
            >
              <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-rose-50 text-rose-400 rounded-full hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X className="w-5 h-5" /></button>
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-pink-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-rose-200">
                  <Heart className="text-white w-8 h-8 fill-white/20" />
                </div>
                <h2 className="text-2xl font-black text-slate-800">{editingGuest ? "Modifier l'invité" : "Nouvel Invité"}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Partagez votre bonheur</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 flex items-center gap-2"><User className="w-3 h-3 text-blue-500" /> Nom Complet</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name:e.target.value})} className="w-full px-6 py-4 bg-blue-50/50 border-2 border-transparent rounded-2xl font-bold focus:border-blue-400 focus:bg-white outline-none transition-all shadow-inner" placeholder="Ex: Famille Koné" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 flex items-center gap-2"><MessageCircle className="w-3 h-3 text-emerald-500" /> Numéro WhatsApp</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone:e.target.value})} className="w-full px-6 py-4 bg-emerald-50/30 border-2 border-transparent rounded-2xl font-bold focus:border-emerald-400 focus:bg-white outline-none transition-all shadow-inner" placeholder="Ex: 225..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 flex items-center gap-2"><Layout className="w-3 h-3 text-amber-500" /> Côté</label>
                    <select value={formData.side} onChange={e => setFormData({...formData, side:e.target.value})} className="w-full px-4 py-4 bg-amber-50/30 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-400 transition-all">
                      <option value="marié">Côté Marié 🤵</option>
                      <option value="mariée">Côté Mariée 👰</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-rose-500" /> Statut</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status:e.target.value})} className="w-full px-4 py-4 bg-rose-50/30 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-rose-400 transition-all">
                      <option value="en_attente">⏳ En attente</option>
                      <option value="confirmé">✅ Confirmé</option>
                      <option value="décliné">❌ Décliné</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 flex items-center gap-2"><Hash className="w-3 h-3 text-purple-500" /> Nombre d'invités</label>
                  <input type="number" min="1" value={formData.guests_count} onChange={e => setFormData({...formData, guests_count: parseInt(e.target.value)})} className="w-full px-6 py-4 bg-purple-50/30 border-2 border-transparent rounded-2xl font-bold focus:border-purple-400 transition-all shadow-inner" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 flex items-center gap-2"><Pencil className="w-3 h-3 text-slate-500" /> Notes Particulières</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes:e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:border-slate-400 h-24 resize-none transition-all shadow-inner" placeholder="Allergies, enfants, etc..." />
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-[2.5rem] font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group">
                {editingGuest ? "Sauvegarder les modifications" : "Ajouter à la liste"}
                <Heart className="w-5 h-5 group-hover:fill-rose-500 group-hover:text-rose-500 transition-colors" />
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className={`${color} p-6 rounded-[2.5rem] flex flex-col items-center justify-center border-2 border-white shadow-sm transition-transform hover:scale-105`}>
      <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-sm">{icon}</div>
      <span className="text-2xl font-black text-slate-800 leading-none mb-1">{value}</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: any = { confirmé: 'bg-emerald-500 text-white', en_attente: 'bg-amber-100 text-amber-700', décliné: 'bg-rose-100 text-rose-700' };
  return <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full shadow-sm ${config[status] || 'bg-slate-100'}`}>{status.replace('_', ' ')}</span>;
}