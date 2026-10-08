"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { normalizePhone, whatsappLink } from '../../../lib/phone';
import { buildInvitationMessage } from '../../../lib/whatsapp-message';
import { countPersons, guestQuota, isGuestLimitError } from '../../../lib/plan';
import PricingModal from '../../../components/dashboard/PricingModal';
import { 
  Users, Search, Plus, Send, Edit3, Trash2, 
  Users as UsersIcon, X, LayoutDashboard,
  MessageSquare, CheckCircle2, Clock, XCircle, Banknote, 
  ClipboardList, Utensils, Phone, Loader2, Check, AlertCircle, ChevronRight, ChevronLeft,
  MessageCircle, Crown, Home, Briefcase, Smile, FileSpreadsheet,
  Landmark, Cross, GlassWater, Filter, MessageSquareQuote, Handshake, BookUser, UserX
} from 'lucide-react';
import ContactImportSheet, { type ContactRow } from '../../../components/invite/ContactImportSheet';
import { contactPickerSupported, pickPhoneContacts } from '../../../lib/contacts';
import { useConfirm } from '../../../components/ui/ConfirmDialog';

// --- 1. COMPOSANTS DE SOUTIEN ---


function BentoStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="min-w-[7.25rem] shrink-0 snap-start rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm lg:min-w-0">
      <div className={`font-display text-2xl tabular-nums leading-none sm:text-3xl ${color}`}>{value}</div>
      <div className="mt-2 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function StatusPill({ guest, dotEnabled = false }: { guest: any; dotEnabled?: boolean }) {
  const status = guest.status;

  if (status === 'confirmé') {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 size={12} strokeWidth={3} />
          Confirmé
        </span>

        <div className="flex items-center gap-1 flex-wrap mt-0.5">
          {dotEnabled && guest.attending_dot !== false && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100/60" title="Présent à la dot">
              <Handshake size={11} /> Dot
            </span>
          )}

          {guest.attending_civil && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-600 border border-rose-100/60" title="Présent à la Mairie">
              <Landmark size={11} /> Mairie
            </span>
          )}

          {guest.attending_church && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100/60" title="Présent à l'Église">
              <Cross size={11} /> Église
            </span>
          )}

          {guest.attending_reception && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100/60" title="Présent au Dîner/Réception">
              <GlassWater size={11} /> Dîner
            </span>
          )}
        </div>
      </div>
    );
  }

  if (status === 'décliné') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
        <XCircle size={12} strokeWidth={3} />
        Décliné
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
      <Clock size={12} strokeWidth={3} />
      En attente
    </span>
  );
}

// --- 2. MODAL D'AJOUT ET ÉDITION ---

function GuestModal({ isOpen, onClose, onSuccess, marriageId, guestToEdit, dotEnabled = false }: any) {
  const [pickerSupported] = useState(() => contactPickerSupported());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAccompanist, setHasAccompanist] = useState(false);
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
    attending_dot: true,
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
          attending_dot: guestToEdit.attending_dot ?? true,
          attending_civil: guestToEdit.attending_civil ?? true,
          attending_church: guestToEdit.attending_church ?? true,
          attending_reception: guestToEdit.attending_reception ?? true
        });
        setHasAccompanist((guestToEdit.guests_count || 1) > 1);
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
          attending_dot: true,
          attending_civil: true,
          attending_church: true,
          attending_reception: true
        });
        setHasAccompanist(false);
      }
    }
  }, [guestToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marriageId) return;
    setErrorMessage(null);

    const phone = normalizePhone(formData.phone);
    if (!phone) {
      setErrorMessage("Ce numéro WhatsApp n'est pas valide. Exemple : 07 00 00 00 00 ou +33 6 12 34 56 78.");
      return;
    }
    setIsSubmitting(true);

    const finalCount = hasAccompanist ? formData.guests_count : 1;

    try {
      let error;
      const dataToSave: Record<string, unknown> = {
        marriage_id: marriageId,
        name: formData.name,
        phone,
        guests_count: finalCount,
        side: formData.side,
        status: formData.status,
        category: formData.category,
        is_vip: formData.is_vip,
        notes: formData.notes,
        attending_civil: formData.attending_civil,
        attending_church: formData.attending_church,
        attending_reception: formData.attending_reception,
        // Colonne ajoutée par la migration 12 : envoyée seulement si la dot est au programme
        ...(dotEnabled ? { attending_dot: formData.attending_dot } : {}),
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
        setErrorMessage("Ce numéro WhatsApp est déjà utilisé pour un autre invité.");
      } else if (isGuestLimitError(error)) {
        setErrorMessage("La limite d'invités de votre formule est atteinte : passez au palier supérieur pour en ajouter d'autres (ou réduisez le nombre d'accompagnants).");
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
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[1.75rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 sm:p-8 bg-ink text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">{guestToEdit ? "Modifier" : "Ajouter"} Invité</h3>
                <p className="text-slate-400 font-medium text-xs uppercase tracking-widest mt-1">Registre des invités</p>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5 max-h-[75dvh] overflow-y-auto">
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

              {!guestToEdit && pickerSupported && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const [c] = await pickPhoneContacts(false);
                      if (c) setFormData((prev) => ({ ...prev, name: c.name || prev.name, phone: c.phones[0] ?? prev.phone }));
                    } catch { /* accès refusé : saisie manuelle */ }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-600"
                >
                  <BookUser size={16} /> Choisir dans mes contacts
                </button>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1"> Nom de l'invité</label>
                <input required type="text" placeholder="Ex: Jean Dupont" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-rose-400 outline-none transition-all font-bold" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1"> Numéro WhatsApp (avec indicatif)</label>
                <input 
                  required 
                  type="text"
                  placeholder="Ex : 07 00 00 00 00 ou +33 6 12 34 56 78" 
                  className={`w-full px-5 py-3.5 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all ${errorMessage?.includes('numéro') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-100 focus:border-rose-400'}`} 
                  value={formData.phone} 
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^\d+\s.-]/g, '');
                    setFormData({...formData, phone: cleaned});
                  }} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1"> Catégorie</label>
                  <select className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-sm" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    <option value="amis">Amis</option>
                    <option value="parents">Parents</option>
                    <option value="collègues">Collègues</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1"> Statut RSVP</label>
                  <select className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-sm" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="en_attente">En attente</option>
                    <option value="confirmé">Confirmé</option>
                    <option value="décliné">Décliné</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1"> Accompagné ?</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setHasAccompanist(false)} className={`flex-1 py-3 rounded-xl font-black text-xs border-2 transition-all ${!hasAccompanist ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>NON</button>
                  <button type="button" onClick={() => setHasAccompanist(true)} className={`flex-1 py-3 rounded-xl font-black text-xs border-2 transition-all ${hasAccompanist ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>OUI</button>
                </div>
                {hasAccompanist && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                    <input type="number" min="2" placeholder="Nombre de personnes" className="w-full mt-2 px-5 py-3 bg-rose-50 border border-rose-100 rounded-2xl outline-none font-black text-rose-600" value={formData.guests_count} onChange={(e) => setFormData({...formData, guests_count: parseInt(e.target.value) || 2})} />
                  </motion.div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1"> Côté</label>
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
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1"> Présence aux cérémonies</label>
                  <div className={`grid gap-2 ${dotEnabled ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                    {dotEnabled && (
                      <label className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer ${formData.attending_dot ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        <input type="checkbox" checked={formData.attending_dot} onChange={e => setFormData({...formData, attending_dot: e.target.checked})} className="sr-only" />
                        <Handshake size={14} /> Dot
                      </label>
                    )}
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
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1"> Notes / Message de l'invité</label>
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

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pricing, setPricing] = useState<null | 'limit' | 'discover'>(null);
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [contactsOpen, setContactsOpen] = useState(false);
  const { confirm, notify } = useConfirm();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Limite de la formule (gratuit ou palier) : la base l'applique aussi, voir migrations 7 et 17
  const quota = guestQuota(marriage, guests);
  const limitActive = Boolean(marriage && 'plan' in marriage && quota.limit !== null);
  const room = limitActive ? quota.remaining : Infinity;

  // CALCUL DES STATISTIQUES DES CÉRÉMONIES
  const confirmedGuests = guests.filter(g => g.status === 'confirmé');
  
  const dotEnabled = Boolean(marriage?.show_dot);
  const totalDot = confirmedGuests
    .filter(g => g.attending_dot !== false)
    .reduce((acc, g) => acc + (g.guests_count || 1), 0);

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
    const matchesSearch = (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (g.phone || '').includes(searchTerm) || 
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
  
  const currentGuests = filteredGuests.slice(indexOfFirstItem, indexOfLastItem);

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

  // Ajout groupé (import CSV ou contacts du téléphone) : respecte la limite gratuite et ignore les doublons
  const bulkInsert = async (allGuests: Record<string, unknown>[]) => {
    if (room <= 0) { setPricing('limit'); return false; }
    // En personnes : on ajoute les fiches tant que leurs accompagnants tiennent dans la limite
    let toImport = allGuests;
    if (Number.isFinite(room)) {
      let left = room;
      toImport = [];
      for (const g of allGuests) {
        const n = quota.byPersons ? Math.max(1, Number(g.guests_count) || 1) : 1;
        if (n > left) break;
        toImport.push(g);
        left -= n;
      }
    }
    const skippedForLimit = allGuests.length - toImport.length;

    const batchSize = 5;
    let insertedCount = 0;
    let duplicates = 0;
    let limitHit = false;

    try {
      for (let i = 0; i < toImport.length && !limitHit; i += batchSize) {
        const batch = toImport.slice(i, i + batchSize);
        const { error } = await supabase.from('invite').insert(batch);
        if (!error) { insertedCount += batch.length; continue; }
        if (isGuestLimitError(error)) { limitHit = true; break; }
        if (error.code !== '23505') throw error;
        // Un doublon fait échouer tout le lot : on réessaie ligne par ligne pour ne perdre personne
        for (const row of batch) {
          const { error: rowError } = await supabase.from('invite').insert(row);
          if (!rowError) insertedCount++;
          else if (rowError.code === '23505') duplicates++;
          else if (isGuestLimitError(rowError)) { limitHit = true; break; }
          else throw rowError;
        }
      }

      const notLoaded = skippedForLimit + (limitHit ? toImport.length - insertedCount - duplicates : 0);
      const parts = [`${insertedCount} proche${insertedCount > 1 ? 's' : ''} ajouté${insertedCount > 1 ? 's' : ''}`];
      if (duplicates) parts.push(`${duplicates} numéro${duplicates > 1 ? 's' : ''} en double ignoré${duplicates > 1 ? 's' : ''}`);
      if (notLoaded) parts.push(`${notLoaded} en attente : limite de ${quota.limit} ${quota.unit} atteinte`);
      setImportNotice({ type: notLoaded ? 'error' : 'success', message: `${parts.join(' · ')}.` });
      if (notLoaded) setPricing('limit');
      loadData();
      return true;
    } catch (err: any) {
      setImportNotice({ type: 'error', message: err.message || "Erreur lors de l'ajout des invités." });
      return false;
    }
  };

  const importContacts = async (rows: ContactRow[]) => {
    if (!marriage?.id) return;
    setImporting(true);
    setImportNotice(null);
    const ok = await bulkInsert(rows.map((r) => ({
      marriage_id: marriage.id, name: r.name, phone: r.phone, side: r.side, category: r.category,
      guests_count: 1, is_vip: false, notes: null, status: 'en_attente',
    })));
    setImporting(false);
    if (ok) setContactsOpen(false);
  };

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
          phone: normalizePhone(row.phone),
          side: ['partenaire_1', 'partenaire_2', 'commun'].includes(row.side) ? row.side : 'commun',
          category: ['parents', 'amis', 'collègues'].includes(row.category) ? row.category : 'amis',
          guests_count: parseInt(row.guests_count) || 1,
          is_vip: row.is_vip?.toLowerCase() === 'true' || row.is_vip === '1',
          notes: row.notes?.trim() || row.message?.trim() || null,
          status: 'en_attente'
        }));

        const invalid = allGuests.some(g => !g.name || !g.phone);
        if (invalid) {
          setImportNotice({ type: 'error', message: "Certaines lignes n'ont pas de nom ou ont un numéro de téléphone invalide." });
          setImporting(false);
          return;
        }

        await bulkInsert(allGuests);
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: () => {
        setImportNotice({ type: 'error', message: "Impossible de lire ce fichier CSV." });
        setImporting(false);
      }
    });
  };

  const handleDelete = async (id: string) => {
    const guest = guests.find((g) => g.id === id);
    const ok = await confirm({
      title: 'Retirer cet invité ?',
      item: guest?.name,
      icon: UserX,
      confirmLabel: 'Retirer',
      consequences: [
        'Sa réponse à l’invitation sera effacée.',
        ...(guest?.table_id ? ['Sa place au plan de table sera libérée.'] : []),
        ...((guest?.guests_count ?? 1) > 2 ? [`Ses ${guest.guests_count - 1} accompagnants ne seront plus comptés.`]
          : (guest?.guests_count ?? 1) === 2 ? ['Son accompagnant ne sera plus compté.'] : []),
      ],
    });
    if (!ok) return;
    const { error } = await supabase.from('invite').delete().eq('id', id);
    if (error) notify("Le retrait a échoué. Vérifiez votre connexion puis réessayez.", 'error');
    else { notify(`${guest?.name ?? 'Invité'} a été retiré de la liste`); loadData(); }
  };

  const sendWhatsAppInvitation = async (guest: any) => {
    const rsvpUrl = `${window.location.origin}/rsvp/${marriage.id}?guest=${guest.id}`;
    
    // Message rédigé dans le studio (ou message par défaut)
    const message = buildInvitationMessage(marriage.whatsapp_message, {
      prenom: guest.name,
      maries: [marriage.partner_1_name, marriage.partner_2_name].filter(Boolean).join(' & '),
      lien: rsvpUrl,
    });
    
    // Numéro au format international (ex. 07… -> 22507…) : sinon WhatsApp répond « Ce lien n'a pas pu être ouvert »
    const whatsappUrl = whatsappLink(guest.phone, message);
    if (!whatsappUrl) {
      notify(`Le numéro de ${guest.name} n'est pas valide. Modifiez la fiche puis réessayez.`, 'error');
      return;
    }
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

  const resetFilters = () => {
    setCategoryFilter("all");
    setAccompanistFilter("all");
    setRsvpFilter("all");
    setMessageFilter("all");
    setSearchTerm("");
  };

  const openAdd = () => {
    if (room <= 0) { setPricing('limit'); return; }
    setSelectedGuest(null); setIsModalOpen(true);
  };
  const openEdit = (guest: any) => { setSelectedGuest(guest); setIsModalOpen(true); };

  if (loading) return (
    <div className="flex h-[60vh] flex-col items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
      <p className="mt-3 text-sm text-slate-500">Ouverture de la liste…</p>
    </div>
  );

  const totalPersons = guests.reduce((acc, g) => acc + (g.guests_count || 1), 0);
  const sentCount = guests.filter(g => g.invitation_sent).length;
  const sentPct = guests.length ? Math.round((sentCount / guests.length) * 100) : 0;
  const activeFilters = [categoryFilter, accompanistFilter, rsvpFilter, messageFilter].filter(v => v !== 'all').length;
  const selectClass = "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-ink outline-none focus:border-amber-400 lg:w-auto";

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-8 sm:pt-8 lg:px-12 lg:pb-12 lg:pt-12">
        {/* ── EN-TÊTE ── */}
        <header className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div className="min-w-0">
            <p className="eyebrow">Vos invités</p>
            <h1 className="mt-1 text-3xl font-normal tracking-tight sm:text-4xl">La liste <span className="italic text-rose-500">des invités</span></h1>
            <p className="mt-1 text-sm text-slate-500">{guests.length} fiche{guests.length > 1 ? 's' : ''} · {totalPersons} personne{totalPersons > 1 ? 's' : ''}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              aria-label="Importer un fichier CSV"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50 sm:px-4"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} className="text-emerald-600" />}
              <span className="hidden sm:inline">{importing ? 'Importation…' : 'Importer un CSV'}</span>
            </button>
            <button
              onClick={() => { if (room <= 0) setPricing('limit'); else setContactsOpen(true); }}
              disabled={importing}
              aria-label="Ajouter depuis mes contacts"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50 sm:px-4"
            >
              <BookUser size={16} className="text-rose-500" />
              <span>Contacts</span>
            </button>
            {/* Sur ordinateur : bouton classique ; sur mobile : bouton flottant en bas à droite */}
            <button onClick={openAdd} className="hidden min-h-[44px] items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 lg:inline-flex">
              <Plus size={16} /> Ajouter un proche
            </button>
          </div>
        </header>

        {limitActive && quota.limit !== null && quota.used >= quota.limit * 0.8 && (
          <div className={`mb-6 flex flex-col gap-3 rounded-2xl p-4 ring-1 sm:flex-row sm:items-center ${quota.remaining <= 0 ? 'bg-rose-50 ring-rose-200' : 'bg-amber-50 ring-amber-200'}`}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {quota.remaining <= 0
                  ? `Limite atteinte : ${quota.limit} ${quota.unit}${quota.tier ? ` (palier ${quota.tier.label})` : ' en version gratuite'}`
                  : `Plus que ${quota.remaining} ${quota.byPersons ? 'invité' : 'fiche'}${quota.remaining > 1 ? 's' : ''} ${quota.tier ? `dans le palier ${quota.tier.label}` : 'dans la version gratuite'}`}
              </p>
              <div className="mt-2 h-1.5 max-w-sm overflow-hidden rounded-full bg-white">
                <div className={`h-full rounded-full ${quota.remaining <= 0 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-600">{quota.used} / {quota.limit} {quota.byPersons ? 'invités (accompagnants compris)' : 'fiches'} · vos invités actuels ne sont jamais bloqués.</p>
            </div>
            <button onClick={() => setPricing(quota.remaining <= 0 ? 'limit' : 'discover')} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-rose-700">
              {quota.tier ? 'Passer au palier supérieur' : 'Voir les paliers'}
            </button>
          </div>
        )}

        {/* ── CHIFFRES CLÉS (défilent sur mobile) ── */}
        <div className={`-mx-4 mb-6 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:grid lg:overflow-visible ${dotEnabled ? 'lg:grid-cols-8' : 'lg:grid-cols-7'}`}>
          <BentoStatCard label="Personnes" value={totalPersons} color="text-ink" />
          <BentoStatCard label="Confirmés" value={guests.filter(g => g.status === 'confirmé').length} color="text-emerald-600" />
          <BentoStatCard label="En attente" value={guests.filter(g => g.status === 'en_attente').length} color="text-amber-600" />
          <BentoStatCard label="VIP" value={guests.filter(g => g.is_vip).length} color="text-amber-600" />
          {dotEnabled && <BentoStatCard label="Dot" value={totalDot} color="text-emerald-700" />}
          <BentoStatCard label="Mairie" value={totalCivil} color="text-rose-600" />
          <BentoStatCard label="Église" value={totalChurch} color="text-blue-600" />
          <BentoStatCard label="Dîner" value={totalReception} color="text-amber-700" />
        </div>

        {/* ── INVITATIONS WHATSAPP ── */}
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-ink"><MessageCircle size={15} className="mr-1.5 inline text-emerald-600" />Invitations WhatsApp</p>
            <p className="text-sm text-slate-500"><span className="font-semibold text-ink">{sentCount}</span> / {guests.length} envoyées</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${sentPct}%` }} />
          </div>
          {guests.length - sentCount > 0 && (
            <button onClick={() => setMessageFilter('pending')} className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700">
              Voir les {guests.length - sentCount} invitation{guests.length - sentCount > 1 ? 's' : ''} à envoyer →
            </button>
          )}
        </div>

        <AnimatePresence>
          {importNotice && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
              <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-medium ${importNotice.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
                {importNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{importNotice.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RECHERCHE & FILTRES ── */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="search"
                placeholder="Rechercher un nom, un numéro, une note…"
                aria-label="Rechercher un invité"
                className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-[15px] text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setFiltersOpen(v => !v)}
              aria-expanded={filtersOpen}
              className={`relative inline-flex min-h-[48px] items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors lg:hidden ${filtersOpen || activeFilters ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-ink'}`}
            >
              <Filter size={16} /> Filtres{activeFilters ? ` (${activeFilters})` : ''}
            </button>
          </div>

          <div className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 lg:flex lg:flex-wrap lg:items-center lg:border-0 lg:bg-transparent lg:p-0`}>
            <select aria-label="Catégorie" className={selectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Toutes catégories</option>
              <option value="amis">Amis</option>
              <option value="parents">Parents</option>
              <option value="collègues">Collègues</option>
            </select>
            <select aria-label="Accompagnants" className={selectClass} value={accompanistFilter} onChange={(e) => setAccompanistFilter(e.target.value)}>
              <option value="all">Seuls et accompagnés</option>
              <option value="single">Seuls</option>
              <option value="accompanied">Accompagnés</option>
            </select>
            <select aria-label="Réponse" className={selectClass} value={rsvpFilter} onChange={(e) => setRsvpFilter(e.target.value)}>
              <option value="all">Toutes les réponses</option>
              <option value="confirmé">Confirmés</option>
              <option value="en_attente">En attente</option>
              <option value="décliné">Déclinés</option>
            </select>
            <select aria-label="Invitation WhatsApp" className={selectClass} value={messageFilter} onChange={(e) => setMessageFilter(e.target.value)}>
              <option value="all">Invitations : toutes</option>
              <option value="sent">Invitation envoyée</option>
              <option value="pending">Invitation à envoyer</option>
            </select>
            {(activeFilters > 0 || searchTerm) && (
              <button onClick={resetFilters} className="col-span-2 min-h-[40px] text-sm font-semibold text-rose-600 hover:text-rose-700 lg:ml-auto">
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <p className="mb-3 text-sm text-slate-500">{filteredGuests.length} résultat{filteredGuests.length > 1 ? 's' : ''}</p>

        {guests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Users className="h-9 w-9 text-amber-500" strokeWidth={1.4} />
            <p className="font-display text-xl text-ink">Votre liste est encore vide</p>
            <p className="max-w-sm text-sm text-slate-500">Ajoutez vos proches un par un, ou importez un fichier CSV.</p>
            <button onClick={openAdd} className="mt-1 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700">
              <Plus size={16} /> Ajouter un proche
            </button>
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-10 text-center text-sm text-slate-500">
            Aucun invité ne correspond. <button onClick={resetFilters} className="font-semibold text-rose-600">Réinitialiser les filtres</button>
          </div>
        ) : (
          <>
            {/* ── MOBILE : une carte par invité ── */}
            <ul className="space-y-3 md:hidden">
              {currentGuests.map((guest) => (
                <GuestCard key={guest.id} guest={guest} dotEnabled={dotEnabled} onInvite={() => sendWhatsAppInvitation(guest)} onEdit={() => openEdit(guest)} onDelete={() => handleDelete(guest.id)} />
              ))}
            </ul>

            {/* ── TABLETTE / ORDINATEUR : tableau ── */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead className="border-b border-slate-200 bg-ivory/70">
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <th className="px-5 py-3.5">Invité</th>
                      <th className="px-5 py-3.5">Catégorie</th>
                      <th className="px-5 py-3.5 text-center">Pers.</th>
                      <th className="px-5 py-3.5">Réponse</th>
                      <th className="px-5 py-3.5">Notes</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentGuests.map((guest) => (
                      <tr key={guest.id} className="group transition-colors hover:bg-ivory/60">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar guest={guest} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 font-semibold text-ink">
                                {guest.is_vip && <Crown size={14} className="shrink-0 text-amber-500" />}
                                <span className="truncate">{guest.name}</span>
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                                <span className="whitespace-nowrap">{guest.phone}</span>
                                <SentBadge sent={guest.invitation_sent} />
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                            {getCategoryIcon(guest.category)} <span className="capitalize">{guest.category || 'amis'}</span>
                          </span>
                          <p className="mt-0.5 text-xs text-slate-400">{sideName(guest.side)}</p>
                        </td>
                        <td className="px-5 py-4 text-center font-display text-lg text-ink">{guest.guests_count || 1}</td>
                        <td className="px-5 py-4"><StatusPill guest={guest} dotEnabled={dotEnabled} /></td>
                        <td className="max-w-xs px-5 py-4">
                          {guest.notes
                            ? <p className="line-clamp-2 text-sm italic text-slate-600" title={guest.notes}>« {guest.notes} »</p>
                            : <span className="text-sm text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5">
                            <IconAction label={guest.invitation_sent ? "Renvoyer l'invitation WhatsApp" : 'Inviter via WhatsApp'} onClick={() => sendWhatsAppInvitation(guest)} tone={guest.invitation_sent ? 'neutral' : 'whatsapp'}>
                              <MessageCircle size={16} />
                            </IconAction>
                            <IconAction label="Modifier" onClick={() => openEdit(guest)}><Edit3 size={16} /></IconAction>
                            <IconAction label="Supprimer" onClick={() => handleDelete(guest.id)} tone="danger"><Trash2 size={16} /></IconAction>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── PAGINATION ── */}
            {totalPages > 1 && (
              <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-ink disabled:opacity-30">
                  <ChevronLeft size={16} /> <span className="hidden sm:inline">Précédent</span>
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-500 sm:hidden">Page {currentPage} / {totalPages}</span>
                  {pageWindow(currentPage, totalPages).map((p, i) => p === '…'
                    ? <span key={`e${i}`} className="hidden px-1 text-slate-400 sm:inline">…</span>
                    : (
                      <button key={p} onClick={() => setCurrentPage(p)} aria-current={p === currentPage ? 'page' : undefined}
                        className={`hidden h-10 min-w-10 rounded-xl px-2 text-sm font-semibold transition-colors sm:inline-block ${p === currentPage ? 'bg-ink text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-ink'}`}>
                        {p}
                      </button>
                    ))}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-ink disabled:opacity-30">
                  <span className="hidden sm:inline">Suivant</span> <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </>
        )}
      </main>

      {/* Bouton d'ajout flottant (mobile et tablette) */}
      <button
        onClick={openAdd}
        aria-label="Ajouter un proche"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/30 transition-transform active:scale-95 lg:hidden"
      >
        <Plus size={26} strokeWidth={2.2} />
      </button>

      <AnimatePresence>
        {pricing && <PricingModal reason={pricing} persons={countPersons(guests)} byPersons={quota.byPersons} currentTier={quota.tierId} marriageId={marriage?.id} couple={[marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ')} onClose={() => setPricing(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {contactsOpen && (
          <ContactImportSheet
            existingPhones={new Set(guests.map((g) => normalizePhone(g.phone)).filter(Boolean) as string[])}
            room={room}
            saving={importing}
            onClose={() => setContactsOpen(false)}
            onImport={importContacts}
          />
        )}
      </AnimatePresence>

      <GuestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        marriageId={marriage?.id} 
        onSuccess={loadData} 
        guestToEdit={selectedGuest} 
        dotEnabled={dotEnabled}
      />
    </div>
  );
}

/* ─────────── Éléments d'affichage ─────────── */

const sideName = (side?: string) => side === 'partenaire_1' ? 'Côté marié' : side === 'partenaire_2' ? 'Côté mariée' : 'Commun';

// Pages affichées : 1 … 4 5 6 … 12
function pageWindow(current: number, total: number): (number | '…')[] {
  const pages = new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['…' as const, p] : [p]));
}

function Avatar({ guest }: { guest: any }) {
  const initials = String(guest.name || '?').split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const tone = guest.side === 'partenaire_2' ? 'bg-rose-50 text-rose-600' : guest.side === 'partenaire_1' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600';
  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${tone}`} aria-hidden>{initials}</span>;
}

function SentBadge({ sent }: { sent: boolean }) {
  return sent
    ? <span className="inline-flex items-center gap-1 whitespace-nowrap text-emerald-600"><Check size={12} /> Invitée</span>
    : <span className="inline-flex items-center gap-1 whitespace-nowrap text-amber-700"><Clock size={12} /> À inviter</span>;
}

function IconAction({ label, onClick, tone = 'neutral', children }: { label: string; onClick: () => void; tone?: 'neutral' | 'whatsapp' | 'danger'; children: React.ReactNode }) {
  const tones = {
    neutral: 'border-slate-200 text-slate-600 hover:border-ink hover:text-ink',
    whatsapp: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white',
    danger: 'border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600',
  };
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`grid h-10 w-10 place-items-center rounded-xl border bg-white transition-colors ${tones[tone]}`}>
      {children}
    </button>
  );
}

const STATUS = {
  'confirmé': { label: 'Confirmé', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: CheckCircle2 },
  'en_attente': { label: 'En attente', cls: 'bg-amber-50 text-amber-800 ring-amber-200', Icon: Clock },
  'décliné': { label: 'Décliné', cls: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: XCircle },
} as const;

// Carte d'un invité sur mobile : l'essentiel d'un coup d'œil, actions à portée de pouce
function GuestCard({ guest, dotEnabled = false, onInvite, onEdit, onDelete }: { guest: any; dotEnabled?: boolean; onInvite: () => void; onEdit: () => void; onDelete: () => void }) {
  const status = STATUS[guest.status as keyof typeof STATUS] ?? STATUS.en_attente;
  const n = guest.guests_count || 1;
  const confirmed = guest.status === 'confirmé';
  return (
    <li className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar guest={guest} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            {guest.is_vip && <Crown size={14} className="shrink-0 text-amber-500" />}
            <span className="truncate">{guest.name}</span>
          </p>
          <a href={`tel:${guest.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-500">
            <Phone size={12} /> {guest.phone}
          </a>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.cls}`}>
          <status.Icon size={12} /> {status.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{sideName(guest.side)}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize text-slate-600">{guest.category || 'amis'}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{n} pers.</span>
        {confirmed && dotEnabled && guest.attending_dot !== false && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"><Handshake size={11} /> Dot</span>}
        {confirmed && guest.attending_civil && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-rose-700"><Landmark size={11} /> Mairie</span>}
        {confirmed && guest.attending_church && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700"><Cross size={11} /> Église</span>}
        {confirmed && guest.attending_reception && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800"><GlassWater size={11} /> Dîner</span>}
      </div>

      {guest.notes && (
        <p className="mt-3 line-clamp-3 rounded-xl bg-ivory px-3 py-2 text-sm italic text-slate-600">« {guest.notes} »</p>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={onInvite}
          className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
            guest.invitation_sent ? 'border border-slate-200 bg-white text-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <MessageCircle size={16} /> {guest.invitation_sent ? 'Renvoyer' : 'Inviter sur WhatsApp'}
        </button>
        <IconAction label="Modifier" onClick={onEdit}><Edit3 size={16} /></IconAction>
        <IconAction label="Supprimer" onClick={onDelete} tone="danger"><Trash2 size={16} /></IconAction>
      </div>
    </li>
  );
}
