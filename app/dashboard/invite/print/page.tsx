"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Printer, ArrowLeft, CheckCircle2, Clock, 
  Heart, Briefcase, Landmark, Cross, GlassWater, 
  Crown, Sparkles, Layers, Edit3,
  LayoutDashboard, MessageSquare, Users, Send, UtensilsCrossed,
  ClipboardList, Wallet
} from 'lucide-react';

const isConfirmed = (g: any) => 
  String(g.status || '').toLowerCase() === 'confirmé' || 
  String(g.status || '').toLowerCase() === 'confirme';

const PRINT_REPORTS = [
  {
    id: 'confirmed',
    title: '1. Invités Confirmés',
    description: 'Liste de tous les invités ayant confirmé leur présence.',
    icon: CheckCircle2,
    filter: (g: any) => String(g.status || '').toLowerCase() === 'confirmé' || String(g.status || '').toLowerCase() === 'confirme'
  },
  {
    id: 'friends',
    title: '2. Liste des Amis',
    description: 'Tous les proches enregistrés dans la catégorie Amis.',
    icon: Sparkles,
    filter: (g: any) => String(g.category || '').toLowerCase() === 'amis' || String(g.category || '').toLowerCase() === 'ami'
  },
  {
    id: 'colleagues',
    title: '3. Liste des Collègues',
    description: 'Tous les invités professionnels / collègues.',
    icon: Briefcase,
    filter: (g: any) => String(g.category || '').toLowerCase().includes('collègue') || String(g.category || '').toLowerCase().includes('collegue')
  },
  {
    id: 'pending',
    title: '4. Invités en Attente',
    description: 'Liste des personnes n\'ayant pas encore répondu au RSVP.',
    icon: Clock,
    filter: (g: any) => String(g.status || '').toLowerCase().includes('attente')
  },
  {
    id: 'groom_parents',
    title: '5. Parents - Côté Marié',
    description: 'Famille et parents rattachés au marié.',
    icon: Heart,
    filter: (g: any) => String(g.category || '').toLowerCase() === 'parents' && (g.side === 'partenaire_1' || g.side === 'marié' || g.side === 'marim')
  },
  {
    id: 'bride_parents',
    title: '6. Parents - Côté Mariée',
    description: 'Famille et parents rattachés à la mariée.',
    icon: Heart,
    filter: (g: any) => String(g.category || '').toLowerCase() === 'parents' && (g.side === 'partenaire_2' || g.side === 'mariée' || g.side === 'mariee')
  },
  {
    id: 'civil',
    title: '7. Cérémonie Civile (Mairie)',
    description: 'Invités confirmés présents à la Mairie.',
    icon: Landmark,
    filter: (g: any) => isConfirmed(g) && Boolean(g.attending_civil || g.civil)
  },
  {
    id: 'church',
    title: '8. Cérémonie Religieuse',
    description: 'Invités confirmés présents à l\'Église/Lieu de culte.',
    icon: Cross,
    filter: (g: any) => isConfirmed(g) && Boolean(g.attending_church || g.church)
  },
  {
    id: 'dinner',
    title: '9. Dîner / Réception',
    description: 'Invités confirmés présents au Dîner.',
    icon: GlassWater,
    filter: (g: any) => isConfirmed(g) && Boolean(g.attending_reception || g.reception || g.dinner)
  },
  {
    id: 'full_presence',
    title: '10. Présents à TOUTES les Cérémonies',
    description: 'Invités confirmés présents à la Mairie, l\'Église ET au Dîner.',
    icon: Layers,
    filter: (g: any) => isConfirmed(g) && Boolean((g.attending_civil || g.civil) && (g.attending_church || g.church) && (g.attending_reception || g.reception || g.dinner))
  }
];

export default function PrintPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guests, setGuests] = useState<any[]>([]);
  const [coupleTitle, setCoupleTitle] = useState<string>('');
  const [selectedReportId, setSelectedReportId] = useState<string>('confirmed');

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
        } else {
          setCoupleTitle("GILDAS & MARIETTE");
        }
      } else {
        setCoupleTitle("GILDAS & MARIETTE");
      }

      let guestsResponse = await supabase
        .from('invite')
        .select('*')
        .eq('user_id', user.id);

      if (!guestsResponse.data || guestsResponse.data.length === 0) {
        if (marriageData?.id) {
          guestsResponse = await supabase
            .from('invite')
            .select('*')
            .eq('marriage_id', marriageData.id);
        }
      }

      if (!guestsResponse.data || guestsResponse.data.length === 0) {
        guestsResponse = await supabase
          .from('guests')
          .select('*')
          .eq('user_id', user.id);
      }

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
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
        <p className="mt-4 font-bold text-rose-500">Chargement des données...</p>
      </div>
    );
  }

  const displayName = coupleTitle || "GILDAS & MARIETTE";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* CSS DE CORRECTION ULTIME POUR IMPRESSION A4 PLEINE PAGE */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          /* Masquer totalement ce qui n'est pas la zone d'impression */
          body * {
            visibility: hidden !important;
          }

          /* Forcer la zone d'impression à prendre 100% de la largeur du papier */
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

      {/* SIDEBAR (no-print) */}
      <aside className="no-print w-64 bg-white border-r border-slate-200 min-h-screen p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          
          <div className="px-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Wedding Studio</h2>
          </div>

          <div className="space-y-2">
            <p className="px-3 text-[11px] font-black uppercase text-slate-400 tracking-wider">
              GÉNÉRAL
            </p>
            <nav className="space-y-1">
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm bg-[#0F172A] text-white shadow-md transition-all"
              >
                <LayoutDashboard size={18} />
                <span>Tableau de bord</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard/messages')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                <MessageSquare size={18} />
                <span>Messages</span>
              </button>
            </nav>
          </div>

          <div className="space-y-2">
            <p className="px-3 text-[11px] font-black uppercase text-slate-400 tracking-wider">
              ORGANISATION
            </p>
            <nav className="space-y-1">
              <button 
                onClick={() => router.push('/dashboard/guests')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                <Users size={18} />
                <span>Liste des invités</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard/rsvp')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                <Send size={18} />
                <span>Invitations (RSVP)</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard/tables')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                <UtensilsCrossed size={18} />
                <span>Gestion des tables</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard/tasks')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                <ClipboardList size={18} />
                <span>Mes tâches</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard/budget')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                <Wallet size={18} />
                <span>Budget</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard/planning')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                <Clock size={18} />
                <span>Planning Jour J</span>
              </button>
            </nav>
          </div>

        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* HEADER D'ACTION ECRAN */}
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

        <div className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
          
          {/* MENU LATÉRAL SÉLECTION LISTE (no-print) */}
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
                placeholder="Ex: GILDAS & MARIETTE"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm mb-4">
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                10 Listes Disponibles
              </h2>
              <p className="text-xs text-slate-500 mt-1">Cliquez sur un lien pour afficher l'aperçu avant impression.</p>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {PRINT_REPORTS.map((report) => {
                const Icon = report.icon;
                const isSelected = selectedReportId === report.id;
                const reportCount = guests.filter(report.filter).reduce((acc, g) => acc + (Number(g.guests_count || g.count || 1)), 0);

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

          {/* ZONE D'IMPRESSION - DÉTACHÉE DU FLUX PARENT LORS DE L'IMPRESSION */}
          <main className="lg:col-span-8 w-full">
            <div className="print-area bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm w-full">
              
              <table className="print-table w-full text-left border-collapse">
                
                {/* EN-TÊTE RÉPÉTÉE SUR CHAQUE PAGE */}
                <thead className="print-header">
                  <tr>
                    <th colSpan={4} className="p-0 font-normal">
                      <div className="border-b-2 border-slate-900 pb-3 mb-4">
                        
                        <div className="flex justify-between items-center pb-1.5 mb-2 border-b border-slate-200">
                          <span className="text-base font-black tracking-wide text-rose-600 uppercase">
                            {displayName}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Liste Officielle
                          </span>
                        </div>

                        <div className="flex justify-between items-end gap-4">
                          <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                              {activeReport.title}
                            </h2>
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                              {activeReport.description}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-2xl font-black text-slate-900 leading-none">{totalCount}</div>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                              Personnes au total
                            </div>
                          </div>
                        </div>
                      </div>
                    </th>
                  </tr>

                  {/* ENTÊTE DES COLONNES */}
                  <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 text-[11px] font-black uppercase tracking-wider">
                    <th className="py-2 px-2.5 w-[8%] text-left">#</th>
                    <th className="py-2 px-2.5 w-[57%] text-left">Nom & Prénom</th>
                    <th className="py-2 px-2.5 w-[20%] text-center">Côté</th>
                    <th className="py-2 px-2.5 w-[15%] text-right">Nombre</th>
                  </tr>
                </thead>

                {/* PIED DE PAGE RÉPÉTÉ SUR CHAQUE PAGE */}
                <tfoot className="print-footer">
                  <tr>
                    <td colSpan={4} className="p-0 font-normal">
                      <div className="mt-6 pt-3 border-t border-slate-300 flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <span>Édité le {new Date().toLocaleDateString('fr-FR')}</span>
                        <span>{displayName}</span>
                        <span>LISTE IMPRIMÉE</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>

                {/* CORPS DE TABLEAU */}
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 font-bold italic bg-slate-50/50">
                        Aucun invité ne correspond à cette liste.
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest, idx) => (
                      <tr key={guest.id || idx} className="print-row hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-bold text-slate-500 text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            {(guest.is_vip || guest.vip) && <Crown size={13} className="text-amber-500 fill-amber-400 shrink-0" />}
                            <span>{guest.name || guest.full_name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || 'Invité sans nom'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-800 inline-block">
                            {guest.side === 'partenaire_1' || guest.side === 'marié' ? 'Marié' : guest.side === 'partenaire_2' || guest.side === 'mariée' ? 'Mariée' : 'Commun'}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-slate-900">
                          x{guest.guests_count || guest.count || 1}
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
    </div>
  );
}