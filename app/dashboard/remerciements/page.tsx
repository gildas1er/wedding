"use client";
// Cartes de remerciements (migration 35) : le couple choisit le modèle et son mot, personnalise la carte
// des invités qui le souhaitent, puis l'envoie à chacun sur WhatsApp. Ouvert à toutes les formules,
// et encore utilisable en mode souvenir (envoyer un merci ne modifie pas l'espace).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check, ChevronDown, Copy, Crown, Download, Gift, HeartHandshake, Image as ImageIcon, Loader2, MessageCircle, MessageSquareQuote, Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSessionUser, loadMarriage } from '../../../lib/current-marriage';
import { whatsappLink } from '../../../lib/phone';
import { formatXof } from '../../../lib/plan';
import { REFERRAL_DISCOUNT_XOF, REFERRAL_REWARD_XOF, referralLink } from '../../../lib/promo';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import ThanksCard from '../../../components/thanks/ThanksCard';
import { canvasToBlob, saveFiles } from '../../../lib/ticket';
import {
  DEFAULT_THANKS_MESSAGE, TABLE_ROLE_EXAMPLES, TABLE_ROLE_MAX, THANKS_EXAMPLES, THANKS_MESSAGE_MAX, THANKS_NOTE_MAX, THANKS_TEMPLATES,
  bestMatch, ceremoniesSentence, formatWeddingDay, guestCame, plannedCeremonies, readTableRoles, resolveThanksTemplate,
  thanksFilename, thanksOpen, thanksUrl, usesGuestMemories, type ThanksCardData, type ThanksTemplate,
} from '../../../lib/thanks';

type Guest = {
  id: string; name: string; phone: string | null; status: string | null; checked_in_at?: string | null;
  guests_count: number | null; table_id: string | null;
  attending_dot: boolean | null; attending_civil: boolean | null; attending_church: boolean | null; attending_reception: boolean | null;
};
type CardRow = { invite_id: string; photo_file: string | null; quote_id: string | null; note: string | null; sent_at: string | null; opened_at: string | null };
type Photo = { file_name: string; guest_name: string; url: string };
type BookEntry = { id: string; author_name: string | null; message: string | null };

const persons = (list: Guest[]) => list.reduce((s, g) => s + Math.max(1, Number(g.guests_count) || 1), 0);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export default function RemerciementsPage() {
  const { notify } = useConfirm();
  const [marriage, setMarriage] = useState<Awaited<ReturnType<typeof loadMarriage>>['data']>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false); // migration 35 pas encore lancée
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Map<string, string>>(new Map());
  const [cards, setCards] = useState<Map<string, CardRow>>(new Map());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [book, setBook] = useState<BookEntry[]>([]);
  const [template, setTemplate] = useState<ThanksTemplate>('lettre');
  const [message, setMessage] = useState(DEFAULT_THANKS_MESSAGE);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [savedSettings, setSavedSettings] = useState({ template: 'lettre', message: DEFAULT_THANKS_MESSAGE, roles: '{}' });
  const [everyoneBusy, setEveryoneBusy] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const marriageId: string | undefined = marriage?.id;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) { setLoading(false); return; }
      const { data } = await loadMarriage(user.id);
      setMarriage(data);
      if (!data) { setLoading(false); return; }
      const [g, t, s, c, b, album] = await Promise.all([
        supabase.from('invite').select('*').eq('marriage_id', data.id),
        supabase.from('tables').select('id, name').eq('marriage_id', data.id),
        supabase.from('thanks_settings').select('*').eq('marriage_id', data.id).maybeSingle(),
        supabase.from('thanks_cards').select('invite_id, photo_file, quote_id, note, sent_at, opened_at').eq('marriage_id', data.id),
        supabase.from('guestbook').select('id, author_name, message').eq('marriage_id', data.id).order('created_at', { ascending: false }),
        fetch('/api/album').then((r) => (r.ok ? r.json() : { photos: [] })).catch(() => ({ photos: [] })),
      ]);
      setGuests(((g.data ?? []) as Guest[]).filter(guestCame).sort((a, z) => a.name.localeCompare(z.name, 'fr')));
      setTables(new Map(((t.data ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name])));
      setMissing(Boolean(s.error || c.error));
      const tpl = resolveThanksTemplate(s.data?.template);
      const msg = s.data?.message?.trim() || DEFAULT_THANKS_MESSAGE;
      const savedRoles = readTableRoles(s.data?.table_roles);
      setTemplate(tpl);
      setMessage(msg);
      setRoles(savedRoles);
      setSavedSettings({ template: tpl, message: msg, roles: JSON.stringify(savedRoles) });
      setCards(new Map(((c.data ?? []) as CardRow[]).map((r) => [r.invite_id, r])));
      setBook(((b.data ?? []) as BookEntry[]).filter((e) => e.message?.trim()).map((e) => ({ ...e, id: String(e.id) })));
      setPhotos((album.photos ?? []) as Photo[]);
      setLoading(false);
    })();
  }, []);

  const weddingDate = marriage?.wedding_date ? String(marriage.wedding_date).slice(0, 10) : null;
  const open = thanksOpen(weddingDate);
  const paid = marriage?.plan === 'premium' || Boolean(marriage?.tier);
  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  const cleanRoles = useMemo(() => readTableRoles(roles), [roles]);
  const settingsChanged = template !== savedSettings.template || message.trim() !== savedSettings.message || JSON.stringify(cleanRoles) !== savedSettings.roles;
  // Tables où sont assis des invités venus (pour les rôles du générique)
  const usedTables = useMemo(() => {
    const ids = new Set(guests.map((g) => g.table_id).filter((id): id is string => Boolean(id)));
    return [...tables.entries()].filter(([id]) => ids.has(id)).sort((a, b) => a[1].localeCompare(b[1], 'fr', { numeric: true }));
  }, [guests, tables]);

  // Photo et message rapprochés de l'invité (ceux choisis par le couple, sinon par le nom)
  const photoFor = useCallback((g: Guest) => {
    const chosen = cards.get(g.id)?.photo_file;
    return (chosen ? photos.find((p) => p.file_name === chosen) : bestMatch(g.name, photos, (p) => p.guest_name)) ?? null;
  }, [cards, photos]);
  const quoteFor = useCallback((g: Guest) => {
    const chosen = cards.get(g.id)?.quote_id;
    return (chosen ? book.find((b) => b.id === chosen) : bestMatch(g.name, book, (b) => b.author_name)) ?? null;
  }, [cards, book]);

  const cardFor = useCallback((g: Guest): ThanksCardData => {
    const memories = usesGuestMemories(template);
    const q = memories ? quoteFor(g) : null;
    return {
      template,
      marriageId: marriageId ?? '',
      partner1: marriage?.partner_1_name ?? '',
      partner2: marriage?.partner_2_name ?? '',
      weddingDate,
      city: marriage?.location_city && marriage.location_city !== 'À définir' ? marriage.location_city : null,
      guestName: g.name,
      ceremonies: ceremoniesSentence(marriage, g),
      table: g.table_id ? tables.get(g.table_id) ?? null : null,
      message: message.trim() || DEFAULT_THANKS_MESSAGE,
      note: paid ? cards.get(g.id)?.note?.trim() || null : null,
      coverUrl: marriage?.bg_image_url ?? null,
      photoUrl: memories ? photoFor(g)?.url ?? null : null,
      quote: q?.message ? { text: q.message.trim().slice(0, 240), author: q.author_name ?? '' } : null,
      primary: marriage?.primary_color ?? null,
      accent: marriage?.accent_color ?? null,
      namesFont: marriage?.names_font ?? null,
      referralCode: marriage?.referral_code ?? null,
      paid,
      guestbookOpen: false,
      stats: { guests: persons(guests), ceremonies: plannedCeremonies(marriage), photos: photos.length, messages: book.length },
      tableRole: g.table_id ? cleanRoles[g.table_id] ?? null : null,
      tableMates: g.table_id ? guests.filter((x) => x.table_id === g.table_id && x.id !== g.id).map((x) => x.name).slice(0, 3) : [],
    };
  }, [template, marriageId, marriage, weddingDate, tables, message, paid, cards, photoFor, quoteFor, guests, photos.length, book.length, cleanRoles]);

  const previewGuest = guests.find((g) => g.id === previewId) ?? guests[0] ?? null;
  const sample: Guest = { id: 'exemple', name: 'Tante Adjoua', phone: null, status: 'confirmé', guests_count: 1, table_id: null, attending_dot: true, attending_civil: null, attending_church: null, attending_reception: true };
  const preview = cardFor(previewGuest ?? sample);

  const saveSettings = async () => {
    if (!marriageId) return;
    setSavingSettings(true);
    const value: Record<string, unknown> = { marriage_id: marriageId, template, message: message.trim().slice(0, THANKS_MESSAGE_MAX) || null, updated_at: new Date().toISOString() };
    // Rôles des tables : seulement s'il y en a (colonne ajoutée par la migration 36)
    if (Object.keys(cleanRoles).length || savedSettings.roles !== '{}') value.table_roles = cleanRoles;
    const { error } = await supabase.from('thanks_settings').upsert(value, { onConflict: 'marriage_id' });
    setSavingSettings(false);
    if (error) { notify('Votre carte n’a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.', 'error'); return false; }
    setSavedSettings({ template, message: message.trim() || DEFAULT_THANKS_MESSAGE, roles: JSON.stringify(cleanRoles) });
    return true;
  };

  const saveCard = async (g: Guest, patch: Partial<CardRow>) => {
    if (!marriageId) return false;
    const current = cards.get(g.id);
    const row = {
      invite_id: g.id, marriage_id: marriageId,
      photo_file: current?.photo_file ?? null, quote_id: current?.quote_id ?? null, note: current?.note ?? null, sent_at: current?.sent_at ?? null,
      ...patch,
    };
    const { data, error } = await supabase.from('thanks_cards').upsert(row, { onConflict: 'invite_id' }).select('invite_id, photo_file, quote_id, note, sent_at, opened_at').maybeSingle();
    if (error) { notify('Modification non enregistrée. Vérifiez votre connexion puis réessayez.', 'error'); return false; }
    if (data) setCards((prev) => new Map(prev).set(g.id, data as CardRow));
    return true;
  };

  const link = (g: Guest) => (marriageId ? thanksUrl(window.location.origin, marriageId, g.id) : '');
  const whatsappText = (g: Guest) =>
    `Bonjour ${g.name} 💛\nMerci d'avoir été à nos côtés pour notre mariage. Nous vous avons préparé une petite carte :\n${link(g)}\n${couple}`;

  const send = async (g: Guest) => {
    if (settingsChanged && !(await saveSettings())) return;
    const url = whatsappLink(g.phone, whatsappText(g));
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    await saveCard(g, { sent_at: new Date().toISOString() });
  };

  const copyLink = async (g: Guest) => {
    if (settingsChanged && !(await saveSettings())) return;
    try { await navigator.clipboard.writeText(whatsappText(g)); } catch { window.prompt('Copiez le message :', whatsappText(g)); }
    setCopied(g.id);
    setTimeout(() => setCopied(null), 2000);
    if (!cards.get(g.id)?.sent_at) await saveCard(g, { sent_at: new Date().toISOString() });
  };

  // Statut du couple « Merci à tous » : les trois écrans du modèle Le Statut, sans nom d'invité
  const shareEveryone = async () => {
    setEveryoneBusy(true);
    try {
      const { drawStatus } = await import('../../../lib/thanks-draw');
      const base = cardFor(sample);
      const card: ThanksCardData = { ...base, template: 'statut', guestName: 'à tous', ceremonies: null, note: null, photoUrl: null, quote: null };
      const canvases = await drawStatus(card).catch(() => drawStatus({ ...card, coverUrl: null }));
      const files = await Promise.all(canvases.map(async (c, i) => new File([await canvasToBlob(c, 'image/jpeg', 0.92)], thanksFilename(`a-tous-${i + 1}`, 'jpg'), { type: 'image/jpeg' })));
      await saveFiles(files);
    } catch (e) {
      console.error('Statut « Merci à tous » :', e);
      notify('Les images n’ont pas pu être créées. Réessayez.', 'error');
    } finally {
      setEveryoneBusy(false);
    }
  };

  const stats = useMemo(() => {
    const list = [...cards.values()];
    return { sent: list.filter((c) => c.sent_at).length, opened: list.filter((c) => c.opened_at).length };
  }, [cards]);

  const sorted = useMemo(
    () => [...guests].sort((a, b) => Number(Boolean(cards.get(a.id)?.sent_at)) - Number(Boolean(cards.get(b.id)?.sent_at)) || a.name.localeCompare(b.name, 'fr')),
    [guests, cards],
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-ivory"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>;
  }

  const referral = marriage?.referral_code ? referralLink(window.location.origin, marriage.referral_code) : null;
  const referralText = referral
    ? `Pour ton mariage, regarde WeddingStudio : faire-part en ligne, réponses des invités et plan de table depuis le téléphone. ${formatXof(REFERRAL_DISCOUNT_XOF)} offerts avec notre lien : ${referral}`
    : '';

  return (
    <div className="min-h-screen bg-ivory">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <header className="mb-8">
          <p className="eyebrow">Après le mariage</p>
          <h1 className="mt-2 text-3xl font-normal text-ink sm:text-4xl">Cartes de <span className="italic text-rose-500">remerciements</span></h1>
          <p className="mt-1 max-w-2xl text-slate-500">Une carte au nom de chaque invité venu, à envoyer sur WhatsApp. Ils peuvent la garder en photo{paid ? ' ou l’imprimer' : ''}.</p>
        </header>

        {missing && (
          <p className="mb-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Les cartes pourront être enregistrées et envoyées après la mise à jour de la base (migration 35).</p>
        )}
        {!open && (
          <p className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Préparez votre carte dès maintenant. Vos invités pourront l’ouvrir à partir du jour du mariage{weddingDate ? `, le ${formatWeddingDay(weddingDate)}` : ''}.
          </p>
        )}

        {/* Votre mariage en chiffres */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Users} label="Invités venus" value={persons(guests)} />
          <Stat icon={ImageIcon} label="Photos de l’album" value={photos.length} />
          <Stat icon={MessageSquareQuote} label="Mots du livre d’or" value={book.length} />
          <Stat icon={HeartHandshake} label="Cartes ouvertes" value={`${stats.opened} / ${stats.sent}`} />
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            {/* 1. Modèle */}
            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-xl text-ink">1. Le modèle</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {THANKS_TEMPLATES.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTemplate(t.id)} aria-pressed={template === t.id}
                    className={`rounded-2xl border p-4 text-left transition-all ${template === t.id ? 'border-ink bg-ivory ring-1 ring-ink' : 'border-slate-200 hover:border-slate-400'}`}>
                    <span className="flex items-center justify-between gap-2 font-display text-lg text-ink">{t.label}{template === t.id && <Check className="h-4 w-4" />}</span>
                    <span className="mt-1 block text-sm text-slate-500">{t.description}</span>
                  </button>
                ))}
              </div>
              {usesGuestMemories(template) && (
                <p className="mt-3 text-xs text-slate-500">Les photos et les messages sont retrouvés grâce au nom que l’invité a écrit. Vous pouvez les changer pour chaque invité ci-dessous. Sans photo à son nom, votre photo de couverture la remplace.</p>
              )}
              {template === 'statut' && (
                <p className="mt-2 text-xs text-slate-500">L’invité reçoit les trois écrans en images, prêts à publier sur son statut WhatsApp.</p>
              )}
              {template === 'generique' && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <h3 className="font-display text-lg text-ink">Le rôle de chaque table</h3>
                  <p className="mt-1 text-sm text-slate-500">Facultatif. Il s’affiche sous le nom de l’invité : « Dans le rôle de… ».</p>
                  {usedTables.length ? (
                    <div className="mt-3 space-y-2">
                      {usedTables.map(([id, name]) => (
                        <div key={id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                          <label htmlFor={`role-${id}`} className="w-32 shrink-0 truncate text-sm font-semibold text-ink">Table {name.replace(/^table\s+/i, '')}</label>
                          <input id={`role-${id}`} list="table-role-examples" value={roles[id] ?? ''} maxLength={TABLE_ROLE_MAX}
                            onChange={(e) => setRoles((prev) => ({ ...prev, [id]: e.target.value }))} placeholder="Par exemple : Les ambianceurs"
                            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-rose-400" />
                        </div>
                      ))}
                      <datalist id="table-role-examples">{TABLE_ROLE_EXAMPLES.map((r) => <option key={r} value={r} />)}</datalist>
                    </div>
                  ) : <p className="mt-2 text-sm text-slate-500">Placez vos invités à table dans le plan de table pour leur donner un rôle.</p>}
                </div>
              )}
            </section>

            {/* 2. Le mot */}
            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-xl text-ink">2. Votre mot</h2>
              <p className="mt-1 text-sm text-slate-500">Le même pour tous. Le prénom de l’invité et ses cérémonies s’ajoutent tout seuls.</p>
              <textarea id="thanks-message" value={message} onChange={(e) => setMessage(e.target.value.slice(0, THANKS_MESSAGE_MAX))} rows={5}
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-ivory/50 p-4 text-[15px] leading-relaxed text-ink outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/15" />
              <div className="mt-1 text-right text-[11px] text-slate-400">{message.length} / {THANKS_MESSAGE_MAX}</div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Exemples</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {THANKS_EXAMPLES.map((ex, i) => (
                  <button key={i} type="button" onClick={() => setMessage(ex)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${message === ex ? 'border-ink bg-ink text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                    Texte {i + 1}
                  </button>
                ))}
              </div>
              <button type="button" onClick={saveSettings} disabled={!settingsChanged || savingSettings || missing}
                className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40">
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {settingsChanged ? 'Enregistrer ma carte' : 'Carte enregistrée'}
              </button>
            </section>

            {/* 3. Les invités */}
            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl text-ink">3. Envoyer</h2>
                <span className="text-sm text-slate-500">{stats.sent} envoyée{stats.sent > 1 ? 's' : ''} sur {guests.length}</span>
              </div>
              {!guests.length ? (
                <p className="mt-4 rounded-xl bg-ivory p-4 text-sm text-slate-500">Les cartes s’envoient aux invités qui ont confirmé leur présence. Aucun pour l’instant.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {sorted.map((g) => {
                    const c = cards.get(g.id);
                    const expanded = openId === g.id;
                    return (
                      <li key={g.id} className="py-3">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => { setOpenId(expanded ? null : g.id); setPreviewId(g.id); }} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">{g.name}</span>
                              <span className="block text-xs text-slate-500">
                                {c?.opened_at ? <span className="text-emerald-700">Ouverte le {shortDate(c.opened_at)}</span>
                                  : c?.sent_at ? <>Envoyée le {shortDate(c.sent_at)}</>
                                    : g.phone ? 'À envoyer' : 'Pas de numéro : copiez le message'}
                              </span>
                            </span>
                          </button>
                          {g.phone ? (
                            <button type="button" onClick={() => send(g)} disabled={!open || missing}
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${c?.sent_at ? 'border border-slate-200 text-ink hover:border-ink' : 'bg-ink text-white hover:bg-rose-700'}`}>
                              <MessageCircle className="h-3.5 w-3.5" /> {c?.sent_at ? 'Renvoyer' : 'WhatsApp'}
                            </button>
                          ) : (
                            <button type="button" onClick={() => copyLink(g)} disabled={!open || missing}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-ink hover:border-ink disabled:pointer-events-none disabled:opacity-40">
                              {copied === g.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied === g.id ? 'Copié' : 'Copier'}
                            </button>
                          )}
                        </div>
                        {expanded && (
                          <GuestEditor
                            guest={g} template={template} paid={paid} disabled={missing}
                            photos={photos} book={book} card={c}
                            currentPhoto={photoFor(g)} currentQuote={quoteFor(g)}
                            onSave={(patch) => saveCard(g, patch)}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Statut du couple */}
            <section className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-xl text-ink">Votre statut « Merci à tous »</h2>
              <p className="mt-1 text-sm text-slate-500">Trois images à publier sur votre propre statut WhatsApp : votre photo, votre merci à tous vos invités et un souvenir de la journée.</p>
              <button type="button" onClick={shareEveryone} disabled={everyoneBusy}
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                {everyoneBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Créer mes images
              </button>
            </section>

            {/* Parrainage */}
            {referral && (
              <section className="rounded-[1.5rem] border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600"><Gift className="h-5 w-5" strokeWidth={1.6} /></span>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl text-ink">Faites plaisir à un couple ami</h2>
                    <p className="mt-1 text-sm text-slate-600">Vos cartes portent votre code <strong className="font-mono">{marriage?.referral_code}</strong> : {formatXof(REFERRAL_DISCOUNT_XOF)} offerts aux invités qui se marient bientôt, et {formatXof(REFERRAL_REWARD_XOF)} pour vous quand ils choisissent une formule.</p>
                    <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(referralText)}`} target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
                      <MessageCircle className="h-4 w-4" /> Partager mon lien
                    </a>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Aperçu */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-[1.5rem] bg-[#efe6d8] p-5 pt-8">
              <ThanksCard card={preview} />
              <p className="mt-4 text-center text-xs text-[#7d7268]">
                {previewGuest ? <>Aperçu de la carte de <strong>{previewGuest.name}</strong>. Ouvrez un invité pour voir la sienne.</> : 'Aperçu avec un invité d’exemple.'}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className="mt-1 font-display text-2xl text-ink tabular-nums">{value}</p>
    </div>
  );
}

function GuestEditor({ guest, template, paid, disabled, photos, book, card, currentPhoto, currentQuote, onSave }: {
  guest: Guest; template: ThanksTemplate; paid: boolean; disabled: boolean;
  photos: Photo[]; book: BookEntry[]; card: CardRow | undefined;
  currentPhoto: Photo | null; currentQuote: BookEntry | null;
  onSave: (patch: Partial<CardRow>) => Promise<boolean>;
}) {
  const [note, setNote] = useState(card?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // Photos à son nom d'abord, puis les autres
  const ordered = useMemo(() => {
    const mine = photos.filter((p) => p.file_name === currentPhoto?.file_name || bestMatch(guest.name, [p], (x) => x.guest_name));
    const others = photos.filter((p) => !mine.includes(p));
    return [...mine, ...others];
  }, [photos, guest.name, currentPhoto]);
  const shown = showAll ? ordered : ordered.slice(0, 8);

  return (
    <div className="mt-3 space-y-4 rounded-2xl bg-ivory p-4">
      {usesGuestMemories(template) && (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sa photo</p>
            {photos.length ? (
              <>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {shown.map((p) => {
                    const selected = currentPhoto?.file_name === p.file_name;
                    return (
                      <button key={p.file_name} type="button" disabled={disabled} onClick={() => onSave({ photo_file: p.file_name })} title={p.guest_name}
                        className={`relative aspect-square overflow-hidden rounded-lg ring-2 transition-all ${selected ? 'ring-ink' : 'ring-transparent hover:ring-slate-300'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={`Photo de ${p.guest_name}`} className="h-full w-full object-cover" loading="lazy" />
                        {selected && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-white"><Check className="h-3 w-3" /></span>}
                      </button>
                    );
                  })}
                </div>
                {ordered.length > 8 && (
                  <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 text-xs font-semibold text-slate-500 hover:text-ink">
                    {showAll ? 'Moins de photos' : `Voir les ${ordered.length} photos`}
                  </button>
                )}
              </>
            ) : <p className="mt-1 text-sm text-slate-500">Aucune photo dans l’album : votre photo de couverture sera utilisée.</p>}
          </div>
          <div>
            <label htmlFor={`quote-${guest.id}`} className="text-xs font-semibold uppercase tracking-wider text-slate-400">Son message du livre d’or</label>
            <select id={`quote-${guest.id}`} disabled={disabled || !book.length} value={currentQuote?.id ?? ''}
              onChange={(e) => onSave({ quote_id: e.target.value || null })}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink">
              <option value="">{book.length ? 'Aucun message' : 'Aucun message dans le livre d’or'}</option>
              {book.map((b) => <option key={b.id} value={b.id}>{b.author_name || 'Anonyme'} : {b.message?.slice(0, 70)}</option>)}
            </select>
          </div>
        </>
      )}
      <div>
        <label htmlFor={`note-${guest.id}`} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Mot personnel {!paid && <Crown className="h-3.5 w-3.5 text-amber-500" />}
        </label>
        {paid ? (
          <>
            <textarea id={`note-${guest.id}`} value={note} onChange={(e) => setNote(e.target.value.slice(0, THANKS_NOTE_MAX))} rows={2} disabled={disabled}
              placeholder="Par exemple : Merci pour le pagne offert, il est magnifique !"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-ink outline-none focus:border-rose-400" />
            <button type="button" disabled={disabled || saving || note.trim() === (card?.note ?? '').trim()}
              onClick={async () => { setSaving(true); await onSave({ note: note.trim() || null }); setSaving(false); }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Enregistrer le mot
            </button>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Un mot rien que pour cet invité, avec les formules payantes. <Link href="/dashboard/premium" className="font-semibold text-rose-600 hover:underline">Voir les formules</Link></p>
        )}
      </div>
    </div>
  );
}
