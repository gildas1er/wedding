"use client";
// Accueil du jour J (formules payantes, migrations 32 et 33) : envoi des billets, lien de l'équipe d'accueil
// et suivi des arrivées.
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Check, Copy, Crown, ExternalLink, Loader2, MessageCircle, RefreshCw, ScanLine, Send, Ticket, Users, type LucideIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSessionUser, loadMarriage } from '../../../lib/current-marriage';
import { isPremium } from '../../../lib/plan';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { whatsappLink } from '../../../lib/phone';
import { formatDayFr, resolveTicketRelease, ticketAvailableFrom, todayAbidjan } from '../../../lib/ticket';

type Row = {
  id: string; name: string; phone: string | null; guests_count: number | null; status: string | null;
  ticket_code: string | null; checked_in_at: string | null; ticket_sent_at: string | null;
  attending_dot: boolean | null; attending_civil: boolean | null; attending_church: boolean | null; attending_reception: boolean | null;
};

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
  const [showAllTickets, setShowAllTickets] = useState(false);

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
      .select('id, name, phone, guests_count, status, ticket_code, checked_in_at, ticket_sent_at, attending_dot, attending_civil, attending_church, attending_reception')
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

  // « Votre billet est prêt » : message WhatsApp avec le lien personnel de l'invité, puis envoi noté
  const sendTicket = async (r: Row) => {
    if (!marriage) return;
    const couple = [marriage.partner_1_name, marriage.partner_2_name].filter(Boolean).join(' & ');
    const message = `Bonjour ${r.name} ! 🎟️ Votre billet d'entrée pour le mariage${couple ? ` de ${couple}` : ''} est prêt.\nOuvrez votre invitation pour l'enregistrer dans vos photos :\n${window.location.origin}/rsvp/${marriage.id}?guest=${r.id}\nIl est à votre nom et ne sert qu'une fois : présentez-le à l'accueil le jour J.`;
    const url = whatsappLink(r.phone, message);
    if (!url) { notify(`Le numéro de ${r.name} n'est pas valide. Modifiez sa fiche dans la page Invités.`, 'error'); return; }
    window.open(url, '_blank');
    const at = new Date().toISOString();
    const { error } = await supabase.from('invite').update({ ticket_sent_at: at }).eq('id', r.id);
    if (error) { notify("Le message est parti, mais son envoi n'a pas pu être noté.", 'error'); return; }
    setRows((prev) => prev.map((g) => (g.id === r.id ? { ...g, ticket_sent_at: at } : g)));
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>;

  const confirmed = rows.filter((r) => r.status === 'confirmé');
  const arrived = rows.filter((r) => r.checked_in_at).sort((a, b) => b.checked_in_at!.localeCompare(a.checked_in_at!));
  const tickets = confirmed.filter((r) => r.ticket_code);
  const today = todayAbidjan();
  const veille = resolveTicketRelease(marriage?.ticket_release) === 'veille';
  const toSend = confirmed
    .map((r) => ({ ...r, from: ticketAvailableFrom(marriage ?? {}, r) }))
    .sort((a, b) => Number(Boolean(a.ticket_sent_at)) - Number(Boolean(b.ticket_sent_at)) || (a.from ?? '').localeCompare(b.from ?? '') || a.name.localeCompare(b.name));
  const sentCount = toSend.filter((r) => r.ticket_sent_at).length;
  const shownToSend = showAllTickets ? toSend : toSend.filter((r) => !r.ticket_sent_at);
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
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Les arrivées s&apos;afficheront après la mise à jour de la base (migrations 32 et 33).</p>
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

            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-700"><Send className="h-[18px] w-[18px]" strokeWidth={1.6} /></span>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl text-ink">Envoyer les billets</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {veille
                        ? 'Vous avez choisi « la veille » dans le Studio : chaque invité peut ouvrir son billet la veille de sa première cérémonie. Envoyez-lui le message ce jour-là.'
                        : 'Prévenez vos invités confirmés que leur billet les attend, en particulier ceux qui ont répondu avant l’arrivée des billets.'}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 rounded-full bg-ivory px-3 py-1 text-xs font-semibold text-slate-600 tabular-nums">{sentCount} / {toSend.length} envoyés</p>
              </div>
              {rowsError ? null : toSend.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">Aucun invité n&apos;a encore confirmé sa présence.</p>
              ) : (
                <>
                  {shownToSend.length === 0 ? (
                    <p className="mt-5 text-sm text-slate-500">Tous les billets ont été envoyés.</p>
                  ) : (
                    <ul className="mt-5 max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
                      {shownToSend.map((r) => {
                        const later = r.from && r.from > today;
                        return (
                          <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">{r.name}</p>
                              <p className="text-xs text-slate-500">
                                {Math.max(1, Number(r.guests_count) || 1)} pers.
                                {r.ticket_sent_at && <span className="text-emerald-700"> · Envoyé le {new Date(r.ticket_sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                                {later && <span className="text-amber-700"> · Billet disponible le {formatDayFr(r.from!)}</span>}
                                {!r.phone && <span className="text-amber-700"> · Pas de numéro</span>}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => sendTicket(r)}
                              disabled={Boolean(later) || !r.phone}
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${r.ticket_sent_at ? 'border border-slate-200 text-ink hover:border-ink' : 'bg-ink text-white hover:bg-rose-700'}`}
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> {r.ticket_sent_at ? 'Renvoyer' : 'WhatsApp'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {sentCount > 0 && (
                    <button type="button" onClick={() => setShowAllTickets((v) => !v)} className="mt-3 text-xs font-medium text-slate-500 underline-offset-4 hover:text-ink hover:underline">
                      {showAllTickets ? 'Masquer les billets déjà envoyés' : `Voir aussi les ${sentCount} billets déjà envoyés`}
                    </button>
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
