"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { useRouter } from 'next/navigation';
import { 
  Plus, DollarSign,
  AlertCircle, CheckCircle2, Calendar, 
  Wallet, Trash2, X, Edit3, Save, Coins,
  User, Phone, Printer
} from 'lucide-react';

// --- COMPOSANT DES PÉTALES ROUGES ---
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
  const [editor, setEditor] = useState<{ id: string | null; values: ExpenseForm } | null>(null);
  const { confirm, notify } = useConfirm();

  const categories = [
    'Réception & Traiteur', 
    'Déco & Audiovisuel', 
    'Tenues & Beauté', 
    'Cérémonie & Mairie', 
    'Logistique & Cortège', 
    "Fonds d'Imprévus", 
    'Autre'
  ];

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

  const openAdd = () => setEditor({ id: null, values: { ...EMPTY_FORM } });
  const openEdit = (expense: any) => setEditor({
    id: expense.id,
    values: {
      label: expense.label ?? '',
      category: expense.category ?? categories[0],
      status: expense.status ?? 'À planifier',
      amount_estimated: expense.amount_estimated ? String(expense.amount_estimated) : '',
      amount_actual: expense.amount_actual ? String(expense.amount_actual) : '',
      amount_paid: expense.amount_paid ? String(expense.amount_paid) : '',
      due_date: expense.due_date ?? '',
      vendor_name: expense.vendor_name ?? '',
      vendor_contact: expense.vendor_contact ?? '',
      notes: expense.notes ?? '',
    },
  });

  const handleSaveExpense = async (values: ExpenseForm) => {
    if (!editor) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      if (!marriage?.id) throw new Error("ID du mariage introuvable.");
      const amountActual = parseFloat(values.amount_actual) || 0;
      const amountPaid = parseFloat(values.amount_paid) || 0;
      const payload = {
        label: values.label.trim(),
        category: values.category,
        status: deriveStatus(values.status, amountActual, amountPaid),
        amount_estimated: parseFloat(values.amount_estimated) || 0,
        amount_actual: amountActual,
        amount_paid: amountPaid,
        vendor_name: values.vendor_name.trim() || null,
        vendor_contact: values.vendor_contact.trim() || null,
        due_date: values.due_date || null,
        notes: values.notes.trim() || null,
      };

      if (editor.id) {
        const { data, error } = await supabase.from('budget_items').update(payload).eq('id', editor.id).select().single();
        if (error) throw error;
        setExpenses((prev) => prev.map((ex) => (ex.id === editor.id ? data : ex)));
      } else {
        const { data, error } = await supabase.from('budget_items').insert([{ ...payload, marriage_id: marriage.id }]).select().single();
        if (error) throw error;
        setExpenses((prev) => [data, ...prev]);
      }
      setEditor(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    const expense = expenses.find((ex) => ex.id === id);
    if (!(await confirm({ title: 'Supprimer cette dépense ?', item: expense?.label, message: 'Ses montants seront retirés du total de votre budget.' }))) return;
    const { error } = await supabase.from('budget_items').delete().eq('id', id);
    if (!error) { setExpenses((prev) => prev.filter(ex => ex.id !== id)); setEditor(null); notify('Dépense supprimée'); }
    else notify('La suppression a échoué. Réessayez.', 'error');
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
      <div className="h-screen flex items-center justify-center bg-ivory">
        <div className="w-8 h-8 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory font-ui w-full relative overflow-x-hidden">
      {/* FEUILLE DE STYLE MULTI-PAGES D'IMPRESSION AVEC LE REPETITEUR HTML TFOOT */}
      <style dangerouslySetInnerHTML={{ __html: `
        
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


      {/* MESSAGES D'ERREUR */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-sm font-bold print:hidden">
            <AlertCircle size={18} /> {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="ml-2 hover:opacity-50"><X size={16}/></button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* SECTION VUE ÉCRAN */}
      <div className="relative z-10 screen-only-section">
        
        {/* EN-TÊTE ÉCRAN */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-amber-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 px-4 sm:px-8 lg:px-12 py-4 md:h-28 md:py-0 lg:sticky lg:top-0 z-30">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-luxury text-slate-900 break-words">
                {marriage?.partner_1_name || 'Partenaire 1'} <span className="text-amber-500 italic">&</span> {marriage?.partner_2_name || 'Partenaire 2'}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mt-1 flex items-center gap-2">
                <Calendar size={12} /> {marriage?.wedding_date ? new Date(marriage.wedding_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date à définir'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="bg-white/80 border border-amber-100 rounded-full p-1 flex shadow-sm">
              {['FCFA', 'EUR', 'USD'].map((curr) => (
                <button key={curr} onClick={() => setCurrency(curr)} className={`px-3 sm:px-4 py-2 rounded-full text-[10px] font-black transition-all ${currency === curr ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{curr}</button>
              ))}
            </div>

            <button onClick={handlePrint} className="bg-slate-100 text-slate-700 hover:bg-slate-200 p-4 rounded-full shadow-sm transition-all flex items-center justify-center" title="Imprimer le budget">
              <Printer size={18} />
            </button>

            <button onClick={openAdd} className="bg-amber-500 text-white px-5 sm:px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all flex items-center gap-3">
              <Plus size={16} /> Ajouter une dépense
            </button>
          </div>
        </header>

        {/* CONTENU TABLEAU DE BORD ÉCRAN */}
        <main className="max-w-6xl mx-auto p-4 sm:p-8 lg:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-12">
            {[
              { label: 'Budget Prévu', val: totalEstimated, color: 'text-slate-900', icon: <Wallet size={18}/> },
              { label: 'Total Facturé', val: totalActual, color: 'text-amber-600', icon: <DollarSign size={18}/> },
              { label: 'Reste à régler', val: totalRemaining, color: 'text-red-500', icon: <AlertCircle size={18}/> }
            ].map((stat, i) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[1.75rem] border border-amber-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">{stat.icon}</div>
                </div>
                <h2 className={`text-2xl sm:text-3xl font-luxury break-words ${stat.color}`}>{formatPrice(stat.val)}</h2>
              </motion.div>
            ))}
          </div>

          <div className="bg-white/80 backdrop-blur-md p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] border border-amber-100 shadow-sm mb-8 sm:mb-12 relative overflow-hidden">
            <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
              <h3 className="font-luxury text-xl italic text-slate-800">Progression des règlements</h3>
              <span className="bg-amber-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {paymentPercentage}% Payé
              </span>
            </div>
            <div className="h-3 bg-slate-50 rounded-full border border-slate-100 p-0.5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${paymentPercentage}%` }} className="h-full bg-gradient-to-r from-amber-300 to-amber-600 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2 space-y-4">
              {expenses.map((expense) => {
                const isPaid = expense.status === 'Payé' || (expense.amount_paid >= expense.amount_actual && expense.amount_actual > 0);
                return (
                  <motion.div layout key={expense.id} className="bg-white p-4 sm:p-6 rounded-3xl border border-amber-50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-300 transition-all group">
                    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                      <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isPaid ? <CheckCircle2 size={20} /> : <Coins size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{expense.label}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {expense.category} {expense.due_date && `• échéance ${formatDate(expense.due_date)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8">
                      <div className="sm:text-right">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Réglé / Total</p>
                        <p className="text-sm font-black text-slate-800 font-ui">
                          {formatPrice(expense.amount_paid)} / <span className="text-amber-600">{formatPrice(expense.amount_actual)}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(expense)} aria-label="Modifier la dépense" className="p-2 text-slate-300 hover:text-amber-600 transition-colors"><Edit3 size={18}/></button>
                        <button onClick={() => deleteExpense(expense.id)} aria-label="Supprimer la dépense" className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {expenses.length === 0 && (
                <p className="text-xs text-slate-400 font-medium italic pt-2">Aucune dépense enregistrée.</p>
              )}
            </div>

            <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 text-white shadow-2xl h-fit lg:sticky lg:top-40">
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
                          <p style={{ margin: '2px 0 0 0' }}>Devise d&apos;édition : {currency}</p>
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

      {/* FORMULAIRE DÉPENSE (ajout et modification) */}
      <AnimatePresence>
        {editor && (
          <ExpenseModal
            key={editor.id ?? 'new'}
            isEdit={Boolean(editor.id)}
            initial={editor.values}
            categories={categories}
            saving={actionLoading}
            onClose={() => setEditor(null)}
            onSave={handleSaveExpense}
            onDelete={editor.id ? () => deleteExpense(editor.id as string) : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
// --- FORMULAIRE DÉPENSE : le même pour l'ajout et la modification ---
const STATUSES = ['À planifier', 'En cours', 'Payé'];

type ExpenseForm = {
  label: string; category: string; status: string;
  amount_estimated: string; amount_actual: string; amount_paid: string;
  due_date: string; vendor_name: string; vendor_contact: string; notes: string;
};

const EMPTY_FORM: ExpenseForm = {
  label: '', category: 'Réception & Traiteur', status: 'À planifier',
  amount_estimated: '', amount_actual: '', amount_paid: '',
  due_date: '', vendor_name: '', vendor_contact: '', notes: '',
};

// Le statut suit les montants : tout réglé => Payé ; « Payé » sans le paiement complet => En cours / À planifier
function deriveStatus(status: string, actual: number, paid: number) {
  if (actual > 0 && paid >= actual) return 'Payé';
  if (status === 'Payé') return paid > 0 ? 'En cours' : 'À planifier';
  if (status === 'À planifier' && paid > 0) return 'En cours';
  return status;
}

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;

const labelCls = 'ml-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400';
const inputCls = 'w-full min-w-0 rounded-2xl border border-transparent bg-slate-50 p-4 text-sm font-bold text-slate-800 outline-none transition-colors focus:border-amber-300 focus:bg-white';

function ExpenseModal({ isEdit, initial, categories, saving, onClose, onSave, onDelete }: {
  isEdit: boolean;
  initial: ExpenseForm;
  categories: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (values: ExpenseForm) => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState<ExpenseForm>(initial);
  const set = (patch: Partial<ExpenseForm>) => setV((prev) => ({ ...prev, ...patch }));

  const actual = parseFloat(v.amount_actual) || 0;
  const paid = parseFloat(v.amount_paid) || 0;
  const remaining = Math.max(0, actual - paid);

  const changeStatus = (status: string) => {
    // Choisir « Payé » remplit le montant réglé avec le montant facturé
    if (status === 'Payé' && actual > 0) set({ status, amount_paid: String(actual) });
    else set({ status });
  };

  const amountField = (key: 'amount_estimated' | 'amount_actual' | 'amount_paid', label: string) => (
    <div className="min-w-0 space-y-1">
      <label htmlFor={key} className={labelCls}>{label}</label>
      <input
        id={key}
        type="number"
        inputMode="numeric"
        min={0}
        step="any"
        placeholder="0"
        className={inputCls.replace('bg-slate-50', 'bg-white')}
        value={v[key]}
        onChange={(e) => {
          const next = { [key]: e.target.value } as Partial<ExpenseForm>;
          const a = key === 'amount_actual' ? parseFloat(e.target.value) || 0 : actual;
          const p = key === 'amount_paid' ? parseFloat(e.target.value) || 0 : paid;
          set({ ...next, status: deriveStatus(v.status, a, p) });
        }}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 backdrop-blur-md sm:items-center sm:p-4 print:hidden">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-title"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[1.75rem] border border-amber-100 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[2rem] sm:p-10"
      >
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 p-2 text-slate-300 hover:text-slate-600 sm:right-6 sm:top-6"><X size={22} /></button>
        <h3 id="expense-title" className="mb-6 text-center font-luxury text-2xl italic sm:mb-8 sm:text-3xl">{isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}</h3>

        <form onSubmit={(e) => { e.preventDefault(); onSave(v); }} className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="label" className={labelCls}>Désignation *</label>
            <input id="label" required autoFocus={!isEdit} className={inputCls} placeholder="Ex : Décoration florale" value={v.label} onChange={(e) => set({ label: e.target.value })} />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="category" className={labelCls}>Catégorie</label>
            <select id="category" className={`${inputCls} appearance-none`} value={v.category} onChange={(e) => set({ category: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="status" className={labelCls}>Statut</label>
            <select id="status" className={`${inputCls} appearance-none`} value={v.status} onChange={(e) => changeStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Montants */}
          <div className="grid grid-cols-1 gap-4 rounded-[1.5rem] border border-amber-100 bg-amber-50/50 p-4 sm:col-span-2 sm:grid-cols-3 sm:p-5">
            {amountField('amount_estimated', 'Estimé (FCFA)')}
            {amountField('amount_actual', 'Facturé (FCFA)')}
            {amountField('amount_paid', 'Déjà réglé (FCFA)')}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-3">
              <p className="text-sm text-slate-600">
                {actual > 0 && remaining === 0
                  ? <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700"><CheckCircle2 size={16} /> Entièrement réglé</span>
                  : <>Reste à régler : <strong className="text-slate-900">{fcfa(remaining)}</strong></>}
              </p>
              {actual > 0 && remaining > 0 && (
                <button type="button" onClick={() => set({ amount_paid: String(actual), status: 'Payé' })} className="min-h-[40px] rounded-full border border-amber-200 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-amber-700 shadow-sm transition-colors hover:bg-amber-600 hover:text-white">
                  Tout réglé
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-1">
            <label htmlFor="due_date" className={labelCls}><Calendar size={10} /> Échéance</label>
            <input id="due_date" type="date" className={inputCls} value={v.due_date} onChange={(e) => set({ due_date: e.target.value })} />
          </div>
          <div className="min-w-0 space-y-1">
            <label htmlFor="vendor_name" className={labelCls}><User size={10} /> Prestataire</label>
            <input id="vendor_name" className={inputCls} placeholder="Nom" value={v.vendor_name} onChange={(e) => set({ vendor_name: e.target.value })} />
          </div>
          <div className="min-w-0 space-y-1 sm:col-span-2">
            <label htmlFor="vendor_contact" className={labelCls}><Phone size={10} /> Contact du prestataire</label>
            <input id="vendor_contact" className={inputCls} placeholder="Téléphone ou e-mail" value={v.vendor_contact} onChange={(e) => set({ vendor_contact: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="notes" className={labelCls}>Notes</label>
            <textarea id="notes" rows={3} className={`${inputCls} resize-none`} placeholder="Acompte versé, conditions, rappel…" value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row">
            {onDelete && (
              <button type="button" onClick={onDelete} className="flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-red-100 px-6 text-[10px] font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-50">
                <Trash2 size={16} /> Supprimer
              </button>
            )}
            <button type="submit" disabled={saving} className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-xl transition-colors hover:bg-amber-600 disabled:opacity-50">
              <Save size={16} /> {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer la dépense'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
