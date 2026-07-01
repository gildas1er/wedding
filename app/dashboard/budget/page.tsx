"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Plus, DollarSign, LayoutDashboard, 
  AlertCircle, CheckCircle2, Calendar, 
  Wallet, Trash2, X, Edit3, Save, Coins,
  User, Phone, Heart, Users, MapPin, LogOut, Printer
} from 'lucide-react';

// --- COMPOSANT DES PÉTALES ROUGES ---
const RedPetals = () => {
  const petals = Array.from({ length: 20 });
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden print:hidden">
      {petals.map((_, i) => (
        <motion.div
          key={i}
          initial={{ top: -20, left: `${Math.random() * 100}%`, opacity: 0, rotate: 0 }}
          animate={{ 
            top: '110%', 
            left: `${Math.random() * 110 - 5}%`,
            opacity: [0, 0.7, 0.7, 0],
            rotate: 720 
          }}
          transition={{ 
            duration: Math.random() * 8 + 7, 
            repeat: Infinity, 
            ease: "linear",
            delay: Math.random() * 10 
          }}
          className="absolute text-red-500/30 select-none"
        >
          <Heart size={Math.random() * 12 + 8} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
};

const EXCHANGE_RATES: { [key: string]: number } = { FCFA: 1, EUR: 0.0015, USD: 0.0016 };
const CURRENCY_SYMBOLS: { [key: string]: string } = { FCFA: 'FCFA', EUR: '€', USD: '$' };

export default function BudgetDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [marriage, setMarriage] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [currency, setCurrency] = useState('FCFA');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  const categories = [
    'Réception & Traiteur', 
    'Déco & Audiovisuel', 
    'Tenues & Beauté', 
    'Cérémonie & Mairie', 
    'Logistique & Cortège', 
    "Fonds d'Imprévus", 
    'Autre'
  ];
  const statuses = ['À planifier', 'En cours', 'Payé'];

  const [formData, setFormData] = useState({
    label: '', category: 'Réception & Traiteur', amount_estimated: '', amount_actual: '', 
    amount_paid: '', due_date: '', status: 'À planifier', 
    vendor_name: '', vendor_contact: '', notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      const { data: mData } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
      if (mData) {
        setMarriage(mData);
        
        const { data: eData, error } = await supabase
          .from('budget_items')
          .select('*')
          .eq('marriage_id', mData.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (eData && eData.length > 0) {
          setExpenses(eData);
        } else {
          const defaultItems = [
            { marriage_id: mData.id, label: 'Location Salle', category: 'Réception & Traiteur', amount_estimated: 570000, amount_actual: 570000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Traiteurs', category: 'Réception & Traiteur', amount_estimated: 1000000, amount_actual: 1000000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Gâteau', category: 'Réception & Traiteur', amount_estimated: 100000, amount_actual: 100000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Boissons / Sucreries', category: 'Réception & Traiteur', amount_estimated: 231800, amount_actual: 231800, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Vins', category: 'Réception & Traiteur', amount_estimated: 100000, amount_actual: 100000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Liqueurs', category: 'Réception & Traiteur', amount_estimated: 68500, amount_actual: 68500, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Eau', category: 'Réception & Traiteur', amount_estimated: 60800, amount_actual: 60800, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Dragée', category: 'Réception & Traiteur', amount_estimated: 60000, amount_actual: 60000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Déco Salle de Réception', category: 'Déco & Audiovisuel', amount_estimated: 500000, amount_actual: 500000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Audiovisuel', category: 'Déco & Audiovisuel', amount_estimated: 500000, amount_actual: 500000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Costume', category: 'Tenues & Beauté', amount_estimated: 100000, amount_actual: 100000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Chaussures homme', category: 'Tenues & Beauté', amount_estimated: 50000, amount_actual: 50000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Coiffure Homme', category: 'Tenues & Beauté', amount_estimated: 15000, amount_actual: 15000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Maquillage Homme', category: 'Tenues & Beauté', amount_estimated: 15000, amount_actual: 15000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Robe Mariée', category: 'Tenues & Beauté', amount_estimated: 300000, amount_actual: 300000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Robe de Soirée', category: 'Tenues & Beauté', amount_estimated: 150000, amount_actual: 150000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Maquillage Femme', category: 'Tenues & Beauté', amount_estimated: 120000, amount_actual: 120000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Coiffure Femme', category: 'Tenues & Beauté', amount_estimated: 100000, amount_actual: 100000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Chaussure Femme', category: 'Tenues & Beauté', amount_estimated: 60000, amount_actual: 60000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Bouquet', category: 'Tenues & Beauté', amount_estimated: 40000, amount_actual: 40000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Tenue traditionnelle H', category: 'Tenues & Beauté', amount_estimated: 100000, amount_actual: 100000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Tenue traditionnelle F', category: 'Tenues & Beauté', amount_estimated: 100000, amount_actual: 100000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Tenue Enfants', category: 'Logistique & Cortège', amount_estimated: 80000, amount_actual: 80000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Chaussures Enfants', category: 'Logistique & Cortège', amount_estimated: 30000, amount_actual: 30000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Location Voiture', category: 'Logistique & Cortège', amount_estimated: 150000, amount_actual: 150000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Hôtel', category: 'Logistique & Cortège', amount_estimated: 150000, amount_actual: 150000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Décoration Voitures', category: 'Logistique & Cortège', amount_estimated: 50000, amount_actual: 50000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Eglise', category: 'Cérémonie & Mairie', amount_estimated: 150000, amount_actual: 150000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Mairie', category: 'Cérémonie & Mairie', amount_estimated: 90000, amount_actual: 90000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Alliances', category: 'Cérémonie & Mairie', amount_estimated: 300000, amount_actual: 300000, amount_paid: 0, status: 'À planifier' },
            { marriage_id: mData.id, label: 'Imprévu', category: "Fonds d'Imprévus", amount_estimated: 500000, amount_actual: 500000, amount_paid: 0, status: 'À planifier' },
          ];

          const { data: insertedData, error: insertError } = await supabase
            .from('budget_items')
            .insert(defaultItems)
            .select();

          if (insertError) throw insertError;
          if (insertedData) setExpenses(insertedData);
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const formatPrice = (amountInFcfa: number) => {
    const converted = amountInFcfa * EXCHANGE_RATES[currency];
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: currency === 'FCFA' ? 0 : 2,
      maximumFractionDigits: currency === 'FCFA' ? 0 : 2,
    }).format(converted) + ' ' + CURRENCY_SYMBOLS[currency];
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);

    try {
      if (!marriage?.id) throw new Error("ID du mariage introuvable.");

      const expenseToInsert = {
        marriage_id: marriage.id,
        label: formData.label.trim(),
        category: formData.category,
        status: formData.status,
        amount_estimated: parseFloat(formData.amount_estimated) || 0,
        amount_actual: parseFloat(formData.amount_actual) || 0,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        vendor_name: formData.vendor_name.trim() || null,
        vendor_contact: formData.vendor_contact.trim() || null,
        due_date: formData.due_date || null,
        notes: formData.notes.trim() || null
      };

      const { data, error } = await supabase
        .from('budget_items')
        .insert([expenseToInsert])
        .select()
        .single();

      if (error) throw error;

      setExpenses([data, ...expenses]);
      setShowAddModal(false);
      setFormData({ label: '', category: 'Réception & Traiteur', amount_estimated: '', amount_actual: '', amount_paid: '', due_date: '', status: 'À planifier', vendor_name: '', vendor_contact: '', notes: '' });
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { data, error } = await supabase.from('budget_items')
        .update({
          amount_estimated: parseFloat(editingExpense.amount_estimated) || 0,
          amount_actual: parseFloat(editingExpense.amount_actual) || 0,
          amount_paid: parseFloat(editingExpense.amount_paid) || 0,
          status: editingExpense.amount_paid >= editingExpense.amount_actual ? 'Payé' : editingExpense.status
        })
        .eq('id', editingExpense.id).select().single();

      if (error) throw error;
      setExpenses(expenses.map(ex => ex.id === editingExpense.id ? data : ex));
      setEditingExpense(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if(!confirm("Supprimer cette dépense ?")) return;
    const { error } = await supabase.from('budget_items').delete().eq('id', id);
    if (!error) setExpenses(expenses.filter(ex => ex.id !== id));
    else setErrorMsg("Erreur de suppression");
  };

  const handlePrint = () => {
    window.print();
  };

  const totalEstimated = expenses.reduce((acc, curr) => acc + (curr.amount_estimated || 0), 0);
  const totalActual = expenses.reduce((acc, curr) => acc + (curr.amount_actual || 0), 0);
  const totalPaid = expenses.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const totalRemaining = totalActual - totalPaid;
  const paymentPercentage = totalActual > 0 ? Math.round((totalPaid / totalActual) * 100) : 0;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="w-8 h-8 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-ui flex overflow-hidden w-full relative">
      {/* FEUILLE DE STYLE MULTI-PAGES D'IMPRESSION AVEC LE REPETITEUR HTML TFOOT */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Montserrat:wght@300;400;600;800&display=swap');
        .font-luxury { font-family: 'Playfair Display', serif; }
        .font-ui { font-family: 'Montserrat', sans-serif; }
        
        .pure-print-wrapper { display: none; }

        @media print {
          .screen-only-section, aside, header, .print\\:hidden { 
            display: none !important; 
            visibility: hidden !important; 
          }
          
          html, body { 
            background: #fff !important; 
            color: #000 !important; 
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .pure-print-wrapper {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          /* Structure de contrôle globale de la pagination */
          .print-master-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          .print-master-content {
            padding: 15mm 15mm 20mm 15mm !important;
          }
          
          .print-header { 
            display: block !important;
            border-bottom: 2px solid #000 !important; 
            padding-bottom: 16px !important; 
            margin-bottom: 30px !important; 
          }
          
          .print-card { 
            display: block !important;
            border: 1px solid #cbd5e1 !important; 
            page-break-inside: avoid !important;
            border-radius: 12px !important; 
            margin-bottom: 24px !important; 
            background: #fff !important; 
            padding: 20px !important; 
          }
          
          .print-table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            margin-top: 12px !important; 
          }
          
          .print-table th, .print-table td { 
            border-bottom: 1px solid #e2e8f0 !important; 
            padding: 10px 14px !important; 
            text-align: left !important; 
            font-size: 13px !important; 
          }
          
          .print-table th { 
            font-weight: bold !important; 
            background-color: #f8fafc !important; 
            color: #1e293b !important;
          }

          .print-grid {
            display: table !important;
            width: 100% !important;
            margin-top: 20px !important;
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
          }
          .print-grid-col {
            display: table-cell !important;
            width: 25% !important;
            padding: 15px !important;
          }

          /* --- CONTENEUR DU PIED DE PAGE INTER-PAGES --- */
          .print-master-footer {
            height: 50px !important;
          }

          .print-footer-content {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 45px !important;
            background: #fff !important;
            border-top: 1px solid #e2e8f0 !important;
            padding: 10px 15mm 0 15mm !important;
            box-sizing: border-box !important;
          }

          .print-footer-table {
            width: 100% !important;
            font-size: 11px !important;
            color: #64748b !important;
          }
        }
      `}} />

      <RedPetals />

      {/* MESSAGES D'ERREUR */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-bold print:hidden">
            <AlertCircle size={18} /> {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-50"><X size={16}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BARRE LATÉRALE - ÉCRAN UNIQUEMENT */}
      <aside className="w-80 bg-white border-r border-amber-100 flex flex-col z-50 sticky top-0 h-screen shrink-0">
        <div className="p-12">
          <h2 className="text-2xl font-luxury text-slate-900 flex items-center gap-3">
             <Heart className="text-red-500 fill-red-500" size={24} /> WeddingStudio
          </h2>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-600 mt-2">Édition Premium</p>
        </div>

        <nav className="flex-1 px-8 space-y-2">
          {[
            { icon: <LayoutDashboard size={20} />, label: 'Tableau de Bord', active: false, path: '/dashboard' },
            { icon: <Users size={20} />, label: 'Liste d\'invités', active: false, path: '/guests' },
            { icon: <Wallet size={20} />, label: 'Budget & Finances', active: true, path: '/budget' },
            { icon: <MapPin size={20} />, label: 'Plan de Table', active: false, path: '/seating' },
            { icon: <Calendar size={20} />, label: 'Planning', active: false, path: '/timeline' },
          ].map((item, idx) => (
            <button 
              key={idx} 
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-bold transition-all ${item.active ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-slate-50">
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="w-full flex items-center gap-4 px-6 py-4 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* SECTION VUE ÉCRAN */}
      <div className="flex-1 overflow-y-auto relative z-10 h-screen custom-scrollbar screen-only-section">
        
        {/* EN-TÊTE ÉCRAN */}
        <header className="h-28 bg-white/70 backdrop-blur-xl border-b border-amber-100 flex justify-between items-center px-12 sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-luxury text-slate-900">
                {marriage?.partner_1_name || 'Partenaire 1'} <span className="text-amber-500 italic">&</span> {marriage?.partner_2_name || 'Partenaire 2'}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mt-1 flex items-center gap-2">
                <Calendar size={12} /> {marriage?.wedding_date ? new Date(marriage.wedding_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date à définir'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/80 border border-amber-100 rounded-full p-1 flex shadow-sm">
              {['FCFA', 'EUR', 'USD'].map((curr) => (
                <button key={curr} onClick={() => setCurrency(curr)} className={`px-4 py-2 rounded-full text-[10px] font-black transition-all ${currency === curr ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{curr}</button>
              ))}
            </div>

            <button onClick={handlePrint} className="bg-slate-100 text-slate-700 hover:bg-slate-200 p-4 rounded-full shadow-sm transition-all flex items-center justify-center" title="Imprimer le budget">
              <Printer size={18} />
            </button>

            <button onClick={() => setShowAddModal(true)} className="bg-amber-500 text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all flex items-center gap-3">
              <Plus size={16} /> Ajouter une dépense
            </button>
          </div>
        </header>

        {/* CONTENU TABLEAU DE BORD ÉCRAN */}
        <main className="max-w-6xl mx-auto p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { label: 'Budget Prévu', val: totalEstimated, color: 'text-slate-900', icon: <Wallet size={18}/> },
              { label: 'Total Facturé', val: totalActual, color: 'text-amber-600', icon: <DollarSign size={18}/> },
              { label: 'Reste à régler', val: totalRemaining, color: 'text-red-500', icon: <AlertCircle size={18}/> }
            ].map((stat, i) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-amber-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">{stat.icon}</div>
                </div>
                <h2 className={`text-3xl font-luxury ${stat.color}`}>{formatPrice(stat.val)}</h2>
              </motion.div>
            ))}
          </div>

          <div className="bg-white/80 backdrop-blur-md p-10 rounded-[3rem] border border-amber-100 shadow-sm mb-12 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-luxury text-xl italic text-slate-800">Progression des règlements</h3>
              <span className="bg-amber-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {paymentPercentage}% Payé
              </span>
            </div>
            <div className="h-3 bg-slate-50 rounded-full border border-slate-100 p-0.5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${paymentPercentage}%` }} className="h-full bg-gradient-to-r from-amber-300 to-amber-600 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-4">
              {expenses.map((expense) => {
                const isPaid = expense.status === 'Payé' || (expense.amount_paid >= expense.amount_actual && expense.amount_actual > 0);
                return (
                  <motion.div layout key={expense.id} className="bg-white p-6 rounded-3xl border border-amber-50 shadow-sm flex items-center justify-between hover:border-amber-300 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isPaid ? <CheckCircle2 size={20} /> : <Coins size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{expense.label}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {expense.category} {expense.due_date && `• ${expense.due_date}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Réglé / Total</p>
                        <p className="text-sm font-black text-slate-800 font-ui">
                          {formatPrice(expense.amount_paid)} / <span className="text-amber-600">{formatPrice(expense.amount_actual)}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingExpense(expense)} className="p-2 text-slate-300 hover:text-amber-600 transition-colors"><Edit3 size={18}/></button>
                        <button onClick={() => deleteExpense(expense.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {expenses.length === 0 && (
                <p className="text-xs text-slate-400 font-medium italic pt-2">Aucune dépense enregistrée.</p>
              )}
            </div>

            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl h-fit sticky top-40">
              <h3 className="font-luxury text-2xl mb-8 italic text-amber-400">Répartition</h3>
              <div className="space-y-6">
                {categories.map(cat => {
                  const catTotal = expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + (curr.amount_actual || 0), 0);
                  const percent = totalActual > 0 ? (catTotal / totalActual) * 100 : 0;
                  if (catTotal === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                        <span>{cat}</span>
                        <span>{formatPrice(catTotal)}</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full bg-amber-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* --- STRATÉGIE DE ZONE D'IMPRESSION AVEC MUTLI-PAGE FOOTER COMPATIBLE CHROMIUM --- */}
      <div className="pure-print-wrapper">
        <table className="print-master-table">
          {/* Le corps du master table contient tout le rapport */}
          <tbody>
            <tr>
              <td className="print-master-content">
                
                {/* EN-TÊTE DU RAPPORT */}
                <div className="print-header">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', padding: 0 }}>
                          <h1 className="text-3xl font-luxury text-slate-900" style={{ margin: 0, padding: 0 }}>
                            {marriage?.partner_1_name || 'Gudo'} & {marriage?.partner_2_name || 'Majo'}
                          </h1>
                          <p className="text-xs text-amber-700 font-bold uppercase tracking-wider" style={{ margin: '4px 0 0 0' }}>
                            Rapport Budgétaire Complet — Édition Premium
                          </p>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '12px', color: '#64748b', border: 'none', padding: 0 }}>
                          <p style={{ margin: 0 }}>Généré le : {new Date().toLocaleDateString('fr-FR')}</p>
                          <p style={{ margin: '2px 0 0 0' }}>Devise d'édition : {currency}</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div className="print-grid">
                    <div className="print-grid-col">
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', display: 'block' }}>Budget Estimé</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{formatPrice(totalEstimated)}</span>
                    </div>
                    <div className="print-grid-col" style={{ borderLeft: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', display: 'block' }}>Total Facturé</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#b45309' }}>{formatPrice(totalActual)}</span>
                    </div>
                    <div className="print-grid-col" style={{ borderLeft: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', display: 'block' }}>Montant Réglé</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#15803d' }}>{formatPrice(totalPaid)}</span>
                    </div>
                    <div className="print-grid-col" style={{ borderLeft: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', display: 'block' }}>Reste à Payer</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#b91c1c' }}>{formatPrice(totalRemaining)} ({100 - paymentPercentage}% restant)</span>
                    </div>
                  </div>
                </div>

                {/* BOUCLE DES CATÉGORIES ET DES TABLEAUX DE DÉPENSES */}
                {categories.map((cat) => {
                  const catExpenses = expenses.filter(e => e.category === cat);
                  if (catExpenses.length === 0) return null;

                  const catActual = catExpenses.reduce((sum, e) => sum + (e.amount_actual || 0), 0);
                  const catPaid = catExpenses.reduce((sum, e) => sum + (e.amount_paid || 0), 0);

                  return (
                    <div key={cat} className="print-card">
                      <table style={{ width: '100%', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '6px', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: 'none', padding: 0 }}><h3 className="text-sm font-bold font-luxury tracking-wide text-slate-800" style={{ margin: 0 }}>{cat}</h3></td>
                            <td style={{ textAlign: 'right', fontSize: '11px', color: '#475569', fontWeight: 500, border: 'none', padding: 0 }}>
                              Réglé : {formatPrice(catPaid)} / {formatPrice(catActual)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <table className="print-table">
                        <thead>
                          <tr>
                            <th>Désignation des dépenses</th>
                            <th>Montant Estimé</th>
                            <th>Montant Facturé</th>
                            <th>Montant Payé</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catExpenses.map((exp) => (
                            <tr key={exp.id}>
                              <td className="font-medium">{exp.label}</td>
                              <td>{formatPrice(exp.amount_estimated || 0)}</td>
                              <td className="font-semibold">{formatPrice(exp.amount_actual || 0)}</td>
                              <td style={{ color: '#166534', fontWeight: '600' }}>{formatPrice(exp.amount_paid || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

              </td>
            </tr>
          </tbody>

          {/* LA PIÈCE MAÎTRESSE : Le tfoot du tableau maître dit au navigateur de répéter ceci en bas de CHAQUE PAGE */}
          <tfoot className="print-master-footer">
            <tr>
              <td>
                <div className="print-footer-content">
                  <table className="print-footer-table" style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'left', fontWeight: 'bold', color: '#0f172a', border: 'none', padding: 0 }}>WeddingStudio</td>
                        <td style={{ textAlign: 'center', border: 'none', padding: 0 }}>contact@weddingstudio.com</td>
                        <td style={{ textAlign: 'right', border: 'none', padding: 0 }}>+225 07 00 00 00 00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* MODAL AJOUT */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 print:hidden">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[3rem] p-10 w-full max-w-2xl border border-amber-100 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600"><X size={24}/></button>
              <h3 className="text-3xl font-luxury text-center mb-10 italic">Nouvelle dépense</h3>
              <form onSubmit={handleAddExpense} className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Désignation *</label>
                  <input required className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm outline-none border border-transparent focus:bg-white focus:ring-1 focus:ring-amber-400" placeholder="Ex: Décoration Florale" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Catégorie</label>
                  <select className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm outline-none appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Statut</label>
                  <select className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm outline-none appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Estimé (FCFA)</label>
                  <input type="number" className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm" value={formData.amount_estimated} onChange={e => setFormData({...formData, amount_estimated: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Réel (FCFA)</label>
                  <input type="number" className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm" value={formData.amount_actual} onChange={e => setFormData({...formData, amount_actual: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2"><User size={10}/> Prestataire</label>
                  <input className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm" placeholder="Nom" value={formData.vendor_name} onChange={e => setFormData({...formData, vendor_name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2"><Phone size={10}/> Contact</label>
                  <input className="w-full bg-slate-50 rounded-2xl p-4 font-bold text-sm" placeholder="Tél / Email" value={formData.vendor_contact} onChange={e => setFormData({...formData, vendor_contact: e.target.value})} />
                </div>
                <div className="col-span-2 pt-4">
                  <button type="submit" disabled={actionLoading} className="w-full bg-slate-900 text-white py-5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-amber-600 transition-all disabled:opacity-50">
                    {actionLoading ? "Enregistrement..." : "Enregistrer la dépense"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDITION */}
      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 print:hidden">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-[3rem] p-12 w-full max-w-xl border border-amber-100 relative">
              <button onClick={() => setEditingExpense(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600"><X size={24}/></button>
              <h3 className="text-3xl font-luxury text-center mb-10 italic">Mise à jour paiement</h3>
              <form onSubmit={handleUpdateExpense} className="space-y-6">
                <div className="bg-amber-50 p-8 rounded-[2rem] flex items-center justify-between border border-amber-100">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">À régler</p>
                    <p className="text-2xl font-luxury text-slate-900">{formatPrice(editingExpense.amount_actual)}</p>
                  </div>
                  <button type="button" onClick={() => setEditingExpense({...editingExpense, amount_paid: editingExpense.amount_actual})} className="bg-white text-amber-600 px-6 py-3 rounded-full text-[10px] font-black uppercase shadow-sm border border-amber-200 hover:bg-amber-600 hover:text-white transition-all">Tout payer</button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest block">Montant versé (FCFA)</label>
                  <input type="number" className="w-full bg-slate-50 rounded-2xl p-6 font-bold text-2xl text-amber-600 outline-none focus:ring-2 focus:ring-amber-100 transition-all" value={editingExpense.amount_paid} onChange={e => setEditingExpense({...editingExpense, amount_paid: e.target.value})} />
                </div>
                <button type="submit" disabled={actionLoading} className="w-full bg-amber-500 text-white py-6 rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 disabled:opacity-50">
                  <Save size={18}/> {actionLoading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}