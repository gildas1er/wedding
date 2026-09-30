"use client";

import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Copy, Check, ExternalLink, Download, Printer, MessageCircle, Mail, Armchair, Camera, Feather, Loader2, Info, type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { rsvpThemeStyle } from '../../../lib/palettes';

type ShareLink = {
  id: string;
  icon: LucideIcon;
  title: string;
  usage: string;
  cardTitle: string;   // titre de la carte imprimée
  cardText: string;    // consigne sous le QR code
  path: string;
  whatsapp: (url: string, couple: string) => string;
};

const LINKS = (marriageId: string): ShareLink[] => [
  {
    id: 'faire-part',
    icon: Mail,
    title: 'Faire-part en ligne',
    usage: "Pour partager l'invitation (programme, lieux, infos pratiques). Pour répondre, chaque invité utilise son lien personnel.",
    cardTitle: 'Notre faire-part',
    cardText: 'Scannez pour découvrir le programme',
    path: `/rsvp/${marriageId}`,
    whatsapp: (url, couple) => `Voici le faire-part de notre mariage${couple ? ` — ${couple}` : ''} 💍\n${url}`,
  },
  {
    id: 'table',
    icon: Armchair,
    title: 'Trouver ma table',
    usage: "À afficher à l'entrée de la salle : chaque invité tape son nom et découvre sa table.",
    cardTitle: 'Trouvez votre table',
    cardText: 'Scannez et tapez votre nom',
    path: `/mariage/${marriageId}/plan-de-table`,
    whatsapp: (url) => `Trouvez votre table pour le dîner 🍽️\n${url}`,
  },
  {
    id: 'photos',
    icon: Camera,
    title: 'Partager vos photos',
    usage: "À poser sur les tables : vos invités vous envoient leurs photos de la journée.",
    cardTitle: 'Partagez vos photos',
    cardText: 'Scannez pour nous envoyer vos plus beaux clichés',
    path: `/photos?id=${marriageId}`,
    whatsapp: (url) => `Partagez-nous vos photos de la journée 📸\n${url}`,
  },
  {
    id: 'livre-or',
    icon: Feather,
    title: "Livre d'or",
    usage: 'Pour recueillir les mots doux de vos proches, pendant et après la fête.',
    cardTitle: "Notre livre d'or",
    cardText: 'Scannez pour nous laisser un mot doux',
    path: `/guestbook?id=${marriageId}`,
    whatsapp: (url) => `Laissez-nous un mot doux dans notre livre d'or 💌\n${url}`,
  },
];

// QR codes en noir sur blanc (meilleure lecture par tous les téléphones)
async function makeQr(url: string) {
  return QRCode.toDataURL(url, { width: 720, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1f1b18', light: '#ffffff' } });
}

export default function SharePage() {
  const [marriage, setMarriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setOrigin(window.location.origin);
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('marriages').select('*').eq('user_id', user.id).maybeSingle();
      setMarriage(data);
      setLoading(false);
    };
    load();
  }, []);

  const links = useMemo(() => (marriage ? LINKS(marriage.id) : []), [marriage]);
  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');

  useEffect(() => {
    if (!origin || !links.length) return;
    let cancelled = false;
    Promise.all(links.map(async (l) => [l.id, await makeQr(origin + l.path)] as const)).then((entries) => {
      if (!cancelled) setQrs(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [origin, links]);

  const copy = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(origin + link.path);
      setCopied(link.id);
      setTimeout(() => setCopied((c) => (c === link.id ? null : c)), 2000);
    } catch {
      window.prompt('Copiez ce lien :', origin + link.path);
    }
  };

  const print = (link: ShareLink) => {
    setPrintId(link.id);
    // Laisse le temps d'afficher la carte avant d'ouvrir l'impression
    setTimeout(() => { window.print(); }, 100);
  };

  useEffect(() => {
    const after = () => setPrintId(null);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  const printed = links.find((l) => l.id === printId);

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>
  );

  return (
    <div className="min-h-screen bg-ivory">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12 print:hidden">
        <header className="mb-8">
          <p className="eyebrow">Partager</p>
          <h1 className="mt-2 text-3xl font-normal text-ink sm:text-4xl">Liens & <span className="italic text-rose-500">QR codes</span></h1>
          <p className="mt-1 max-w-2xl text-slate-500">Copiez un lien, envoyez-le sur WhatsApp, ou imprimez son QR code pour le poser le jour J.</p>
        </header>

        <div className="mb-8 flex items-start gap-3 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>Les <strong className="font-semibold text-ink">invitations personnelles</strong> (avec réponse) s&apos;envoient depuis la page <a href="/dashboard/invite" className="font-semibold text-rose-600 underline-offset-4 hover:underline">Invités</a> : chaque invité reçoit son propre lien.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {links.map((link) => {
            const url = origin + link.path;
            return (
              <section key={link.id} className="flex flex-col rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-700"><link.icon className="h-[18px] w-[18px]" strokeWidth={1.6} /></span>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl text-ink">{link.title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{link.usage}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  <div className="grid h-36 w-36 shrink-0 place-items-center rounded-2xl border border-slate-100 bg-white p-2">
                    {qrs[link.id]
                      ? <img src={qrs[link.id]} alt={`QR code : ${link.title}`} className="h-full w-full" />
                      : <Loader2 className="h-5 w-5 animate-spin text-slate-300" />}
                  </div>
                  <div className="w-full min-w-0 space-y-2">
                    <p className="truncate rounded-xl bg-ivory px-3 py-2 font-mono text-xs text-slate-600" title={url}>{url}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Action onClick={() => copy(link)} icon={copied === link.id ? Check : Copy} primary>{copied === link.id ? 'Copié !' : 'Copier'}</Action>
                      <Action href={`https://api.whatsapp.com/send?text=${encodeURIComponent(link.whatsapp(url, couple))}`} icon={MessageCircle}>WhatsApp</Action>
                      <Action href={qrs[link.id]} download={`qr-${link.id}.png`} icon={Download} disabled={!qrs[link.id]}>QR code</Action>
                      <Action onClick={() => print(link)} icon={Printer} disabled={!qrs[link.id]}>Imprimer</Action>
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-slate-500 hover:text-ink">
                      <ExternalLink className="h-3.5 w-3.5" /> Ouvrir la page
                    </a>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Carte imprimable (format A5 portrait, centrée sur la page) */}
      {printed && qrs[printed.id] && (
        <div className="hidden print:flex print:h-[100vh] print:items-center print:justify-center" style={rsvpThemeStyle(marriage?.primary_color, marriage?.accent_color)}>
          <div className="w-[128mm] rounded-[10mm] border border-amber-300 p-[12mm] text-center">
            <p className="eyebrow">{couple}</p>
            <div className="gold-rule mx-auto my-[5mm] w-[30mm]" />
            <h2 className="font-display text-[28pt] leading-tight text-ink">{printed.cardTitle}</h2>
            <img src={qrs[printed.id]} alt="" className="mx-auto my-[8mm] h-[70mm] w-[70mm]" />
            <p className="font-display text-[14pt] italic text-rose-500">{printed.cardText}</p>
            <p className="mt-[5mm] break-all font-mono text-[8pt] text-slate-500">{origin + printed.path}</p>
          </div>
        </div>
      )}
      <style jsx global>{`
        @media print {
          @page { size: A5 portrait; margin: 8mm; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}

function Action({ onClick, href, download, icon: Icon, primary, disabled, children }: {
  onClick?: () => void; href?: string; download?: string; icon: LucideIcon; primary?: boolean; disabled?: boolean; children: React.ReactNode;
}) {
  const cls = `inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
    primary ? 'bg-ink text-white hover:bg-rose-700' : 'border border-slate-200 bg-white text-ink hover:border-ink'
  } ${disabled ? 'pointer-events-none opacity-40' : ''}`;
  if (href) {
    return (
      <a href={href} download={download} target={download ? undefined : '_blank'} rel="noopener noreferrer" className={cls} aria-disabled={disabled}>
        <Icon className="h-4 w-4" /> {children}
      </a>
    );
  }
  return <button type="button" onClick={onClick} disabled={disabled} className={cls}><Icon className="h-4 w-4" /> {children}</button>;
}
