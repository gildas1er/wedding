"use client";
// Accueil du jour J (formules payantes, migration 32) : lien de l'équipe d'accueil et suivi des arrivées.
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Check, Copy, Crown, ExternalLink, Loader2, MessageCircle, RefreshCw, ScanLine, Ticket, Users, type LucideIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSessionUser, loadMarriage } from '../../../lib/current-marriage';
import { isPremium } from '../../../lib/plan';
import { useConfirm } from '../../../components/ui/ConfirmDialog';

type Row = { id: string; name: string; guests_count: number | null; status: string | null; ticket_code: string | null; checked_in_at: string | null };

const people = (rows: Row[]) => rows.reduce((s, r) => s + Math.max(1, Number(r.guests_count) || 1), 0);
const hour = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');

export default function AccueilDashboardPage() {
  const { confirm, notify } = useConfirm();
  const [marriage, setMarriage] = useState<Awaited<ReturnType<typeof loadMarriage>>['data']>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsError, setRowsError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) { setLoading(false); return; }
      const { data } = await loadMarriage(user.id);
      setMarriage(data);
      setLoading(false);
    })();
  }, []);

  const premium = isPremium(marriage);
  const marriageId: string | undefined = marriage?.id;

  const loadRows = useCallback(async () => {
    if (!marriageId) return;
    const { data, error } = await supabase
      .from('invite')
      .select('id, name, guests_count, status, ticket_code, checked_in_at')
      .eq('marriage_id', marriageId);
    setRowsError(Boolean(error));
    if (!error) setRows((data ?? []) as Row[]);
  }, [marriageId]);

  useEffect(() => {
    if (!premium) return;
    supabase.rpc('my_checkin_key').then(({ data, error }) => {
      if (error || !data) { setKeyError(true); return; }
      setKey(data as string);
    });
    // Première lecture, puis suivi des arrivées pendant la fête
    const first = setTimeout(loadRows, 0);
    const timer = setInterval(loadRows, 30_000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [premium, loadRows]);

  const link = key && marriage ? `${window.location.origin}/accueil?id=${marriage.id}&k=${key}` : '';

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 480, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1f1b18', light: '#ffffff' } }).then(setQr);
  }, [link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copiez ce lien :', link);
    }
  };

  const renew = async () => {
    const ok = await confirm({
      title: 'Renouveler le lien d’accueil ?',
      message: 'L’ancien lien ne fonctionnera plus. Envoyez le nouveau à toute votre équipe d’accueil. Les entrées déjà enregistrées sont conservées.',
      confirmLabel: 'Renouveler',
      tone: 'neutral',
      icon: RefreshCw,
    });
    if (!ok) return;
    const { data, error } = await supabase.rpc('my_checkin_key', { p_reset: true });
    if (error || !data) { notify('Le lien n’a pas pu être renouvelé.', 'error'); return; }
    setKey(data as string);
    notify('Nouveau lien d’accueil créé');
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>;

  const confirmed = rows.filter((r) => r.status === 'confirmé');
  const arrived = rows.filter((r) => r.checked_in_at).sort((a, b) => b.checked_in_at!.localeCompare(a.checked_in_at!));
  const tickets = confirmed.filter((r) => r.ticket_code);
  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  const whatsapp = `Bonjour ! Merci de nous aider à l'accueil de notre mariage${couple ? ` (${couple})` : ''} 🙏\nOuvrez ce lien sur votre téléphone le jour J pour scanner les billets des invités :\n${link}\nNe le partagez pas : il donne accès à la liste des invités.`;

  return (
    <div className="min-h-screen bg-ivory">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <header className="mb-8">
          <p className="eyebrow">Jour J</p>
          <h1 className="mt-2 text-3xl font-normal text-ink sm:text-4xl">Accueil <span className="italic text-rose-500">des invités</span></h1>
          <p className="mt-1 max-w-2xl text-slate-500">Chaque invité qui confirme reçoit un billet avec un QR code. Le jour J, votre équipe d&apos;accueil le scanne avec son téléphone.</p>
        </header>

        {!premium ? (
          <section className="rounded-[1.5rem] border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600"><Crown className="h-6 w-6" strokeWidth={1.6} /></span>
            <h2 className="mt-4 font-display text-2xl text-ink">Billets d&apos;entrée et contrôle à l&apos;entrée</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
              <li>• Un billet à leur nom pour chaque invité qui confirme, en image ou en PDF.</li>
              <li>• Le programme de leurs cérémonies, le nombre de personnes et leur table.</li>
              <li>• Le scan à l&apos;entrée : un billet ne passe qu&apos;une fois, et vous suivez les arrivées.</li>
            </ul>
            <p className="mt-4 text-sm text-slate-500">Disponible avec toutes les formules payantes, à partir du palier Intime.</p>
            <Link href="/dashboard/premium" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700">
              <Crown className="h-4 w-4" /> Voir les formules
            </Link>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-700"><ScanLine className="h-[18px] w-[18px]" strokeWidth={1.6} /></span>
                <div className="min-w-0">
                  <h2 className="font-display text-xl text-ink">Lien de l&apos;équipe d&apos;accueil</h2>
                  <p className="mt-0.5 text-sm text-slate-500">À envoyer aux personnes qui accueillent vos invités. Ouvert une fois sur leur téléphone, il y reste enregistré.</p>
                </div>
              </div>

              {keyError ? (
                <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Le lien n&apos;a pas pu être créé. La mise à jour de la base (migration 32) n&apos;est peut-être pas encore faite.</p>
              ) : (
                <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
                  <div className="grid h-36 w-36 shrink-0 place-items-center rounded-2xl border border-slate-100 bg-white p-2">
                    {qr ? <img src={qr} alt="QR code du lien d'accueil" className="h-full w-full" /> : <Loader2 className="h-5 w-5 animate-spin text-slate-300" />}
                  </div>
                  <div className="w-full min-w-0 space-y-2">
                    <p className="text-xs text-slate-500">Votre équipe peut aussi scanner ce QR code pour ouvrir le lien.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Action onClick={copy} icon={copied ? Check : Copy} primary disabled={!link}>{copied ? 'Copié !' : 'Copier'}</Action>
                      <Action href={link ? `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsapp)}` : undefined} icon={MessageCircle} disabled={!link}>WhatsApp</Action>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
                      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink"><ExternalLink className="h-3.5 w-3.5" /> Ouvrir l&apos;accueil</a>}
                      <button type="button" onClick={renew} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink"><RefreshCw className="h-3.5 w-3.5" /> Renouveler le lien</button>
                    </div>
                  </div>
                </div>
              )}
              <p className="mt-5 rounded-xl bg-ivory p-3 text-xs text-slate-500">Ce lien donne accès aux noms de vos invités : ne le publiez pas. En cas de doute, renouvelez-le.</p>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl text-ink">Arrivées</h2>
                <button type="button" onClick={loadRows} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink"><RefreshCw className="h-3.5 w-3.5" /> Actualiser</button>
              </div>
              {rowsError ? (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Les arrivées s&apos;afficheront après la mise à jour de la base (migration 32).</p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Stat icon={Users} label="Confirmés" value={people(confirmed)} />
                    <Stat icon={Ticket} label="Billets créés" value={people(tickets)} />
                    <Stat icon={Check} label="Arrivés" value={people(arrived)} />
                  </div>
                  {arrived.length === 0 ? (
                    <p className="mt-5 text-sm text-slate-500">Personne n&apos;est encore arrivé. Les entrées scannées apparaîtront ici.</p>
                  ) : (
                    <ul className="mt-5 max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                      {arrived.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                          <span className="min-w-0 truncate font-medium text-ink">{r.name}</span>
                          <span className="shrink-0 text-xs text-slate-500 tabular-nums">{Math.max(1, Number(r.guests_count) || 1)} pers. · {hour(r.checked_in_at!)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-ivory p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-rose-500" />
      <p className="mt-1 font-display text-2xl text-ink tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function Action({ onClick, href, icon: Icon, primary, disabled, children }: {
  onClick?: () => void; href?: string; icon: LucideIcon; primary?: boolean; disabled?: boolean; children: React.ReactNode;
}) {
  const cls = `inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
    primary ? 'bg-ink text-white hover:bg-rose-700' : 'border border-slate-200 bg-white text-ink hover:border-ink'
  } ${disabled ? 'pointer-events-none opacity-40' : ''}`;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}><Icon className="h-4 w-4" /> {children}</a>;
  return <button type="button" onClick={onClick} disabled={disabled} className={cls}><Icon className="h-4 w-4" /> {children}</button>;
}
