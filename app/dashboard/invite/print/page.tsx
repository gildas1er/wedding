"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { PRINT_REPORTS, DEFAULT_REPORT_ID } from '../../../../lib/print-reports';
import { 
  Printer, ArrowLeft, CheckCircle2, Clock, 
  Heart, Briefcase, Landmark, Cross, GlassWater, 
  Crown, Sparkles, Layers, Edit3,
  LayoutDashboard, MessageSquare, Users, Send, UtensilsCrossed,
  ClipboardList, Wallet, Menu, X
} from 'lucide-react';

export default function PrintPage() {
  return (
    <Suspense fallback={null}>
      <PrintContent />
    </Suspense>
  );
}

function PrintContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<any[]>([]);
  const [coupleTitle, setCoupleTitle] = useState<string>('');
  // ?report=dinner ouvre directement la liste demandée (liens de l'onglet Export)
  const searchParams = useSearchParams();
  const requestedReport = searchParams.get('report');
  const [selectedReportId, setSelectedReportId] = useState<string>(
    PRINT_REPORTS.some((r) => r.id === requestedReport) ? requestedReport! : DEFAULT_REPORT_ID
  );

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: marriageData } = await supabase
        .from('marriages')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (marriageData) {
        const p1 = marriageData.partner1_name || marriageData.partner_1_name || marriageData.groom_name || '';
        const p2 = marriageData.partner2_name || marriageData.partner_2_name || marriageData.bride_name || '';
        
        if (p1 && p2) {
          setCoupleTitle(`${p1} & ${p2}`);
        } else if (marriageData.title && marriageData.title.toLowerCase() !== 'mariage') {
          setCoupleTitle(marriageData.title);
        }
      }

      const guestsResponse = marriageData?.id
        ? await supabase.from('invite').select('*').eq('marriage_id', marriageData.id)
        : { data: null };

      if (guestsResponse.data) {
        setGuests(guestsResponse.data);
      }
    } catch (err) {
      console.error("Erreur de chargement des données :", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeReport = PRINT_REPORTS.find(r => r.id === selectedReportId) || PRINT_REPORTS[0];
  const filteredGuests = guests.filter(activeReport.filter);
  const totalCount = filteredGuests.reduce((acc, g) => acc + (Number(g.guests_count || g.count || 1)), 0);

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanTitle = `${coupleTitle} - ${activeReport.title}`.replace(/[^a-zA-Z0-9 -]/g, "");
    document.title = cleanTitle;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
        <p className="mt-4 font-bold text-rose-500">Chargement des données...</p>
      </div>
    );
  }

  const displayName = coupleTitle || "Notre mariage";

  return (
    <div className="min-h-screen bg-ivory text-slate-900 flex flex-col">
      
      {/* CSS D'IMPRESSION STRICT A4 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body * {
            visibility: hidden !important;
          }

          .print-area, .print-area * {
            visibility: visible !important;
          }

          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }

          table.print-table {
            width: 100% !important;
            max-width: 100% !important;
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
        }
      `}</style>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* HEADER RESPONSIVE (no-print) */}
        <header className="no-print bg-white border-b border-slate-200 lg:sticky lg:top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/dashboard/invite')}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-colors hidden sm:block"
                title="Retour à la liste"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <h1 className="text-lg sm:text-xl font-normal text-slate-900 tracking-tight flex items-center gap-2">
                  <Printer className="text-rose-500 shrink-0" size={22} />
                  Centre d'Impression
                </h1>
                <p className="text-xs text-slate-500 font-bold hidden sm:block">Sélectionnez la liste souhaitée puis lancez l'impression</p>
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-rose-600 text-white font-black px-5 py-3 rounded-2xl shadow-lg transition-all"
            >
              <Printer size={18} />
              <span>Imprimer la liste</span>
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full">
          
          {/* MENU SELECTION LISTES (no-print) */}
          <aside className="no-print lg:col-span-4 space-y-3">
            
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
              <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Edit3 size={14} className="text-rose-500" />
                Nom des Mariés
              </label>
              <input 
                type="text" 
                value={coupleTitle} 
                onChange={(e) => setCoupleTitle(e.target.value)}
                placeholder="Ex: AWA & YAO"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
              <h2 className="font-sans text-xs font-black uppercase text-slate-400 tracking-wider">
                10 Listes Disponibles
              </h2>
              <p className="text-xs text-slate-500 mt-1">Cliquez sur une liste pour mettre à jour l'aperçu.</p>
            </div>

            <div className="space-y-2 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto pr-1">
              {PRINT_REPORTS.map((report) => {
                const Icon = report.icon;
                const isSelected = selectedReportId === report.id;
                const reportCount = guests.filter(report.filter).reduce((acc, g) => acc + (Number(g.guests_count || g.count || 1)), 0);

                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                      isSelected 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
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

          {/* APERÇU ET ZONE D'IMPRESSION RESPONSIVE */}
          <main className="lg:col-span-8 w-full overflow-x-auto">
            <div className="print-area bg-white border border-slate-200 rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 md:p-8 shadow-sm min-w-[320px] w-full">
              
              <table className="print-table w-full text-left border-collapse">
                
                {/* EN-TÊTE RÉPÉTÉE */}
                <thead className="print-header">
                  <tr>
                    <th colSpan={4} className="p-0 font-normal">
                      <div className="border-b-2 border-slate-900 pb-3 mb-4">
                        
                        <div className="flex justify-between items-center pb-1.5 mb-2 border-b border-slate-200">
                          <span className="text-xs sm:text-base font-black tracking-wide text-rose-600 uppercase">
                            {displayName}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Liste Officielle
                          </span>
                        </div>

                        <div className="flex justify-between items-end gap-2 sm:gap-4">
                          <div>
                            <h2 className="text-lg sm:text-xl md:text-2xl font-normal text-slate-900 tracking-tight">
                              {activeReport.title}
                            </h2>
                            <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium mt-0.5">
                              {activeReport.description}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{totalCount}</div>
                            <div className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                              Total
                            </div>
                          </div>
                        </div>
                      </div>
                    </th>
                  </tr>

                  {/* COLONNES */}
                  <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                    <th className="py-2 px-2 w-[8%] text-left">#</th>
                    <th className="py-2 px-2 w-[48%] text-left">Nom & Prénom</th>
                    <th className="py-2 px-2 w-[29%] text-center">Côté / Catégorie</th>
                    <th className="py-2 px-2 w-[15%] text-right">Nombre</th>
                  </tr>
                </thead>

                {/* PIED DE PAGE */}
                <tfoot className="print-footer">
                  <tr>
                    <td colSpan={4} className="p-0 font-normal">
                      <div className="mt-6 pt-3 border-t border-slate-300 flex justify-between items-center text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <span>Édité le {new Date().toLocaleDateString('fr-FR')}</span>
                        <span className="hidden sm:inline">{displayName}</span>
                        <span>LISTE IMPRIMÉE</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>

                {/* DONNÉES */}
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 font-bold italic bg-slate-50/50">
                        Aucun invité ne correspond à cette liste.
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest, idx) => {
                      const sideText = guest.side === 'partenaire_1' || guest.side === 'marié' ? 'Marié' : guest.side === 'partenaire_2' || guest.side === 'mariée' ? 'Mariée' : 'Commun';
                      const categoryText = guest.category || guest.group || '';

                      return (
                        <tr key={guest.id || idx} className="print-row hover:bg-slate-50">
                          <td className="py-2 px-2 font-bold text-slate-500 text-[10px] sm:text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-2 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              {(guest.is_vip || guest.vip) && <Crown size={13} className="text-amber-500 fill-amber-400 shrink-0" />}
                              <span className="break-words">{guest.name || guest.full_name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Invité sans nom'}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="inline-flex items-center justify-center gap-1 flex-wrap">
                              <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-800 inline-block">
                                {sideText}
                              </span>

                              {categoryText && (
                                <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700 inline-block">
                                  {categoryText}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-black text-slate-900">
                            x{guest.guests_count || guest.count || 1}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

              </table>

            </div>
          </main>

        </div>
      </div>
    </div>
  );
}