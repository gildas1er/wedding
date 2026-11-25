"use client";

// Guide pas à pas de la première connexion (remplace l'ancien écran de bienvenue).
// Le vrai bouton à toucher est mis en lumière (le reste de l'écran est flouté), avec une phrase et « Suivant ».
// Les éléments ciblés portent un attribut data-guide="…" dans les pages (menu, Studio, Invités).
// Avancement gardé dans le navigateur (reprise à l'étape atteinte) ; fin ou « Passer le guide » :
// marriages.onboarded_at (migration 26). « Revoir le guide » dans le menu le relance (événement ws-guide-restart).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../app/lib/supabase';
import { forgetMarriage, getSessionUser, loadMarriage } from '../../lib/current-marriage';

type Step = {
  id: string;
  text: React.ReactNode;
  target?: string;            // valeur de data-guide
  page?: string;              // page où se trouve la cible
  go?: string;                // « Y aller » : page à ouvrir (étape du menu)
  cta?: string | null;        // bouton de la bulle (null : on attend une action)
  passiveOnClick?: boolean;   // après un toucher sur la cible, le guide s'efface (fenêtre d'ajout, WhatsApp…)
  waitGuests?: boolean;       // passe à la suite dès qu'un invité est enregistré
  nextOnClick?: boolean;      // passe à la suite dès que la cible est touchée
};

const STEPS: Step[] = [
  { id: 'nav-studio', target: 'nav-studio', go: '/dashboard/studio', cta: 'Y aller',
    text: <>Étape 1 : choisissez <b>le modèle de votre invitation</b>.</> },
  { id: 'studio-templates', page: '/dashboard/studio', target: 'studio-templates', cta: 'Suivant',
    text: <>Touchez un modèle : l&apos;aperçu montre <b>l&apos;invitation telle que vos invités la recevront</b>.</> },
  { id: 'studio-cover', page: '/dashboard/studio', target: 'studio-cover', cta: 'Suivant',
    text: <>Étape 2 : ajoutez <b>votre photo de couverture</b>, la première image que vos invités verront.</> },
  { id: 'studio-publish', page: '/dashboard/studio', target: 'studio-publish', cta: 'Suivant', nextOnClick: true,
    text: <>Publiez : vos invités verront <b>ce modèle et cette photo</b>.</> },
  { id: 'nav-invite', target: 'nav-invite', go: '/dashboard/invite', cta: 'Y aller',
    text: <>Étape 3 : ajoutez <b>vos invités</b>.</> },
  { id: 'invite-add', page: '/dashboard/invite', target: 'invite-add', cta: null, passiveOnClick: true, waitGuests: true,
    text: <>Ajoutez un premier proche, un par un ou <b>depuis les contacts de votre téléphone</b>. Le guide continue dès qu&apos;il est enregistré.</> },
  { id: 'invite-whatsapp', page: '/dashboard/invite', target: 'invite-whatsapp', cta: 'Compris', passiveOnClick: true, nextOnClick: true,
    text: <>Étape 4 : envoyez-lui <b>son invitation à son nom</b> sur WhatsApp.</> },
];

type Phase = 'off' | 'welcome' | 'step' | 'done';
const storeKey = (id: string) => `ws-guide-${id}`;
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } };

// Premier élément visible portant data-guide="name" (le menu existe en double : ordinateur et tiroir)
function findTarget(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-guide="${name}"]`));
  return all.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) ?? null;
}

export default function GuidedTour({ openDrawer, closeDrawer, disabled }: { openDrawer: () => void; closeDrawer: () => void; disabled?: boolean }) {
  const pathname = usePathname() ?? '/dashboard';
  const router = useRouter();
  const [marriageId, setMarriageId] = useState<string | null>(null);
  const [couple, setCouple] = useState('');
  const [phase, setPhase] = useState<Phase>('off');
  const [index, setIndex] = useState(0);
  const [passive, setPassive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [identity, setIdentity] = useState<{ p1: string; p2: string; date: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = phase === 'step' ? STEPS[index] : null;
  const scrolled = useRef<string | null>(null);

  // Démarrage : première connexion (onboarded_at vide, mariage à venir) ou reprise à l'étape atteinte
  useEffect(() => {
    if (disabled) return;
    let alive = true;
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return;
      const { data: m } = await loadMarriage(user.id);
      if (!m || !alive) return;
      setMarriageId(m.id);
      setCouple([m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & '));
      const saved = read(storeKey(m.id));
      if (saved === 'done' || read(`ws-welcome-${m.id}-done`) === '1') return;
      if (saved) {
        const i = STEPS.findIndex((s) => s.id === saved);
        if (i >= 0) { setIndex(i); setPhase('step'); return; }
      }
      if (!('onboarded_at' in m) || m.onboarded_at) return;
      if (m.wedding_date && new Date(m.wedding_date).getTime() < Date.now() - 86_400_000) return;
      const meta = user.user_metadata ?? {};
      const placeholder = (v?: string | null) => !v?.trim() || /^partenaire [12]$/i.test(v.trim());
      if (!meta.wedding_date || placeholder(m.partner_1_name) || placeholder(m.partner_2_name)) {
        setIdentity({ p1: placeholder(m.partner_1_name) ? '' : m.partner_1_name, p2: placeholder(m.partner_2_name) ? '' : m.partner_2_name, date: m.wedding_date?.slice(0, 10) ?? '' });
      }
      setPhase('welcome');
    })();
    return () => { alive = false; };
  }, [disabled]);

  // « Revoir le guide » depuis le menu
  useEffect(() => {
    const restart = () => { setIdentity(null); setIndex(0); setPassive(false); setPhase('welcome'); };
    window.addEventListener('ws-guide-restart', restart);
    return () => window.removeEventListener('ws-guide-restart', restart);
  }, []);

  const finish = useCallback(async (completed: boolean) => {
    if (!marriageId) { setPhase('off'); return; }
    write(storeKey(marriageId), 'done');
    setPhase(completed ? 'done' : 'off');
    if (completed) confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    await supabase.from('marriages').update({ onboarded_at: new Date().toISOString() }).eq('id', marriageId).then(() => undefined, () => undefined);
  }, [marriageId]);

  const goTo = useCallback((i: number) => {
    setPassive(false);
    scrolled.current = null;
    if (i >= STEPS.length) { finish(true); return; }
    setIndex(i);
    setPhase('step');
    if (marriageId) write(storeKey(marriageId), STEPS[i].id);
  }, [finish, marriageId]);

  // Étape du menu : on passe à la suite en arrivant sur la page visée
  useEffect(() => {
    if (step?.go && (pathname === step.go || pathname.startsWith(`${step.go}/`))) Promise.resolve().then(() => goTo(index + 1));
  }, [pathname, step, index, goTo]);

  // Étape du menu sur téléphone : le tiroir s'ouvre pour montrer l'entrée ; sinon il reste fermé
  // (la cible est dans la page, sous le tiroir)
  useEffect(() => {
    if (step && !step.go) { closeDrawer(); return; }
    if (!step?.go || passive) return;
    const t = setTimeout(() => { if (!findTarget(step.target!) && window.innerWidth < 1024) openDrawer(); }, 300);
    return () => clearTimeout(t);
  }, [step, passive, openDrawer, closeDrawer]);

  // Position de la cible (suivie pendant le défilement et les animations)
  const onPage = Boolean(step && (!step.page || pathname === step.page));
  useEffect(() => {
    if (!step?.target || !onPage) { Promise.resolve().then(() => setRect(null)); return; }
    let raf = 0;
    const tick = () => {
      const el = findTarget(step.target!);
      if (el && scrolled.current !== step.id) {
        scrolled.current = step.id;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      const r = el?.getBoundingClientRect() ?? null;
      setRect((prev) => (prev && r && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height ? prev : r));
      raf = window.setTimeout(tick, 200) as unknown as number;
    };
    tick();
    return () => clearTimeout(raf);
  }, [step, onPage]);

  // Toucher sur la cible : le guide s'efface (fenêtre d'ajout) ou passe à la suite (Publier, WhatsApp)
  useEffect(() => {
    if (!step?.target) return;
    const onClick = (e: MouseEvent) => {
      const hit = (e.target as HTMLElement | null)?.closest?.(`[data-guide="${step.target}"]`);
      if (!hit) return;
      if (step.nextOnClick) setTimeout(() => goTo(index + 1), 400);
      else if (step.passiveOnClick) setPassive(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [step, index, goTo]);

  // Premier invité enregistré : étape suivante
  useEffect(() => {
    if (!step?.waitGuests || !marriageId) return;
    let stop = false;
    const check = async () => {
      const { count } = await supabase.from('invite').select('id', { count: 'exact', head: true }).eq('marriage_id', marriageId);
      if (!stop && (count ?? 0) > 0) goTo(index + 1);
    };
    check();
    const timer = setInterval(check, 3000);
    window.addEventListener('ws-guests-changed', check);
    return () => { stop = true; clearInterval(timer); window.removeEventListener('ws-guests-changed', check); };
  }, [step, marriageId, index, goTo]);

  const start = async () => {
    setError(null);
    if (identity && marriageId) {
      if (!identity.p1.trim() || !identity.p2.trim()) { setError('Indiquez vos deux prénoms.'); return; }
      if (!identity.date || new Date(identity.date).getTime() < Date.now() - 86_400_000) { setError('Choisissez une date à venir. Vous pourrez la changer plus tard.'); return; }
      setBusy(true);
      const { error: e } = await supabase.from('marriages')
        .update({ partner_1_name: identity.p1.trim(), partner_2_name: identity.p2.trim(), wedding_date: identity.date }).eq('id', marriageId);
      setBusy(false);
      if (e) { setError("L'enregistrement a échoué. Vérifiez votre connexion puis réessayez."); return; }
      setCouple(`${identity.p1.trim()} & ${identity.p2.trim()}`);
      forgetMarriage();
      setIdentity(null);
    }
    goTo(0);
  };

  if (phase === 'off') return null;

  /* ── Bienvenue et fin : carte au centre ── */
  if (phase === 'welcome' || phase === 'done') {
    return (
      <div className="fixed inset-0 z-[150] grid place-items-center bg-ink/45 p-4 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} role="dialog" aria-modal="true" aria-labelledby="guide-title"
          className="w-full max-w-sm rounded-[1.75rem] bg-white p-6 text-center shadow-2xl">
          {phase === 'welcome' ? (
            <>
              <h2 id="guide-title" className="font-display text-2xl text-ink">Bienvenue{couple && !identity ? ` ${couple}` : ''} !</h2>
              <p className="mt-1 text-sm text-slate-500">Votre mariage est prêt en 4 étapes. On vous guide.</p>
              {identity && (
                <div className="mt-4 grid gap-2 text-left">
                  <div className="grid grid-cols-2 gap-2">
                    <input aria-label="Prénom de la mariée" placeholder="Prénom de la mariée" value={identity.p1} onChange={(e) => setIdentity({ ...identity, p1: e.target.value })} maxLength={40} className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] outline-none focus:border-rose-400" />
                    <input aria-label="Prénom du marié" placeholder="Prénom du marié" value={identity.p2} onChange={(e) => setIdentity({ ...identity, p2: e.target.value })} maxLength={40} className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] outline-none focus:border-rose-400" />
                  </div>
                  <label className="text-xs font-semibold text-slate-500">Date du mariage
                    <input type="date" value={identity.date} onChange={(e) => setIdentity({ ...identity, date: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] text-ink outline-none focus:border-rose-400" />
                  </label>
                </div>
              )}
              <ol className="mt-4 grid gap-2 text-left text-sm text-ink">
                {['Choisir votre invitation', 'Ajouter votre photo de couverture', 'Ajouter vos invités', 'Envoyer la première invitation'].map((t, i) => (
                  <li key={t} className="flex items-center gap-2.5"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-50 text-xs font-bold text-rose-600">{i + 1}</span>{t}</li>
                ))}
              </ol>
              {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
              <button type="button" onClick={start} disabled={busy} className="mt-5 min-h-[48px] w-full rounded-xl bg-ink text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">Commencer</button>
              <button type="button" onClick={() => finish(false)} className="mt-2 min-h-[40px] w-full text-sm font-semibold text-slate-500 hover:text-ink">Je découvrirai seul</button>
            </>
          ) : (
            <>
              <h2 id="guide-title" className="font-display text-2xl text-ink">Votre mariage est lancé !</h2>
              <p className="mt-2 text-sm text-slate-500">Votre première invitation est partie. Ajoutez vos autres proches et suivez leurs réponses depuis le tableau de bord.</p>
              <button type="button" onClick={() => { setPhase('off'); router.push('/dashboard'); }} className="mt-5 min-h-[48px] w-full rounded-xl bg-ink text-sm font-semibold text-white hover:bg-rose-700">Voir mon tableau de bord</button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (!step) return null;
  const dots = (
    <div className="flex justify-center gap-1.5" aria-label={`Étape ${index + 1} sur ${STEPS.length}`}>
      {STEPS.map((s, i) => <i key={s.id} className={`h-1.5 rounded-full ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/35'}`} />)}
    </div>
  );

  /* ── Hors de la page de l'étape, ou guide effacé : petite barre de reprise ── */
  if (passive || !onPage || (step.target && !rect && !step.go)) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[150] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none print:hidden">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl">
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug">{passive && step.waitGuests ? 'Enregistrez votre premier proche : le guide continue ensuite.' : passive ? 'Le guide continue quand vous avez terminé.' : <>Guide : {step.text}</>}</p>
          {!passive && step.page && pathname !== step.page && (
            <button type="button" onClick={() => router.push(step.page!)} className="shrink-0 rounded-xl bg-rose-500 px-3 py-2 text-xs font-extrabold">Reprendre</button>
          )}
          {passive && !step.waitGuests && <button type="button" onClick={() => goTo(index + 1)} className="shrink-0 rounded-xl bg-rose-500 px-3 py-2 text-xs font-extrabold">Continuer</button>}
          <button type="button" onClick={() => finish(false)} aria-label="Quitter le guide" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10"><X size={16} /></button>
        </div>
      </div>
    );
  }

  /* ── Mise en lumière de la cible ── */
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const pad = 6;
  const r = rect
    ? { top: Math.max(4, rect.top - pad), left: Math.max(4, rect.left - pad), right: Math.min(vw - 4, rect.right + pad), bottom: Math.min(vh - 4, rect.bottom + pad) }
    : null;
  const tipW = Math.min(340, vw - 24);
  const below = r ? vh - r.bottom > 210 : true;
  const above = r ? r.top > 210 : false;
  const center = r ? (r.left + r.right) / 2 : vw / 2;
  const tipLeft = Math.min(Math.max(12, center - tipW / 2), vw - tipW - 12);
  const tipStyle: React.CSSProperties = r && (below || above)
    ? (below ? { top: r.bottom + 14, left: tipLeft, width: tipW } : { bottom: vh - r.top + 14, left: tipLeft, width: tipW })
    : { bottom: 'max(16px, env(safe-area-inset-bottom))', left: (vw - tipW) / 2, width: tipW };
  const arrowLeft = Math.min(Math.max(18, center - tipLeft), tipW - 18);
  const panel = 'fixed z-[150] bg-ink/45 backdrop-blur-[3px]';

  return (
    <AnimatePresence>
      <div key={step.id} className="print:hidden">
        {r ? (
          <>
            {/* Voile flouté avec un trou arrondi : la cible reste visible et touchable */}
            <div className={`${panel} inset-0`} style={{ clipPath: `path(evenodd, '${holePath(vw, vh, r, 16)}')` }} />
            <div className="pointer-events-none fixed z-[151] rounded-2xl ring-[3px] ring-rose-500 shadow-[0_0_0_7px_rgba(196,61,94,.22)]"
              style={{ top: r.top, left: r.left, width: r.right - r.left, height: r.bottom - r.top }} />
          </>
        ) : (
          <div className={`${panel} inset-0`} />
        )}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="dialog" aria-live="polite"
          className="fixed z-[152] grid gap-2.5 rounded-[1.25rem] bg-ink px-4 pb-3 pt-3.5 text-center text-[14px] leading-snug text-white shadow-2xl" style={tipStyle}>
          {r && (below || above) && (
            <span aria-hidden className="absolute h-3 w-3 rotate-45 bg-ink" style={below ? { top: -6, left: arrowLeft - 6 } : { bottom: -6, left: arrowLeft - 6 }} />
          )}
          {dots}
          <p>{step.text}</p>
          {step.cta && (
            <button type="button" onClick={() => (step.go ? router.push(step.go) : goTo(index + 1))}
              className="justify-self-center rounded-full bg-rose-500 px-5 py-2 text-[13px] font-extrabold hover:bg-rose-600">{step.cta}</button>
          )}
          <button type="button" onClick={() => finish(false)} className="justify-self-center text-[11.5px] text-white/60 hover:text-white">Passer le guide</button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Contour de l'écran avec un rectangle arrondi découpé (règle « evenodd ») pour clip-path
function holePath(vw: number, vh: number, r: { top: number; left: number; right: number; bottom: number }, radius: number) {
  const k = Math.max(0, Math.min(radius, (r.right - r.left) / 2, (r.bottom - r.top) / 2));
  const { top: t, left: l, right: rt, bottom: b } = r;
  return `M0 0H${vw}V${vh}H0Z M${l + k} ${t}H${rt - k}A${k} ${k} 0 0 1 ${rt} ${t + k}V${b - k}A${k} ${k} 0 0 1 ${rt - k} ${b}H${l + k}A${k} ${k} 0 0 1 ${l} ${b - k}V${t + k}A${k} ${k} 0 0 1 ${l + k} ${t}Z`;
}
