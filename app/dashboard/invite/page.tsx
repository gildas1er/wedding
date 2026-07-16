"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse'; // 👈 Importation de PapaParse
import { 
  Users, Search, Plus, Send, Edit3, Trash2, 
  Users as UsersIcon, X, Heart, LayoutDashboard,
  MessageSquare, Settings, CheckCircle2, Clock, XCircle, Banknote, 
  ClipboardList, Utensils, Phone, Loader2, Check, AlertCircle, ChevronRight, ChevronLeft,
  MessageCircle, Crown, Home, Briefcase, Smile, Printer, FileSpreadsheet, Upload
} from 'lucide-react';

// --- 1. COMPOSANTS DE SOUTIEN ---

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
    name: '', phone: '', guests_count: 1, side: 'partenaire_1', status: 'en_attente',
    category: 'amis', is_vip: false
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
          status: guestToEdit.status || 'en_attente',
          category: guestToEdit.category || 'amis',
          is_vip: guestToEdit.is_vip || false
        });
        setHasAccompanist(guestToEdit.guests_count > 1);
      } else {
        setFormData({ 
          name: '', phone: '', guests_count: 1, side: 'commun', status: 'en_attente',
          category: 'amis', is_vip: false 
        });
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
        status: formData.status,
        category: formData.category,
        is_vip: formData.is_vip
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

              <div className="bg-amber-50/40 border-2 border-amber-100/70 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Crown size={18} className="text-amber-600 fill-amber-50" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Invité d'honneur / VIP</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Marquer ce proche comme prioritaire</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.is_vip} onChange={e => setFormData({...formData, is_vip: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">👤 Nom de l'invité</label>
                <input required type="text" placeholder="Ex: Jean Dupont" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-400 outline-none transition-all font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">📞 Numéro WhatsApp</label>
                <input 
                  required 
                  type="text" 
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Ex: 2250102030405" 
                  className={`w-full px-6 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all ${errorMessage?.includes('numéro') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-100 focus:border-rose-400'}`} 
                  value={formData.phone} 
                  onChange={(e) => {
                    // Supprime instantanément tout caractère qui n'est pas un chiffre (0-9)
                    const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({...formData, phone: onlyNums});
                  }} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">🏷️ Catégorie / Relation</label>
                <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  <option value="amis">Amis ✨</option>
                  <option value="parents">Parents 🏠</option>
                  <option value="collègues">Collègues 💼</option>
                </select>
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

// --- 3. COMPOSANT DE PAGE ---

export default function GuestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null); // 👈 Ref pour le bouton d'import caché

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false); // 👈 État de chargement de l'import
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [marriage, setMarriage] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [printFilter, setPrintFilter] = useState("all");

  // Notification d'import éphémère
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredGuests = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) || g.phone.includes(searchTerm);
    if (printFilter === "parents") return matchesSearch && g.category === "parents";
    if (printFilter === "amis") return matchesSearch && g.category === "amis";
    if (printFilter === "collègues") return matchesSearch && g.category === "collègues";
    if (printFilter === "accompanied") return matchesSearch && (g.guests_count > 1);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  const currentGuests = typeof window !== 'undefined' && window.matchMedia('print').matches 
    ? filteredGuests 
    : filteredGuests.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, printFilter]);

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

  // NOUVEAU : Fonction de traitement du fichier CSV importé
  // Traitement du fichier CSV importé avec insertion progressive (Batching)
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !marriage?.id) return;

    setImporting(true);
    setImportNotice(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        if (rows.length === 0) {
          setImportNotice({ type: 'error', message: "Le fichier CSV est vide." });
          setImporting(false);
          return;
        }

        // Nettoyage et formatage initial de toutes les lignes
        const allGuests = rows.map((row: any) => ({
          marriage_id: marriage.id,
          name: row.name?.trim(),
          phone: row.phone?.trim()?.replace(/\s+/g, ''),
          side: ['partenaire_1', 'partenaire_2', 'commun'].includes(row.side) ? row.side : 'commun',
          category: ['parents', 'amis', 'collègues'].includes(row.category) ? row.category : 'amis',
          guests_count: parseInt(row.guests_count) || 1,
          is_vip: row.is_vip?.toLowerCase() === 'true' || row.is_vip === '1',
          status: 'en_attente'
        }));

        // Validation rapide
        const invalid = allGuests.some(g => !g.name || !g.phone);
        if (invalid) {
          setImportNotice({ type: 'error', message: "Certaines lignes n'ont pas de nom ou de numéro de téléphone." });
          setImporting(false);
          return;
        }

        // --- INSERTION PROGRESSIVE (Par paquets de 5 pour la stabilité) ---
        const batchSize = 5;
        let insertedCount = 0;
        let hasDuplicateError = false;

        try {
          for (let i = 0; i < allGuests.length; i += batchSize) {
            const batch = allGuests.slice(i, i + batchSize);
            
            const { error } = await supabase.from('invite').insert(batch);
            
            if (error) {
              if (error.code === '23505') {
                hasDuplicateError = true;
                // On continue quand même le reste de l'import malgré un doublon
                continue; 
              }
              throw error; // Pour les autres erreurs techniques, on stoppe
            }
            
            insertedCount += batch.length;
          }

          // Message de fin adapté
          if (hasDuplicateError) {
            setImportNotice({ 
              type: 'success', 
              message: `Importation partielle : ${insertedCount} proches ajoutés. Certains numéros en doublon ont été ignorés ! ✨` 
            });
          } else {
            setImportNotice({ 
              type: 'success', 
              message: `${insertedCount} proches ajoutés avec succès ! ✨` 
            });
          }
          
          loadData();
        } catch (err: any) {
          setImportNotice({ type: 'error', message: err.message || "Erreur lors de l'intégration progressive." });
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset de l'input
        }
      },
      error: () => {
        setImportNotice({ type: 'error', message: "Impossible de lire ce fichier CSV." });
        setImporting(false);
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Voulez-vous retirer cet invité précieux ? ✨")) {
      const { error } = await supabase.from('invite').delete().eq('id', id);
      if (error) alert("Erreur technique lors du retrait");
      else loadData();
    }
  };

  // Génération du lien WhatsApp personnalisé sans caractères spéciaux problématiques
  const sendWhatsAppInvitation = async (guest: any) => {
    const rsvpUrl = `${window.location.origin}/dashboard/rsvp/${marriage.id}?guest=${guest.id}`;
    
    // Construction du message robuste (unicode pur) pour éviter les caractères brisés sur les téléphones
    const message = 
`👑 *INVITATION OFFICIELLE* 👑\n\n` +
`Bonjour *${guest.name}* ! 👋✨\n\n` +
`Nous avons l'immense joie de vous inviter à célébrer notre union. Votre présence à nos côtés rendra cette journée inoubliable ! 🕊️💍\n\n` +
`📍 *Pour confirmer votre présence (RSVP) :*\n` +
`Merci de cliquer sur le lien ci-dessous pour valider votre venue :\n` +
`👉 ${rsvpUrl}\n\n` +
`Nous avons hâte de partager ce moment unique avec vous ! 🥂🎉\n\n` +
`_Gildas & Mariette_`;
    
    // Ouverture de WhatsApp
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${guest.phone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    // Mise à jour immédiate dans la base de données
    await supabase
      .from('invite')
      .update({ invitation_sent: true })
      .eq('id', guest.id);

    // Mise à jour instantanée du state React local pour éviter tout temps de latence
    setGuests(prevGuests => 
      prevGuests.map(g => g.id === guest.id ? { ...g, invitation_sent: true } : g)
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'parents': return <Home size={10} className="text-amber-500" />;
      case 'collègues': return <Briefcase size={10} className="text-blue-500" />;
      default: return <Smile size={10} className="text-pink-500" />;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
      <p className="mt-4 font-bold text-rose-500">Ouverture du registre...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBFD] flex text-[#1E293B]" style={{ fontFamily: '"DM Sans", sans-serif' }}>
      
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          aside, header button, .bento-cards, .search-container, .pagination-container, td:last-child, th:last-child {
            display: none !important;
          }
          main { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          .bg-white { border: none !important; shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { padding: 12px !important; border-bottom: 1px solid #e2e8f0 !important; }
          tr { page-break-inside: avoid !important; }
        }
      `}</style>

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
            <SidebarItem icon={Send} label="Invitations (RSVP)" onClick={() => router.push('/dashboard/studio')} />
            <SidebarItem icon={Utensils} label="Gestion des tables" onClick={() => router.push('/dashboard/table')} />
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
          
          {/* BLOC D'ACTIONS PRINCIPALES REPOSITIONNÉ & CLAIR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Input CSV caché */}
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
            
            {/* Bouton d'importation explicite */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-sm shadow-sm disabled:opacity-50"
            >
              {importing ? (
                <Loader2 size={16} className="animate-spin text-emerald-500" />
              ) : (
                <FileSpreadsheet size={16} className="text-emerald-600" />
              )}
              <span>{importing ? "Importation..." : "Importer un CSV"}</span>
            </button>

            {/* Bouton Ajouter un proche */}
            <button onClick={() => { setSelectedGuest(null); setIsModalOpen(true); }} className="flex items-center justify-between gap-4 bg-slate-900 text-white pl-6 pr-2 py-2 rounded-full hover:bg-rose-500 transition-all shadow-xl">
              <span className="font-bold text-sm">Ajouter un proche</span>
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Plus size={20} strokeWidth={3} /></div>
            </button>
          </div>
        </header>

        <div className="bento-cards grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <BentoStatCard label="Total Invités" value={guests.reduce((acc, g) => acc + (g.guests_count || 1), 0)} emoji="👥" color="text-[#0D1C41]" />
          <BentoStatCard label="Confirmés" value={guests.filter(g => g.status === 'confirmé').length} emoji="✅" color="text-emerald-500" />
          <BentoStatCard label="En attente" value={guests.filter(g => g.status === 'en_attente').length} emoji="⏳" color="text-amber-500" />
          <BentoStatCard label="Invités VIP" value={guests.filter(g => g.is_vip).length} emoji="⭐" color="text-amber-600" />
        </div>

        {/* NOUVELLE ALERTE NOTIFICATION POUR L'IMPORTATION */}
        <AnimatePresence>
          {importNotice && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
              <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-bold ${
                importNotice.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                {importNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{importNotice.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BARRE DE RECHERCHE ET FILTRES RESTE SIMPLE ET PROPRE */}
        <div className="search-container flex flex-col md:flex-row gap-4 mb-8 max-w-3xl items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
            <input type="text" placeholder="Rechercher..." className="w-full pl-16 pr-8 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          
          <div className="flex items-center gap-2 bg-white border-2 border-slate-100 rounded-[2rem] px-4 py-2">
            <select className="bg-transparent font-bold text-sm outline-none text-slate-600 px-2 cursor-pointer" value={printFilter} onChange={(e) => setPrintFilter(e.target.value)}>
              <option value="all">Toute la liste</option>
              <option value="parents">Catégorie: Parents</option>
              <option value="amis">Catégorie: Amis</option>
              <option value="collègues">Catégorie: Collègues</option>
              <option value="accompanied">Personnes accompagnées</option>
            </select>
            
            <button onClick={handlePrint} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-rose-500 transition-all shadow-md flex items-center justify-center" title="Lancer l'impression">
              <Printer size={18} />
            </button>
          </div>
        </div>

        {/* SECTION : TABLEAU DE BORD DE SUIVI DES ENVOIS WHATSAPP */}
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Progression des invitations WhatsApp</h3>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {guests.filter(g => g.invitation_sent).length} sur {guests.length} proches contactés
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-slate-900">
                {guests.length > 0 ? Math.round((guests.filter(g => g.invitation_sent).length / guests.length) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Jauge visuelle de progression */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500 ease-out shadow-inner"
              style={{ width: `${guests.length > 0 ? (guests.filter(g => g.invitation_sent).length / guests.length) * 100 : 0}%` }}
            />
          </div>

          {/* Mini-indicateurs contextuels */}
          <div className="grid grid-cols-2 gap-4 pt-2 text-center border-t border-slate-50">
            <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/30">
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Restants à envoyer</div>
              <div className="text-base font-black text-amber-700 mt-0.5">
                {guests.filter(g => !g.invitation_sent).length} fiches ✉️
              </div>
            </div>
            <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/30">
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Invitations délivrées</div>
              <div className="text-base font-black text-emerald-700 mt-0.5">
                {guests.filter(g => g.invitation_sent).length} envoyées ✅
              </div>
            </div>
          </div>
        </div>


        {/* TABLEAU DES INVITÉS */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-separate border-tools-0">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-8 py-5 border-b border-slate-100">Invité</th>
                <th className="px-8 py-5 text-center border-b border-slate-100">Catégorie</th>
                <th className="px-8 py-5 text-center border-b border-slate-100">Accompagnants</th>
                <th className="px-8 py-5 border-b border-slate-100">Statut RSVP</th>
                <th className="px-8 py-5 text-right border-b border-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentGuests.map((guest) => (
                <tr 
                  key={guest.id} 
                  className={`transition-colors group ${
                    guest.invitation_sent 
                      ? 'bg-emerald-50/15 hover:bg-emerald-50/25' // Légère teinte émeraude si l'invitation est envoyée
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <div className="font-bold text-slate-800 flex flex-wrap items-center gap-2">
                        {guest.is_vip && (
                          <span title="VIP">
                            <Crown size={14} className="text-amber-500 fill-amber-400 shrink-0" />
                          </span>
                        )}
                        <span className={guest.is_vip ? "text-amber-900 font-extrabold" : ""}>{guest.name}</span>
                        
                        <span className={`text-[9px] px-2 py-0.5 rounded-md border ${
                          guest.side === 'partenaire_2' 
                            ? 'bg-rose-50 border-rose-100 text-rose-500' 
                            : guest.side === 'partenaire_1'
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-500'
                            : 'bg-purple-50 border-purple-100 text-purple-500'
                        }`}>
                          {guest.side === 'partenaire_1' ? 'Marié' : guest.side === 'partenaire_2' ? 'Mariée' : 'Commun'}
                        </span>

                        {/* ✨ NOUVEAU : Indicateur de statut WhatsApp direct */}
                        {guest.invitation_sent ? (
                          <span className="bg-emerald-100/70 text-emerald-800 border-emerald-200/50 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border">
                            ✉️ Envoyé
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-600 border-amber-200/60 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border italic">
                            ⏳ À envoyer
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                        <Phone size={10} className="text-slate-300"/> {guest.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 border border-slate-200/60">
                      {getCategoryIcon(guest.category)}
                      {guest.category || 'amis'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-black text-slate-600 text-sm">
                      x{guest.guests_count || 1}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <StatusPill status={guest.status} />
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={() => sendWhatsAppInvitation(guest)} 
                        className={`p-2.5 rounded-xl transition-all shadow-sm ${
                          guest.invitation_sent 
                            ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                        }`}
                        title={guest.invitation_sent ? "Renvoyer l'invitation" : "Inviter via WhatsApp"}
                      >
                        <MessageCircle size={16}/>
                      </button>
                      <button onClick={() => { setSelectedGuest(guest); setIsModalOpen(true); }} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(guest.id)} className="p-2.5 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* LOGIQUE DE PAGINATION */}
          <div className="pagination-container px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Page {currentPage} sur {totalPages || 1}
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} className="text-slate-600" />
              </button>

              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                      currentPage === i + 1 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={18} className="text-slate-600" />
              </button>
            </div>
          </div>
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