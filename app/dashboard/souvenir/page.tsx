"use client";

// Mes souvenirs : téléchargement des données du mariage, prolongation et suppression du compte.
// Accessible à tout moment ; c'est la page principale de l'espace en mode souvenir.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { AnimatePresence } from 'framer-motion';
import {
  Download, Users, Wallet, CalendarClock, MessageSquareQuote, Printer, Images, Loader2,
  MessageCircle, Phone, Trash2, Heart, Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PREMIUM_CONTACT, formatXof } from '../../../lib/plan';
import {
  EXTENSION_MONTHS, EXTENSION_PRICE_XOF, extensionWhatsappLink, formatLongDate, spaceLifecycle,
} from '../../../lib/lifecycle';
import DeleteAccountModal from '../../../components/dashboard/DeleteAccountModal';

type Marriage = Record<string, unknown> & { id: string; partner_1_name?: string | null; partner_2_name?: string | null; wedding_date?: string | null; kept_until?: string | null };
type Row = Record<string, unknown>;

const yesNo = (v: unknown) => (v === false ? 'Non' : v ? 'Oui' : '');

// Fichier CSV lisible par Excel (séparateur « ; », accents conservés)
function downloadCsv(filename: string, rows: Row[]) {
  const csv = '﻿' + Papa.unparse(rows, { delimiter: ';' });
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SouvenirPage() {
  const [marriage, setMarriage] = useState<Marriage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    Promise.resolve().then(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
      setMarriage(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>;

  const life = spaceLifecycle(marriage);
  const souvenir = life.phase === 'souvenir';
  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  const slug = (couple || 'mariage').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

  const exportData = async (id: string, build: () => Promise<{ name: string; rows: Row[] }>) => {
    setBusy(id);
    setError(null);
    try {
      const { name, rows } = await build();
      if (!rows.length) { setError('Rien à télécharger pour cette rubrique.'); return; }
      downloadCsv(`${slug}-${name}.csv`, rows);
      setDone((d) => [...new Set([...d, id])]);
    } catch {
      setError('Le téléchargement a échoué. Vérifiez votre connexion puis réessayez.');
    } finally {
      setBusy(null);
    }
  };

  const mid = marriage?.id ?? '';
  const exports = [
    {
      id: 'invites', icon: Users, title: 'Liste des invités', desc: 'Noms, téléphones, réponses, présence aux cérémonies et tables.',
      build: async () => {
        const [{ data: guests, error: e1 }, { data: tables }] = await Promise.all([
          supabase.from('invite').select('*').eq('marriage_id', mid).order('name'),
          supabase.from('tables').select('id, name').eq('marriage_id', mid),
        ]);
        if (e1) throw e1;
        const tableName = new Map((tables ?? []).map((t) => [t.id, t.name]));
        return {
          name: 'invites',
          rows: (guests ?? []).map((g) => ({
            Nom: g.name, Téléphone: g.phone ?? '', Réponse: g.status ?? '', Personnes: g.guests_count ?? 1,
            Côté: g.side ?? '', Catégorie: g.category ?? '', VIP: yesNo(g.is_vip),
            ...(marriage?.show_dot ? { Dot: g.status === 'confirmé' ? yesNo(g.attending_dot ?? true) : '' } : {}),
            Mairie: g.status === 'confirmé' ? yesNo(g.attending_civil) : '',
            Église: g.status === 'confirmé' ? yesNo(g.attending_church) : '',
            Réception: g.status === 'confirmé' ? yesNo(g.attending_reception) : '',
            Table: g.table_id ? tableName.get(g.table_id) ?? '' : '', Notes: g.notes ?? '',
          })),
        };
      },
    },
    {
      id: 'budget', icon: Wallet, title: 'Budget', desc: 'Toutes les dépenses : estimé, facturé, réglé, prestataires.',
      build: async () => {
        const { data, error: e } = await supabase.from('budget_items').select('*').eq('marriage_id', mid).order('category');
        if (e) throw e;
        return {
          name: 'budget',
          rows: (data ?? []).map((b) => ({
            Désignation: b.label, Catégorie: b.category ?? '', 'Estimé (FCFA)': b.amount_estimated ?? 0, 'Facturé (FCFA)': b.amount_actual ?? 0,
            'Réglé (FCFA)': b.amount_paid ?? 0, 'Reste (FCFA)': Math.max(0, (b.amount_actual ?? 0) - (b.amount_paid ?? 0)), Statut: b.status ?? '',
            Prestataire: b.vendor_name ?? '', Contact: b.vendor_contact ?? '', Échéance: b.due_date ?? '', Notes: b.notes ?? '',
          })),
        };
      },
    },
    {
      id: 'deroule', icon: CalendarClock, title: 'Déroulé du Jour J', desc: 'Les moments de la journée, lieux et responsables.',
      build: async () => {
        const { data, error: e } = await supabase.from('planning_events').select('*').eq('marriage_id', mid).order('start_time');
        if (e) throw e;
        return {
          name: 'deroule',
          rows: (data ?? []).map((p) => ({
            Début: p.start_time?.slice(0, 5) ?? '', Fin: p.end_time?.slice(0, 5) ?? '', Moment: p.title, Lieu: p.location ?? '',
            Responsable: p.responsible ?? '', Contact: p.responsible_contact ?? '', Notes: p.description ?? '',
          })),
        };
      },
    },
    {
      id: 'livre', icon: MessageSquareQuote, title: "Livre d'or", desc: 'Les messages de vos proches, avec le lien de leurs photos.',
      build: async () => {
        const { data, error: e } = await supabase.from('guestbook').select('*').eq('marriage_id', mid).order('created_at');
        if (e) throw e;
        return {
          name: 'livre-d-or',
          rows: (data ?? []).map((g) => ({
            Date: g.created_at ? new Date(g.created_at).toLocaleDateString('fr-FR') : '', Auteur: g.author_name ?? '', Message: g.message ?? '', Photo: g.image_url ?? '',
          })),
        };
      },
    },
  ];

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10 lg:py-12">
        <header className="mb-8">
          <p className="eyebrow">{souvenir ? 'Mode souvenir' : 'Vos données'}</p>
          <h1 className="mt-2 text-3xl font-normal sm:text-4xl">Mes <span className="italic text-rose-500">souvenirs</span></h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            {souvenir
              ? 'Votre mariage a eu lieu : votre espace est en lecture seule. Téléchargez tout ce que vous souhaitez garder.'
              : 'Téléchargez à tout moment une copie de vos listes. Elles s’ouvrent dans Excel ou Google Sheets.'}
          </p>
        </header>

        {/* Calendrier de l'espace */}
        {life.activeUntil && life.deleteAt && (
          <section className={`mb-8 grid gap-3 rounded-[1.5rem] p-5 sm:grid-cols-3 sm:p-6 ${souvenir ? 'bg-ink text-white' : 'border border-slate-200/80 bg-white'}`}>
            <Milestone label="Mariage" value={marriage?.wedding_date ? formatLongDate(new Date(`${marriage.wedding_date.slice(0, 10)}T00:00:00Z`)) : ''} dark={souvenir} done={life.weddingPassed} />
            <Milestone label="Mode souvenir" value={`à partir du ${formatLongDate(life.activeUntil)}`} dark={souvenir} done={souvenir} />
            <Milestone
              label="Suppression automatique"
              value={`le ${formatLongDate(life.deleteAt)}`}
              hint={souvenir && life.daysBeforeDeletion !== null ? `dans ${life.daysBeforeDeletion} jour${life.daysBeforeDeletion > 1 ? 's' : ''}` : undefined}
              dark={souvenir}
              alert={souvenir && (life.daysBeforeDeletion ?? 99) <= 30}
            />
          </section>
        )}

        {/* Téléchargements */}
        <section aria-labelledby="dl-title" className="mb-8">
          <h2 id="dl-title" className="mb-3 font-display text-2xl">Télécharger</h2>
          {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {exports.map(({ id, icon: Icon, title, desc, build }) => (
              <button
                key={id}
                type="button"
                onClick={() => exportData(id, build)}
                disabled={busy !== null}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 text-left transition-all hover:border-amber-300 hover:shadow-md disabled:opacity-60"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-700"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{title}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{desc}</span>
                </span>
                <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 group-hover:text-ink">
                  {busy === id ? <Loader2 className="h-4 w-4 animate-spin" /> : done.includes(id) ? <Check className="h-4 w-4 text-emerald-600" /> : <Download className="h-4 w-4" />}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SmallLink href="/dashboard/invite/print" icon={Printer}>Imprimer mes listes d&apos;invités</SmallLink>
            <SmallLink href="/dashboard/planning/print" icon={Printer}>Imprimer le déroulé</SmallLink>
            <SmallLink href="/dashboard/album" icon={Images}>Album photos (tout télécharger)</SmallLink>
          </div>
          <p className="mt-3 text-xs text-slate-500">Les fichiers s&apos;ouvrent dans Excel, Numbers ou Google Sheets. Les photos de vos invités se téléchargent en une fois depuis l&apos;album (fichier .zip).</p>
        </section>

        {/* Prolongation */}
        {souvenir && (
          <section aria-labelledby="ext-title" className="mb-8 rounded-[1.5rem] border border-amber-300 bg-amber-50/60 p-5 sm:p-6">
            <h2 id="ext-title" className="flex items-center gap-2 font-display text-2xl"><Heart className="h-5 w-5 text-amber-700" /> Prolonger mon espace</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-700">
              Votre espace redevient complet pendant {EXTENSION_MONTHS} mois et ne sera pas supprimé avant la fin de la prolongation. Contactez-nous : nous vous indiquons comment régler, puis nous activons la prolongation.
            </p>
            <p className="mt-3 font-display text-3xl">{formatXof(EXTENSION_PRICE_XOF)} <span className="text-base text-slate-500">· {EXTENSION_MONTHS} mois</span></p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a href={extensionWhatsappLink(couple, mid)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700">
                <MessageCircle className="h-4 w-4" /> Écrire sur WhatsApp
              </a>
              <a href={`tel:${PREMIUM_CONTACT.phone}`} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-ink hover:border-ink">
                <Phone className="h-4 w-4" /> Appeler le {PREMIUM_CONTACT.display}
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Votre référence : <span className="font-mono text-ink">{mid.slice(0, 8)}</span></p>
          </section>
        )}

        {/* Suppression */}
        <section aria-labelledby="del-title" className="rounded-[1.5rem] border border-rose-200 bg-white p-5 sm:p-6">
          <h2 id="del-title" className="font-display text-2xl text-rose-700">Supprimer définitivement mon compte</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Votre espace, vos listes, vos fichiers et votre compte de connexion seront effacés immédiatement. Vous ne pourrez plus vous connecter. Cette action ne peut pas être annulée.
          </p>
          <button type="button" onClick={() => setShowDelete(true)} className="mt-4 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-rose-300 px-5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" /> Supprimer mon compte
          </button>
        </section>
      </main>

      <AnimatePresence>
        {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} showDownloadLink={false} />}
      </AnimatePresence>
    </div>
  );
}

function Milestone({ label, value, hint, dark, done, alert }: { label: string; value: string; hint?: string; dark: boolean; done?: boolean; alert?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${dark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-ivory'}`}>
      <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${dark ? 'text-amber-300' : 'text-amber-700'}`}>
        {done && <Check className="h-3.5 w-3.5" />} {label}
      </p>
      <p className={`mt-1 font-semibold ${alert ? (dark ? 'text-rose-300' : 'text-rose-700') : ''}`}>{value}</p>
      {hint && <p className={`text-sm ${alert ? (dark ? 'text-rose-300' : 'text-rose-700') : dark ? 'text-white/60' : 'text-slate-500'}`}>{hint}</p>}
    </div>
  );
}

function SmallLink({ href, icon: Icon, external, children }: { href: string; icon: typeof Download; external?: boolean; children: React.ReactNode }) {
  const cls = 'inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-semibold text-ink hover:border-amber-300';
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}><Icon className="h-4 w-4 text-slate-500" /> {children}</a>
    : <Link href={href} className={cls}><Icon className="h-4 w-4 text-slate-500" /> {children}</Link>;
}
