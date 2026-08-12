"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { 
  Users, Search, Plus, Send, Edit3, Trash2, 
  Users as UsersIcon, X, LayoutDashboard,
  MessageSquare, CheckCircle2, Clock, XCircle, Banknote, 
  ClipboardList, Utensils, Phone, Loader2, Check, AlertCircle, ChevronRight, ChevronLeft,
  MessageCircle, Crown, Home, Briefcase, Smile, Printer, FileSpreadsheet,
  Landmark, Cross, GlassWater, Filter, MessageSquareQuote
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
    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group transition-transform hover:scale-105 hover:shadow-lg">
      <div className={`text-3xl font-black tabular-nums leading-none ${color}`}>{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 mb-2">{label}</div>
      <div className="bg-slate-50 w-9 h-9 rounded-full flex items-center justify-center m-auto text-lg">{emoji}</div>
    </div>
  );
}

function StatusPill({ guest }: { guest: any }) {
  const status = guest.status;

  if (status === 'confirmé') {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 size={12} strokeWidth={3} />
          CONFIRMÉ PRÉSENT
        </span>

        <div className="flex items-center gap-1 flex-wrap mt-0.5">
          {guest.attending_civil && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100/60" title="Présent à la Mairie">
              <Landmark size={11} /> Mairie
            </span>
          )}

          {guest.attending_church && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100/60" title="Présent à l'Église">
              <Cross size={11} /> Église
            </span>
          )}

          {guest.attending_reception && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100/60" title="Présent au Dîner/Réception">
              <GlassWater size={11} /> Dîner
            </span>
          )}
        </div>
      </div>
    );
  }

  if (status === 'décliné') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-rose-50 text-rose-600 border border-rose-100">
        <XCircle size={12} strokeWidth={3} />
        Absent/Décliné
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-amber-50 text-amber-600 border border-amber-100">
      <Clock size={12} strokeWidth={3} />
      En attente
    </span>
  );
}

// --- 2. MODAL D'AJOUT ET ÉDITION ---

function GuestModal({ isOpen, onClose, onSuccess, marriageId, guestToEdit }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    guests_count: 1,
    side: 'partenaire_1',
    status: 'en_attente',
    category: 'amis',
    is_vip: false,
    notes: '',
    attending_civil: true,
    attending_church: true,
    attending_reception: true
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
          is_vip: guestToEdit.is_vip || false,
          notes: guestToEdit.notes || '',
          attending_civil: guestToEdit.attending_civil ?? true,
          attending_church: guestToEdit.attending_church ?? true,
          attending_reception: guestToEdit.attending_reception ?? true
        });
      } else {
        setFormData({ 
          name: '',
          phone: '',
          guests_count: 1,
          side: 'commun',
          status: 'en_attente',
          category: 'amis',
          is_vip: false,
          notes: '',
          attending_civil: true,
          attending_church: true,
          attending_reception: true
        });
      }
    }
  }, [guestToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marriageId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let error;
      const dataToSave = {
        marriage_id: marriageId,
        name: formData.name,
        phone: formData.phone,
        guests_count: 1,
        side: formData.side,
        status: formData.status,
        category: formData.category,
        is_vip: formData.is_vip,
        notes: formData.notes,
        attending_civil: formData.attending_civil,
        attending_church: formData.attending_church,
        attending_reception: formData.attending_reception
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
            <div className="p-8 bg-[#161B2E] text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">{guestToEdit ? "Modifier" : "Ajouter"} Invité 🥂</h3>
                <p className="text-slate-400 font-medium text-xs uppercase tracking-widest mt-1">Registre des invités</p>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
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

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">👤 Nom de l'invité</label>
                <input required type="text" placeholder="Ex: Jean Dupont" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-400 outline-none transition-all font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">📞 Numéro WhatsApp (avec indicatif)</label>
                <input 
                  required 
                  type="text"
                  placeholder="Ex: +33612345678 ou 2250102030405" 
                  className={`w-full px-5 py-3.5 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all ${errorMessage?.includes('numéro') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-100 focus:border-rose-400'}`} 
                  value={formData.phone} 
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/(?!^\+)[^\d]/g, '');
                    setFormData({...formData, phone: cleaned});
                  }} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">🏷️ Catégorie</label>
                  <select className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-sm" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    <option value="amis">Amis ✨</option>
                    <option value="parents">Parents 🏠</option>
                    <option value="collègues">Collègues 💼</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">📢 Statut RSVP</label>
                  <select className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-sm" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="en_attente">En attente</option>
                    <option value="confirmé">Confirmé</option>
                    <option value="décliné">Décliné</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">💒 Côté</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'partenaire_1', label: 'Marié' },
                    { id: 'partenaire_2', label: 'Mariée' },
                    { id: 'commun', label: 'Commun' }
                  ].map((side) => (
                    <button key={side.id} type="button" onClick={() => setFormData({...formData, side: side.id})} className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${formData.side === side.id ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                      {side.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.status === 'confirmé' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">📍 Présence aux cérémonies</label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer ${formData.attending_civil ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      <input type="checkbox" checked={formData.attending_civil} onChange={e => setFormData({...formData, attending_civil: e.target.checked})} className="sr-only" />
                      <Landmark size={14} /> Mairie
                    </label>
                    <label className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer ${formData.attending_church ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      <input type="checkbox" checked={formData.attending_church} onChange={e => setFormData({...formData, attending_church: e.target.checked})} className="sr-only" />
                      <Cross size={14} /> Église
                    </label>
                    <label className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer ${formData.attending_reception ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      <input type="checkbox" checked={formData.attending_reception} onChange={e => setFormData({...formData, attending_reception: e.target.checked})} className="sr-only" />
                      <GlassWater size={14} /> Dîner
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">💌 Notes / Message de l'invité</label>
                <textarea rows={3} placeholder="Message, vœux ou notes particulières..." className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-400 outline-none transition-all font-medium text-sm text-slate-700" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>

              <div className="flex gap-4 pt-4">
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [marriage, setMarriage] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  // ÉTATS DES FILTRES
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accompanistFilter, setAccompanistFilter] = useState("all");
  const [rsvpFilter, setRsvpFilter] = useState("all");
  const [messageFilter, setMessageFilter] = useState("all");

  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // CALCUL DES STATISTIQUES DES CÉRÉMONIES
  const confirmedGuests = guests.filter(g => g.status === 'confirmé');
  
  const totalCivil = confirmedGuests
    .filter(g => g.attending_civil)
    .reduce((acc, g) => acc + (g.guests_count || 1), 0);

  const totalChurch = confirmedGuests
    .filter(g => g.attending_church)
    .reduce((acc, g) => acc + (g.guests_count || 1), 0);

  const totalReception = confirmedGuests
    .filter(g => g.attending_reception)
    .reduce((acc, g) => acc + (g.guests_count || 1), 0);

  // FILTRAGE MULTI-CRITÈRES
  const filteredGuests = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.phone.includes(searchTerm) || 
                          (g.notes && g.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || g.category === categoryFilter;

    const matchesAccompanist = 
      accompanistFilter === "all" ? true :
      accompanistFilter === "single" ? (g.guests_count || 1) === 1 :
      accompanistFilter === "accompanied" ? (g.guests_count || 1) > 1 : true;

    const matchesRSVP = rsvpFilter === "all" || g.status === rsvpFilter;

    const matchesMessage = 
      messageFilter === "all" ? true :
      messageFilter === "sent" ? g.invitation_sent === true :
      messageFilter === "pending" ? !g.invitation_sent : true;

    return matchesSearch && matchesCategory && matchesAccompanist && matchesRSVP && matchesMessage;
  });

  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  const currentGuests = typeof window !== 'undefined' && window.matchMedia('print').matches 
    ? filteredGuests 
    : filteredGuests.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, accompanistFilter, rsvpFilter, messageFilter]);

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

        const allGuests = rows.map((row: any) => ({
          marriage_id: marriage.id,
          name: row.name?.trim(),
          phone: row.phone?.trim()?.replace(/(?!^\+)[^\d]/g, ''),
          side: ['partenaire_1', 'partenaire_2', 'commun'].includes(row.side) ? row.side : 'commun',
          category: ['parents', 'amis', 'collègues'].includes(row.category) ? row.category : 'amis',
          guests_count: parseInt(row.guests_count) || 1,
          is_vip: row.is_vip?.toLowerCase() === 'true' || row.is_vip === '1',
          notes: row.notes?.trim() || row.message?.trim() || null,
          status: 'en_attente'
        }));

        const invalid = allGuests.some(g => !g.name || !g.phone);
        if (invalid) {
          setImportNotice({ type: 'error', message: "Certaines lignes n'ont pas de nom ou de numéro de téléphone." });
          setImporting(false);
          return;
        }

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
                continue; 
              }
              throw error;
            }
            
            insertedCount += batch.length;
          }

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
          if (fileInputRef.current) fileInputRef.current.value = '';
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

  const sendWhatsAppInvitation = async (guest: any) => {
    const rsvpUrl = `${window.location.origin}/dashboard/rsvp/${marriage.id}?guest=${guest.id}`;
    
    // Si le numéro commence par +, on enlève le + pour le paramètre d'URL de l'API WhatsApp
    const formattedPhone = guest.phone.startsWith('+') ? guest.phone.substring(1) : guest.phone;

    const message = 
`👑 *INVITATION OFFICIELLE* 👑\n\n` +
`> NB : Cette invitation est strictement personnelle. \n\n` +
`Bonjour *${guest.name}* ! 👋\n\n` +
`Nous avons l'immense joie de vous inviter à célébrer notre union. Votre présence à nos côtés rendra cette journée inoubliable ! 🕊️💍\n\n` +
`📍 *Pour confirmer votre présence (RSVP) :*\n` +
`Merci de cliquer sur le lien ci-dessous pour valider votre venue :\n` +
`👉 ${rsvpUrl}\n\n` +
`Nous avons hâte de partager ce moment unique avec vous ! 🥂🎉\n\n` +
`_Gildas & Mariette_ \n`;
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    await supabase
      .from('invite')
      .update({ invitation_sent: true })
      .eq('id', guest.id);

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

  const resetFilters = () => {
    setCategoryFilter("all");
    setAccompanistFilter("all");
    setRsvpFilter("all");
    setMessageFilter("all");
    setSearchTerm("");
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
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
            
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

            <button onClick={() => { setSelectedGuest(null); setIsModalOpen(true); }} className="flex items-center justify-between gap-4 bg-slate-900 text-white pl-6 pr-2 py-2 rounded-full hover:bg-rose-500 transition-all shadow-xl">
              <span className="font-bold text-sm">Ajouter un proche</span>
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Plus size={20} strokeWidth={3} /></div>
            </button>
          </div>
        </header>

        {/* BENTO STATS AVEC DÉTAIL DES CÉRÉMONIES */}
        <div className="bento-cards grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-12">
          <BentoStatCard label="Total Invités" value={guests.reduce((acc, g) => acc + (g.guests_count || 1), 0)} emoji="👥" color="text-[#0D1C41]" />
          <BentoStatCard label="Confirmés" value={guests.filter(g => g.status === 'confirmé').length} emoji="✅" color="text-emerald-500" />
          <BentoStatCard label="En attente" value={guests.filter(g => g.status === 'en_attente').length} emoji="⏳" color="text-amber-500" />
          <BentoStatCard label="Invités VIP" value={guests.filter(g => g.is_vip).length} emoji="⭐" color="text-amber-600" />
          <BentoStatCard label="Mairie" value={totalCivil} emoji="🏛️" color="text-rose-600" />
          <BentoStatCard label="Église" value={totalChurch} emoji="⛪" color="text-blue-600" />
          <BentoStatCard label="Dîner" value={totalReception} emoji="🥂" color="text-amber-700" />
        </div>

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

        {/* BARRE DE RECHERCHE ET BARRE DE FILTRES AVANCÉS */}
        <div className="search-container bg-white p-6 rounded-[2.5rem] border border-slate-200/80 shadow-sm space-y-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="text" 
                placeholder="Rechercher un nom, téléphone, notes..." 
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-300 transition-all text-sm" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>

            <button 
              onClick={handlePrint} 
              className="px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all shadow-md flex items-center justify-center gap-2 text-sm shrink-0" 
              title="Imprimer la liste filtrée"
            >
              <Printer size={18} />
              <span>Imprimer</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-wider mr-2">
              <Filter size={14} className="text-rose-500" /> Filtres :
            </div>

            <select 
              className="bg-slate-50 border border-slate-200/80 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none text-slate-700 hover:border-slate-300 cursor-pointer transition-all"
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">🏷️ Catégorie : Toutes</option>
              <option value="amis">Amis ✨</option>
              <option value="parents">Parents 🏠</option>
              <option value="collègues">Collègues 💼</option>
            </select>

            <select 
              className="bg-slate-50 border border-slate-200/80 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none text-slate-700 hover:border-slate-300 cursor-pointer transition-all"
              value={accompanistFilter} 
              onChange={(e) => setAccompanistFilter(e.target.value)}
            >
              <option value="all">👥 Accompagnants : Tous</option>
              <option value="single">Seul (x1)</option>
              <option value="accompanied">Accompagné (x2+)</option>
            </select>

            <select 
              className="bg-slate-50 border border-slate-200/80 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none text-slate-700 hover:border-slate-300 cursor-pointer transition-all"
              value={rsvpFilter} 
              onChange={(e) => setRsvpFilter(e.target.value)}
            >
              <option value="all">📢 RSVP : Tous les statuts</option>
              <option value="confirmé">Confirmé présent ✅</option>
              <option value="en_attente">En attente ⏳</option>
              <option value="décliné">Absent / Décliné ❌</option>
            </select>

            <select 
              className="bg-slate-50 border border-slate-200/80 font-bold text-xs rounded-xl px-3.5 py-2.5 outline-none text-slate-700 hover:border-slate-300 cursor-pointer transition-all"
              value={messageFilter} 
              onChange={(e) => setMessageFilter(e.target.value)}
            >
              <option value="all">💬 Message WhatsApp : Tous</option>
              <option value="sent">Message envoyé ✉️</option>
              <option value="pending">Message à envoyer ⏳</option>
            </select>

            {(categoryFilter !== "all" || accompanistFilter !== "all" || rsvpFilter !== "all" || messageFilter !== "all" || searchTerm !== "") && (
              <button 
                onClick={resetFilters} 
                className="text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-1 transition-colors underline ml-auto"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

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

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500 ease-out shadow-inner"
              style={{ width: `${guests.length > 0 ? (guests.filter(g => g.invitation_sent).length / guests.length) * 100 : 0}%` }}
            />
          </div>

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
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-8 py-5 border-b border-slate-100">Invité</th>
                <th className="px-8 py-5 text-center border-b border-slate-100">Catégorie</th>
                <th className="px-8 py-5 text-center border-b border-slate-100">Accompagnants</th>
                <th className="px-8 py-5 border-b border-slate-100">Statut RSVP</th>
                <th className="px-8 py-5 border-b border-slate-100">Notes / Vœux</th>
                <th className="px-8 py-5 text-right border-b border-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentGuests.map((guest) => {
                const isConfirmed = guest.status === 'confirmé';

                return (
                  <tr 
                    key={guest.id} 
                    className={`transition-all group border-l-4 ${
                      isConfirmed 
                        ? 'bg-[#f0fdf4]/80 hover:bg-[#e6f7ec] border-l-emerald-500' 
                        : guest.invitation_sent 
                        ? 'bg-emerald-50/10 hover:bg-emerald-50/20 border-l-transparent' 
                        : 'hover:bg-slate-50/50 border-l-transparent'
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100/80 rounded-lg text-[10px] font-black uppercase text-slate-600 border border-slate-200/60">
                        {getCategoryIcon(guest.category)}
                        {guest.category || 'amis'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="inline-block px-3 py-1 bg-slate-100/80 rounded-lg font-black text-slate-700 text-sm">
                        x{guest.guests_count || 1}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <StatusPill guest={guest} />
                    </td>
                    <td className="px-8 py-5 max-w-xs">
                      {guest.notes ? (
                        <div className="flex items-start gap-2 bg-rose-50/60 border border-rose-100 p-3 rounded-2xl text-xs text-slate-700">
                          <MessageSquareQuote size={16} className="text-rose-400 shrink-0 mt-0.5" />
                          <p className="italic font-medium leading-relaxed break-words">{guest.notes}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Aucune note</span>
                      )}
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
                );
              })}
            </tbody>
          </table>

          <div className="pagination-container px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Page {currentPage} sur {totalPages || 1} ({filteredGuests.length} résultat{filteredGuests.length > 1 ? 's' : ''})
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