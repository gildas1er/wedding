"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Printer, ArrowLeft, CheckCircle2, Clock, 
  Heart, Briefcase, Landmark, Cross, GlassWater, 
  Crown, Sparkles, Layers
} from 'lucide-react';

// Configuration des 10 rapports d'impression
const PRINT_REPORTS = [
  {
    id: 'confirmed',
    title: '1. Invités Confirmés',
    description: 'Liste de tous les invités ayant confirmé leur présence.',
    icon: CheckCircle2,
    filter: (g: any) => g.status === 'confirmé'
  },
  {
    id: 'friends',
    title: '2. Liste des Amis',
    description: 'Tous les proches enregistrés dans la catégorie Amis.',
    icon: Sparkles,
    filter: (g: any) => g.category === 'amis'
  },
  {
    id: 'colleagues',
    title: '3. Liste des Collègues',
    description: 'Tous les invités professionnels / collègues.',
    icon: Briefcase,
    filter: (g: any) => g.category === 'collègues'
  },
  {
    id: 'pending',
    title: '4. Invités en Attente',
    description: 'Liste des personnes n\'ayant pas encore répondu au RSVP.',
    icon: Clock,
    filter: (g: any) => g.status === 'en_attente'
  },
  {
    id: 'groom_parents',
    title: '5. Parents - Côté Marié',
    description: 'Famille et parents rattachés au marié.',
    icon: Heart,
    filter: (g: any) => g.category === 'parents' && g.side === 'partenaire_1'
  },
  {
    id: 'bride_parents',
    title: '6. Parents - Côté Mariée',
    description: 'Famille et parents rattachés à la mariée.',
    icon: Heart,
    filter: (g: any) => g.category === 'parents' && g.side === 'partenaire_2'
  },
  {
    id: 'civil',
    title: '7. Cérémonie Civile (Mairie)',
    description: 'Invités confirmés présents à la Mairie.',
    icon: Landmark,
    filter: (g: any) => g.status === 'confirmé' && g.attending_civil
  },
  {
    id: 'church',
    title: '8. Cérémonie Religieuse',
    description: 'Invités confirmés présents à l\'Église/Lieu de culte.',
    icon: Cross,
    filter: (g: any) => g.status === 'confirmé' && g.attending_church
  },
  {
    id: 'dinner',
    title: '9. Dîner / Réception',
    description: 'Invités confirmés présents au Dîner.',
    icon: GlassWater,
    filter: (g: any) => g.status === 'confirmé' && g.attending_reception
  },
  {
    id: 'full_presence',
    title: '10. Présents à TOUTES les Cérémonies',
    description: 'Invités confirmés présents à la Mairie, l\'Église ET au Dîner.',
    icon: Layers,
    filter: (g: any) => g.status === 'confirmé' && g.attending_civil && g.attending_church && g.attending_reception
  }
];

export default function PrintPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<any[]>([]);
  const [marriage, setMarriage] = useState<any>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>('confirmed');

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: marriageData } = await supabase
      .from('marriages')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (marriageData) {
      setMarriage(marriageData);
      const { data: guestsData } = await supabase
        .from('invite')
        .select('*')
        .eq('marriage_id', marriageData.id)
        .order('name', { ascending: true });

      setGuests(guestsData || []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeReport = PRINT_REPORTS.find(r => r.id === selectedReportId) || PRINT_REPORTS[0];
  const filteredGuests = guests.filter(activeReport.filter);
  const totalCount = filteredGuests.reduce((acc, g) => acc + (g.guests_count || 1), 0);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
        <p className="mt-4 font-bold text-rose-500">Préparation du centre d'impression...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B]" style={{ fontFamily: '"DM Sans", sans-serif' }}>
      
      {/* CSS SPÉCIFIQUE À L'IMPRESSION */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            padding: 10px 14px !important;
            border-bottom: 1px solid #CBD5E1 !important;
            font-size: 11pt !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* EN-TÊTE ET NAVIGATION (MASQUÉS À L'IMPRESSION) */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard/guests')}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-colors"
              title="Retour à la liste"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Printer className="text-rose-500" size={22} />
                Centre d'Impression des Listes
              </h1>
              <p className="text-xs text-slate-400 font-bold">Sélectionnez la liste souhaitée puis lancez l'impression</p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-900 hover:bg-rose-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg transition-all"
          >
            <Printer size={18} />
            <span>Imprimer la liste actuelle</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* MENU DE SÉLECTION DE LA LISTE (MASQUÉ À L'IMPRESSION) */}
        <aside className="no-print lg:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm mb-4">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              10 Listes Disponibles
            </h2>
            <p className="text-xs text-slate-500 mt-1">Cliquez sur un lien pour afficher l'aperçu avant impression.</p>
          </div>

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {PRINT_REPORTS.map((report) => {
              const Icon = report.icon;
              const isSelected = selectedReportId === report.id;
              const reportCount = guests.filter(report.filter).reduce((acc, g) => acc + (g.guests_count || 1), 0);

              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    isSelected 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]' 
                      : 'bg-white text-slate-700 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm truncate">{report.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                        isSelected ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {reportCount}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 font-medium line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      {report.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* APERÇU ET DOCUMENT PRÊT À L'IMPRESSION */}
        <main className="lg:col-span-8">
          <div className="print-area bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-sm min-h-[800px] flex flex-col justify-between">
            
            <div>
              {/* EN-TÊTE DE LA LISTE D'IMPRESSION */}
              <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                <div>
                  <div className="text-xs font-black uppercase text-rose-500 tracking-[0.2em] mb-1">
                    {marriage?.title || "Célébration de Mariage"}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    {activeReport.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {activeReport.description}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-3xl font-black text-slate-900">{totalCount}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Personne{totalCount > 1 ? 's' : ''} au total
                  </div>
                </div>
              </div>

              {/* TABLEAU DES INVITÉS */}
              {filteredGuests.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  Aucun invité ne correspond actuellement à cette liste.
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="py-3 px-3 w-12">#</th>
                      <th className="py-3 px-3">Nom & Prénom</th>
                      <th className="py-3 px-3 text-center w-32">Côté</th>
                      <th className="py-3 px-3 text-right w-28">Nombre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredGuests.map((guest, idx) => (
                      <tr key={guest.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-3 font-bold text-slate-400 text-xs">{idx + 1}</td>
                        <td className="py-3.5 px-3 font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            {guest.is_vip && <Crown size={14} className="text-amber-500 fill-amber-400 shrink-0" />}
                            <span>{guest.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded border border-slate-200 text-slate-600">
                            {guest.side === 'partenaire_1' ? 'Marié' : guest.side === 'partenaire_2' ? 'Mariée' : 'Commun'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-slate-800">
                          x{guest.guests_count || 1}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* PIED DE PAGE D'IMPRESSION */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Édité le {new Date().toLocaleDateString('fr-FR')}</span>
              <span>Document officiel d'organisation</span>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}