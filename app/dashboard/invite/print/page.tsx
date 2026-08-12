"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Printer, ArrowLeft, CheckCircle2, Clock, 
  Heart, Briefcase, Landmark, Cross, GlassWater, 
  Crown, Sparkles, Layers
} from 'lucide-react';

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
      .select('id, title, partner1_name, partner2_name')
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

  // Construction du nom des mariés
  const coupleNames = marriage?.partner1_name && marriage?.partner2_name
    ? `${marriage.partner1_name} & ${marriage.partner2_name}`
    : marriage?.title || "Mariage";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* RÈGLES D'IMPRESSION STRICTES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 15mm 12mm;
          }

          body {
            background: white !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .print-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }

          table.print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }

          thead.print-header {
            display: table-header-group !important;
          }

          tfoot.print-footer {
            display: table-footer-group !important;
          }

          tr.print-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .page-number::after {
            content: "Page " counter(page) " / " counter(pages);
          }
        }
      `}</style>

      {/* PANNEAU DE NAVIGATION (ECRAN UNIQUEMENT) */}
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
              <p className="text-xs text-slate-500 font-bold">Sélectionnez la liste souhaitée puis lancez l'impression</p>
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
        
        {/* SÉLECTEUR DE LISTE (ECRAN UNIQUEMENT) */}
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

        {/* ZONE D'IMPRESSION ET APERÇU */}
        <main className="lg:col-span-8">
          <div className="print-container bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 shadow-sm w-full">
            
            <table className="print-table w-full text-left border-collapse">
              
              {/* EN-TÊTE RÉPÉTÉE SUR TOUTES LES PAGES */}
              <thead className="print-header">
                <tr>
                  <th colSpan={4} className="p-0 font-normal">
                    <div className="border-b-2 border-slate-900 pb-4 mb-6">
                      {/* LIGNE DU NOM DES MARIÉS */}
                      <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-200">
                        <span className="text-base font-black tracking-wide text-rose-600 uppercase">
                          {coupleNames}
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          Liste Officielle
                        </span>
                      </div>

                      {/* TITRE ET TOTAL */}
                      <div className="flex justify-between items-end gap-4">
                        <div>
                          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                            {activeReport.title}
                          </h2>
                          <p className="text-xs text-slate-600 font-medium mt-1">
                            {activeReport.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-3xl font-black text-slate-900 leading-none">{totalCount}</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                            Personnes au total
                          </div>
                        </div>
                      </div>
                    </div>
                  </th>
                </tr>

                {/* COLONNES DU TABLEAU */}
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-wider">
                  <th className="py-3 px-3 w-[12%] text-left">#</th>
                  <th className="py-3 px-3 w-[53%] text-left">Nom & Prénom</th>
                  <th className="py-3 px-3 w-[20%] text-center">Côté</th>
                  <th className="py-3 px-3 w-[15%] text-right">Nombre</th>
                </tr>
              </thead>

              {/* PIED DE PAGE RÉPÉTÉ SUR TOUTES LES PAGES */}
              <tfoot className="print-footer">
                <tr>
                  <td colSpan={4} className="p-0 font-normal">
                    <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <span>Édité le {new Date().toLocaleDateString('fr-FR')}</span>
                      <span>{coupleNames}</span>
                      <span className="page-number"></span>
                    </div>
                  </td>
                </tr>
              </tfoot>

              {/* CONTENU DE LA LISTE */}
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 font-bold italic bg-slate-50/50">
                      Aucun invité ne correspond à cette liste.
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((guest, idx) => (
                    <tr key={guest.id} className="print-row hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-500 text-xs">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {guest.is_vip && <Crown size={14} className="text-amber-500 fill-amber-400 shrink-0" />}
                          <span>{guest.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-800 inline-block">
                          {guest.side === 'partenaire_1' ? 'Marié' : guest.side === 'partenaire_2' ? 'Mariée' : 'Commun'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        x{guest.guests_count || 1}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>

          </div>
        </main>

      </div>
    </div>
  );
}