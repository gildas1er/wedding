"use client";

// Écran de bienvenue (première connexion) : montrer tout de suite que chaque invité reçoit
// une invitation à son nom. Le couple parcourt les modèles, tape le nom d'un proche,
// voit l'invitation telle que ce proche la recevra (la vraie page RSVP en aperçu),
// puis la lui envoie sur WhatsApp. Affiché une seule fois (marriages.onboarded_at) ;
// s'il est fermé en cours de route, il reprend à l'étape atteinte.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, MessageCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../app/lib/supabase';
import { INVITATION_TEMPLATES, coupleInitials, resolveTemplate, type InvitationTemplate } from '../../lib/invitation-templates';
import { normalizePhone, whatsappLink } from '../../lib/phone';
import { buildInvitationMessage } from '../../lib/whatsapp-message';
import { isGuestLimitError } from '../../lib/plan';
import { daysUntil } from '../../lib/planning';
import { forgetMarriage } from '../../lib/current-marriage';

export type WelcomeMarriage = {
  id: string;
  partner_1_name?: string | null;
  partner_2_name?: string | null;
  wedding_date?: string | null;
  invitation_template?: string | null;
  whatsapp_message?: string | null;
};

type StepId = 'hook' | 'identity' | 'models' | 'preview' | 'send' | 'done';

// Ordre d'affichage des modèles : les plus spectaculaires d'abord
const TEMPLATE_ORDER: InvitationTemplate[] = ['enveloppe', 'avant_premiere', 'story', 'classique'];
const SAMPLE_NAMES = ['Maman', 'Tonton Konan', 'Aya Traoré'];
const DECK_NAMES = ['Tantie Adjoua', 'Tonton Konan', 'Aya Traoré', 'Maman', 'Ibrahim Koné', 'Mme Yao Affoué', 'Cousin Serge', 'Fatou Diabaté'];
const DEFAULT_GUEST = 'Tantie Adjoua';

// Aperçu : la page RSVP est rendue dans un « téléphone » de 390 × 680, réduit de moitié
const FRAME_W = 390;
const FRAME_H = 680;
const SMALL_SCALE = 0.5;

const storageKey = (id: string) => `ws-welcome-${id}`;
const placeholderName = (v?: string | null) => !v?.trim() || /^partenaire [12]$/i.test(v.trim());

function loadProgress(id: string): { step?: StepId; tpl?: InvitationTemplate; guest?: string; sent?: boolean } {
  try { return JSON.parse(localStorage.getItem(storageKey(id)) || '{}'); } catch { return {}; }
}

export default function WelcomeFlow({ marriage, needsIdentity, onFinish }: {
  marriage: WelcomeMarriage;
  needsIdentity: boolean; // inscription Google / Facebook : prénoms et date à demander
  onFinish: (changed: boolean) => void; // changed : un invité a été ajouté ou la fiche modifiée
}) {
  const reduce = useReducedMotion();
  const steps = useMemo<StepId[]>(
    () => (needsIdentity ? ['hook', 'identity', 'models', 'preview', 'send', 'done'] : ['hook', 'models', 'preview', 'send', 'done']),
    [needsIdentity]
  );
  const saved = useMemo(() => (typeof window === 'undefined' ? {} : loadProgress(marriage.id)), [marriage.id]);

  const [step, setStep] = useState<StepId>(() => (saved.step && steps.includes(saved.step) && saved.step !== 'done' ? saved.step : 'hook'));
  const [tpl, setTpl] = useState<InvitationTemplate>(() => {
    if (saved.tpl) return resolveTemplate(saved.tpl);
    const current = resolveTemplate(marriage.invitation_template);
    return current === 'classique' ? 'enveloppe' : current;
  });
  const [guest, setGuest] = useState(saved.guest || DEFAULT_GUEST);
  const [p1, setP1] = useState(placeholderName(marriage.partner_1_name) ? '' : (marriage.partner_1_name ?? '').trim().split(/\s+/)[0]);
  const [p2, setP2] = useState(placeholderName(marriage.partner_2_name) ? '' : (marriage.partner_2_name ?? '').trim());
  const [date, setDate] = useState(needsIdentity ? '' : (marriage.wedding_date ?? '').slice(0, 10));
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(Boolean(saved.sent));
  const [waUrl, setWaUrl] = useState<string | null>(null); // lien WhatsApp si le navigateur a bloqué l'ouverture
  const [pendingGuestId, setPendingGuestId] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const couple = [p1 || marriage.partner_1_name, p2 || marriage.partner_2_name].filter((v) => v && !placeholderName(v)).join(' & ');
  const initials = coupleInitials(p1 || marriage.partner_1_name, p2 || marriage.partner_2_name);
  const guestName = guest.trim() || DEFAULT_GUEST;
  const index = steps.indexOf(step);

  // Reprise : on garde l'étape atteinte, le modèle et le nom tapé
  useEffect(() => {
    try { localStorage.setItem(storageKey(marriage.id), JSON.stringify({ step, tpl, guest, sent })); } catch { /* navigation privée */ }
  }, [marriage.id, step, tpl, guest, sent]);

  // Pas de défilement du tableau de bord derrière
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const go = (id: StepId) => { setError(null); setStep(id); };
  const next = () => go(steps[Math.min(index + 1, steps.length - 1)]);
  const back = () => go(steps[Math.max(index - 1, 0)]);

  const finish = async () => {
    setBusy(true);
    // Colonne de la migration 26 : sans elle, le navigateur retient que la bienvenue est passée
    await supabase.from('marriages').update({ onboarded_at: new Date().toISOString() }).eq('id', marriage.id);
    try { localStorage.setItem(`${storageKey(marriage.id)}-done`, '1'); localStorage.removeItem(storageKey(marriage.id)); } catch { /* navigation privée */ }
    forgetMarriage();
    setBusy(false);
    onFinish(changed);
  };

  const saveIdentity = async () => {
    if (!p1.trim() || !p2.trim()) { setError('Indiquez vos deux prénoms.'); return; }
    const days = daysUntil(date);
    if (!date || days === null || days < 0) { setError('Choisissez une date à venir. Vous pourrez la changer plus tard.'); return; }
    setBusy(true);
    const { error: e } = await supabase.from('marriages')
      .update({ partner_1_name: p1.trim(), partner_2_name: p2.trim(), wedding_date: date })
      .eq('id', marriage.id);
    setBusy(false);
    if (e) { setError("L'enregistrement a échoué. Vérifiez votre connexion puis réessayez."); return; }
    setChanged(true);
    next();
  };

  const chooseTemplate = async () => {
    // Le modèle choisi devient celui du faire-part (modifiable ensuite dans le Studio)
    if (resolveTemplate(marriage.invitation_template) !== tpl) {
      const { error: e } = await supabase.from('marriages').update({ invitation_template: tpl }).eq('id', marriage.id);
      if (!e) setChanged(true);
    }
  };

  const markSent = async (id: string) => {
    await supabase.from('invite').update({ invitation_sent: true }).eq('id', id);
    setSent(true);
    go('done');
  };

  const sendInvitation = async () => {
    setError(null);
    const name = guestName;
    const normalized = normalizePhone(phone);
    if (!normalized) { setError("Ce numéro WhatsApp n'est pas valide. Exemple : 07 00 00 00 00."); return; }
    setBusy(true);
    const { data, error: e } = await supabase.from('invite')
      .insert([{ marriage_id: marriage.id, name, phone: normalized, guests_count: 1, side: 'partenaire_1', status: 'en_attente', category: 'parents', is_vip: false, notes: '' }])
      .select('id')
      .single();
    setBusy(false);
    if (e || !data) {
      if (e?.code === '23505') setError('Ce numéro est déjà dans votre liste d’invités.');
      else if (isGuestLimitError(e)) setError("La limite d'invités de votre formule est atteinte.");
      else setError("L'invité n'a pas pu être ajouté. Vérifiez votre connexion puis réessayez.");
      return;
    }
    setChanged(true);
    const message = buildInvitationMessage(marriage.whatsapp_message, {
      prenom: name,
      maries: couple,
      lien: `${window.location.origin}/rsvp/${marriage.id}?guest=${data.id}`,
    });
    const url = whatsappLink(normalized, message);
    if (!url) { setError("Ce numéro WhatsApp n'est pas valide."); return; }
    // Après l'enregistrement, certains navigateurs (iPhone) bloquent l'ouverture automatique :
    // on affiche alors un vrai lien à toucher
    const win = window.open(url, '_blank');
    if (win) { await markSent(data.id); return; }
    setPendingGuestId(data.id);
    setWaUrl(url);
  };

  // Confettis à l'arrivée sur la dernière étape
  useEffect(() => {
    if (step !== 'done' || reduce) return;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.35 }, colors: ['#9e3a55', '#b38c4a', '#dcc28a', '#ffffff'], zIndex: 200 });
  }, [step, reduce]);

  const dark = step === 'hook';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Bienvenue sur WeddingStudio">
      <div className={`relative flex h-full w-full flex-col overflow-hidden sm:h-[min(860px,94dvh)] sm:max-w-[440px] sm:rounded-[2rem] sm:shadow-2xl ${dark ? 'text-white' : 'bg-ivory text-ink'}`}
        style={dark ? { background: 'radial-gradient(120% 80% at 50% 0%, #5a1f31 0%, #2a1219 55%, #1a0e12 100%)' } : undefined}>

        {/* Progression + « Plus tard » */}
        {step !== 'preview' && (
          <div className="relative z-10 flex items-center gap-3 px-5 pb-1 pt-[max(env(safe-area-inset-top),16px)]">
            {index > 0 && step !== 'done' ? (
              <button onClick={back} aria-label="Étape précédente" className={`-ml-2 rounded-full p-2 ${dark ? 'text-white/70' : 'text-slate-500 hover:text-ink'}`}><ArrowLeft size={18} /></button>
            ) : <span className="w-[34px]" />}
            <div className="flex flex-1 justify-center gap-1.5" aria-hidden>
              {steps.map((s, i) => (
                <span key={s} className={`h-1 w-6 rounded-full transition-colors ${i <= index ? (dark ? 'bg-amber-300' : 'bg-rose-500') : (dark ? 'bg-white/20' : 'bg-ink/10')}`} />
              ))}
            </div>
            {step !== 'done' ? (
              <button onClick={finish} disabled={busy} className={`rounded-full px-2 py-1.5 text-xs font-semibold ${dark ? 'text-white/65 hover:text-white' : 'text-slate-500 hover:text-ink'}`}>Plus tard</button>
            ) : <span className="w-[34px]" />}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {step === 'hook' && (
              <Screen>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">{couple ? `Bienvenue ${couple}` : 'Bienvenue'}</p>
                <h2 className="mt-2 font-display text-[1.85rem] leading-[1.1]">Chacun de vos invités reçoit <em className="text-amber-300">une invitation à son nom.</em></h2>
                <EnvelopeDeck initials={initials} reduce={Boolean(reduce)} />
                <p className="text-center text-sm text-white/75">Chaque enveloppe porte le nom d&apos;un invité différent.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[13px] leading-snug">
                  <div className="rounded-2xl bg-white/[0.07] p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Une image sur WhatsApp</p>
                    La même pour tous. Peu de réponses, vous ne savez pas qui vient.
                  </div>
                  <div className="rounded-2xl bg-amber-300/[0.16] p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">WeddingStudio</p>
                    Une carte à son nom. Il répond en un geste, vous voyez qui vient.
                  </div>
                </div>
                <Footer plain>
                  <Cta onClick={next} gold>Voir les modèles <ArrowRight size={17} /></Cta>
                </Footer>
              </Screen>
            )}

            {step === 'identity' && (
              <Screen>
                <Eyebrow>Faisons connaissance</Eyebrow>
                <Title>Vos prénoms et la date du grand jour</Title>
                <p className="text-sm text-slate-500">Ils s&apos;afficheront sur toutes vos invitations.</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Field label="Votre prénom"><input value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="given-name" maxLength={40} className={inputCls} /></Field>
                  <Field label="Son prénom"><input value={p2} onChange={(e) => setP2(e.target.value)} maxLength={40} className={inputCls} /></Field>
                </div>
                <Field label="Date du mariage" className="mt-3"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
                <ErrorText error={error} />
                <Footer>
                  <Cta onClick={saveIdentity} disabled={busy}>Continuer <ArrowRight size={17} /></Cta>
                </Footer>
              </Screen>
            )}

            {step === 'models' && (
              <Screen>
                <Eyebrow>Votre modèle</Eyebrow>
                <Title>Choisissez comment vos invités découvriront votre mariage</Title>
                <div className="mt-3 grid grid-cols-2 gap-1.5" role="group" aria-label="Modèle d'invitation">
                  {TEMPLATE_ORDER.map((id) => (
                    <button key={id} onClick={() => setTpl(id)} aria-pressed={tpl === id}
                      className={`rounded-xl border-[1.5px] px-1 py-2 text-[13px] font-semibold transition-colors ${tpl === id ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-ink hover:border-slate-300'}`}>
                      {INVITATION_TEMPLATES.find((t) => t.id === id)?.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-center">
                  <PreviewFrame marriageId={marriage.id} tpl={tpl} guest={guestName} scale={SMALL_SCALE} />
                </div>
                <p className="mt-3 min-h-[2.6em] text-center text-[13px] leading-snug text-slate-600">{INVITATION_TEMPLATES.find((t) => t.id === tpl)?.description}</p>
                <Field label="Essayez avec le nom d'un de vos invités" className="mt-4">
                  <input value={guest} onChange={(e) => setGuest(e.target.value)} maxLength={60} className={`${inputCls} border-amber-300`} />
                </Field>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SAMPLE_NAMES.map((n) => (
                    <button key={n} onClick={() => setGuest(n)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-rose-300">{n}</button>
                  ))}
                </div>
                <Footer>
                  <Cta onClick={async () => { await chooseTemplate(); next(); }}>Voir son invitation en grand <ArrowRight size={17} /></Cta>
                </Footer>
              </Screen>
            )}

            {step === 'preview' && (
              <div className="relative flex min-h-0 flex-1 flex-col bg-white">
                <PreviewFrame marriageId={marriage.id} tpl={tpl} guest={guestName} full />
                {/* Commandes en bas : le haut de l'aperçu porte déjà les boutons de la page d'invitation */}
                <div className="border-t border-slate-100 bg-white px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <button onClick={back} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-ink"><ArrowLeft size={15} /> Modèles</button>
                    <p className="truncate text-[13px] text-slate-500">Ce que verra <strong className="text-ink">{guestName}</strong></p>
                  </div>
                  <Cta onClick={next}>Lui envoyer pour de vrai <ArrowRight size={17} /></Cta>
                </div>
              </div>
            )}

            {step === 'send' && (
              <Screen>
                <Eyebrow>Premier envoi</Eyebrow>
                <Title>On l&apos;envoie à <em className="text-rose-500">{guestName}</em> ?</Title>
                <p className="text-sm text-slate-500">Son invitation l&apos;attend déjà. Il ne manque que son numéro.</p>
                {waUrl ? (
                  <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                    <p className="font-semibold">{guestName} est dans votre liste.</p>
                    <p className="mt-1">Touchez le bouton ci-dessous pour ouvrir WhatsApp avec son invitation.</p>
                  </div>
                ) : (
                  <>
                    <Field label="Nom de l'invité" className="mt-5"><input value={guest} onChange={(e) => setGuest(e.target.value)} maxLength={60} className={inputCls} /></Field>
                    <Field label="Numéro WhatsApp" className="mt-3"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="07 00 00 00 00" className={inputCls} /></Field>
                  </>
                )}
                <ErrorText error={error} />
                <p className="mt-4 rounded-2xl bg-amber-100/70 p-3 text-[13px] leading-snug text-slate-600">
                  Ensuite, ajoutez vos autres invités depuis vos contacts : <strong className="text-amber-700">chacun recevra sa propre carte</strong>, et vous verrez qui a répondu.
                </p>
                <Footer>
                  {waUrl ? (
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={() => pendingGuestId && markSent(pendingGuestId)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1fa855] py-4 text-[15px] font-semibold text-white">
                      <MessageCircle size={18} /> Ouvrir WhatsApp
                    </a>
                  ) : (
                    <button onClick={sendInvitation} disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1fa855] py-4 text-[15px] font-semibold text-white disabled:opacity-60">
                      <MessageCircle size={18} /> {busy ? 'Préparation…' : 'Envoyer sur WhatsApp'}
                    </button>
                  )}
                  <button onClick={() => go('done')} className="mt-1 w-full py-2.5 text-sm font-semibold text-slate-500 hover:text-ink">Je le ferai plus tard</button>
                </Footer>
              </Screen>
            )}

            {step === 'done' && (
              <Screen>
                <div className="mt-2 text-center text-5xl" aria-hidden>{sent ? '💌' : '✨'}</div>
                <h2 className="mt-3 text-center font-display text-[1.7rem] leading-tight">
                  {sent ? <>L&apos;invitation de <em className="text-rose-500">{guestName}</em> est partie !</> : <>Votre faire-part est prêt</>}
                </h2>
                <p className="mt-2 text-center text-sm text-slate-500">
                  {sent ? 'Vous verrez sa réponse dans votre liste d’invités.' : 'Vous pourrez l’envoyer à vos invités depuis votre liste, quand vous voulez.'}
                </p>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold">Votre parcours</p>
                    <p className="text-sm font-semibold text-rose-500">{sent ? 2 : 1} / 5</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500" style={{ width: `${(sent ? 2 : 1) * 20}%` }} /></div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {[['Choisir votre modèle de faire-part', true], ['Envoyer une première invitation', sent], ['Ajouter 10 invités', false], ['Recevoir une première réponse', false], ['Ajouter votre photo de couverture', false]].map(([label, done]) => (
                      <li key={label as string} className={`flex items-center gap-2.5 ${done ? 'text-slate-400 line-through' : ''}`}>
                        <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] ${done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>{done && <Check size={11} strokeWidth={3} />}</span>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
                <Footer>
                  <Cta onClick={finish} disabled={busy}>Entrer dans mon espace <ArrowRight size={17} /></Cta>
                </Footer>
              </Screen>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Aperçu : la vraie page RSVP du couple, en mode aperçu, alimentée par postMessage ── */
function PreviewFrame({ marriageId, tpl, guest, scale = 1, full = false }: {
  marriageId: string; tpl: InvitationTemplate; guest: string; scale?: number; full?: boolean;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  const send = useCallback(() => {
    ref.current?.contentWindow?.postMessage({ type: 'studio-preview', config: { invitation_template: tpl, preview_guest_name: guest } }, window.location.origin);
  }, [tpl, guest]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== ref.current?.contentWindow) return;
      if (e.data?.type === 'studio-preview-ready') { setReady(true); send(); }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [send]);

  // Changement de modèle ou de nom : mise à jour en direct
  useEffect(() => { if (ready) send(); }, [ready, send]);

  if (full) {
    return (
      <div className="relative min-h-0 flex-1">
        <iframe ref={ref} src={`/rsvp/${marriageId}?preview=1`} title={`Aperçu de l'invitation de ${guest}`} className="absolute inset-0 h-full w-full border-0" />
        {!ready && <div className="absolute inset-0 animate-pulse bg-rose-50" />}
      </div>
    );
  }
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[18px] bg-white shadow-[0_12px_28px_-14px_rgba(60,20,30,0.55)] ring-4 ring-ink"
      style={{ width: FRAME_W * scale, height: FRAME_H * scale }} aria-hidden>
      <iframe ref={ref} src={`/rsvp/${marriageId}?preview=1`} tabIndex={-1} title="Aperçu du modèle"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }} />
      {!ready && <div className="absolute inset-0 animate-pulse bg-rose-50" />}
    </div>
  );
}

/* ── Enveloppes qui défilent, chacune au nom d'un invité ── */
function EnvelopeDeck({ initials, reduce }: { initials: string[]; reduce: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setI((n) => n + 1), 1900);
    return () => window.clearInterval(t);
  }, [reduce]);
  const seal = initials.length ? initials.join('&') : '♡';
  return (
    <div className="relative mx-auto my-5 h-[200px] w-full max-w-[280px]" aria-hidden>
      <AnimatePresence initial={false}>
        {[2, 1, 0].map((depth) => {
          const k = i + depth;
          return (
            <motion.div
              key={k}
              className="absolute inset-x-0 top-6 mx-auto aspect-[7/5] w-[250px] overflow-hidden rounded-[10px] bg-rose-700 shadow-[0_24px_40px_-16px_rgba(0,0,0,0.6)]"
              initial={{ y: -60, scale: 0.8, opacity: 0 }}
              animate={{ y: depth * -28, scale: 1 - depth * 0.08, opacity: 1 - depth * 0.28, zIndex: 3 - depth }}
              exit={{ y: 120, rotate: -8, opacity: 0, zIndex: 4 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <svg viewBox="0 0 140 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <path d="M0,0 L70,56 L0,100 Z" className="fill-rose-600" />
                <path d="M140,0 L70,56 L140,100 Z" className="fill-rose-600" />
                <path d="M0,100 L70,50 L140,100 Z" className="fill-rose-500" />
                <path d="M0,0 L140,0 L70,58 Z" className="fill-rose-700" />
              </svg>
              <span className="absolute left-1/2 top-[44%] grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-display text-sm italic text-amber-900"
                style={{ background: 'radial-gradient(circle at 35% 30%, #f0d9a0, #b38c4a 60%, #8a6a30)' }}>{seal}</span>
              <span className="absolute inset-x-0 bottom-3.5 text-center font-display text-[17px] italic text-white/90">Pour {DECK_NAMES[k % DECK_NAMES.length]}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ── Petits éléments de mise en page ── */
const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-ink outline-none transition-colors focus:border-rose-400';

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">{children}</div>;
}
// Bouton principal toujours visible en bas, même quand l'écran défile (petits téléphones)
function Footer({ children, plain }: { children: React.ReactNode; plain?: boolean }) {
  return <div className={`mt-auto pt-5 ${plain ? '' : 'sticky bottom-0 -mx-5 bg-gradient-to-t from-ivory from-80% to-ivory/0 px-5'}`}>{children}</div>;
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600">{children}</p>;
}
function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-1.5 font-display text-[1.45rem] leading-[1.15]">{children}</h2>;
}
function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
function ErrorText({ error }: { error: string | null }) {
  return error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null;
}
function Cta({ children, onClick, disabled, gold }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; gold?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-semibold transition-opacity disabled:opacity-60 ${gold ? 'bg-gradient-to-r from-amber-300 to-amber-500 text-rose-950' : 'bg-rose-500 text-white hover:bg-rose-600'}`}>
      {children}
    </button>
  );
}
