"use client";
// Contrôle à l'entrée (formules payantes, migration 32).
// - L'équipe d'accueil ouvre le lien donné par les mariés (/accueil?id=…&k=…) : la clé est gardée
//   sur le téléphone, puis retirée de l'adresse.
// - Elle scanne les billets (caméra), tape le numéro, ou cherche l'invité par son nom.
// - Un invité qui scanne son propre billet arrive ici sans clé : on lui dit simplement de le présenter.
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Camera, CheckCircle2, Loader2, RotateCcw, ScanLine, Search, ShieldAlert, Ticket, Users, X, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePublicMarriage } from '../../lib/use-public-marriage';
import { formatTicketCode } from '../../lib/ticket';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keyStorage = (id: string) => `ws-accueil-${id}`;

type Stats = { arrived: number; expected: number };
type CheckResult = {
  result: 'ok' | 'already' | 'not_confirmed' | 'unknown' | 'undone' | 'denied' | 'other_wedding';
  code?: string;
  name?: string;
  guests_count?: number;
  table_name?: string | null;
  status?: string | null;
  checked_in_at?: string | null;
  stats?: Stats;
};
type SearchRow = { code: string; name: string; guests_count: number; table_name: string | null; status: string | null; checked_in_at: string | null };

const hour = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ') : '');
const persons = (n?: number) => `${Math.max(1, n ?? 1)} personne${(n ?? 1) > 1 ? 's' : ''}`;

export default function AccueilPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-ivory"><Loader2 className="animate-spin text-rose-500" /></div>}>
      <Accueil />
    </Suspense>
  );
}

function Accueil() {
  const params = useSearchParams();
  const rawId = params.get('id');
  const marriageId = rawId && UUID_RE.test(rawId) ? rawId : null;
  const urlKey = params.get('k');
  const urlCode = params.get('code');
  const { themeStyle } = usePublicMarriage(marriageId);

  // Clé : celle du lien (enregistrée sur le téléphone), sinon celle déjà enregistrée
  const [key] = useState<string | null>(() => {
    if (!marriageId || typeof window === 'undefined') return null;
    try {
      if (urlKey) localStorage.setItem(keyStorage(marriageId), urlKey);
      return urlKey ?? localStorage.getItem(keyStorage(marriageId));
    } catch {
      return urlKey; // navigation privée : la clé reste celle du lien
    }
  });
  const [phase, setPhase] = useState<'loading' | 'guest' | 'denied' | 'staff' | 'error'>(() => (!marriageId ? 'error' : key ? 'loading' : 'guest'));
  const [couple, setCouple] = useState('');
  const [stats, setStats] = useState<Stats>({ arrived: 0, expected: 0 });
  const [result, setResult] = useState<CheckResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [working, setWorking] = useState(false);
  const urlCodeDone = useRef(false);

  useEffect(() => {
    if (urlKey) {
      // La clé ne reste pas dans l'historique ni dans une capture d'écran de l'adresse
      const clean = new URL(window.location.href);
      clean.searchParams.delete('k');
      window.history.replaceState(null, '', clean.toString());
    }
    if (!marriageId || !key) return;
    supabase.rpc('checkin_open', { p_marriage_id: marriageId, p_key: key }).then(({ data, error }) => {
      if (error) { setPhase(error.hint === 'rate_limit' ? 'denied' : 'error'); return; }
      if (data?.result !== 'ok') {
        try { localStorage.removeItem(keyStorage(marriageId)); } catch { /* rien */ }
        setPhase('denied');
        return;
      }
      setCouple(data.couple ?? '');
      setStats(data.stats);
      setPhase('staff');
    });
  }, [marriageId, urlKey, key]);

  const check = useCallback(async (code: string, mode: 'scan' | 'undo' | 'force' = 'scan') => {
    if (!marriageId || !key) return;
    setWorking(true);
    const { data, error } = mode === 'force'
      ? await supabase.rpc('checkin_force', { p_marriage_id: marriageId, p_key: key, p_code: code })
      : await supabase.rpc('checkin_ticket', { p_marriage_id: marriageId, p_key: key, p_code: code, p_undo: mode === 'undo' });
    setWorking(false);
    if (error) {
      setResult({ result: error.hint === 'rate_limit' ? 'denied' : 'unknown' });
      return;
    }
    const r = data as CheckResult;
    if (r.stats) setStats(r.stats);
    // Entrée forcée : enregistrée, on l'affiche comme une entrée normale
    setResult(mode === 'force' && r.result === 'already' ? { ...r, result: 'ok' } : r);
    if (r.result === 'denied') setPhase('denied');
    try { navigator.vibrate?.(r.result === 'ok' ? 80 : [60, 60, 60]); } catch { /* rien */ }
  }, [marriageId, key]);

  // Billet scanné avec l'appareil photo du téléphone : l'adresse contient déjà le code
  useEffect(() => {
    if (phase !== 'staff' || !urlCode || urlCodeDone.current) return;
    urlCodeDone.current = true;
    check(urlCode);
  }, [phase, urlCode, check]);

  // Contenu d'un QR code : lien d'un billet (de ce mariage) ou numéro seul
  const onScan = useCallback((text: string) => {
    setScanning(false);
    try {
      const url = new URL(text);
      const id = url.searchParams.get('id');
      const code = url.searchParams.get('code');
      if (code && id && id !== marriageId) { setResult({ result: 'other_wedding' }); return; }
      if (code) { check(code); return; }
    } catch { /* pas un lien */ }
    check(text);
  }, [check, marriageId]);

  if (phase === 'loading') return <div className="flex h-screen items-center justify-center bg-ivory"><Loader2 className="animate-spin text-rose-500" /></div>;

  if (phase !== 'staff') {
    const content = {
      guest: { icon: Ticket, title: 'Billet à présenter à l’accueil', text: 'Ce QR code est votre billet d’entrée. Montrez-le à l’équipe d’accueil le jour du mariage : elle le scannera.' },
      denied: { icon: ShieldAlert, title: 'Lien d’accueil non valable', text: 'Ce lien a peut-être été renouvelé par les mariés, ou l’espace n’a pas de formule payante. Demandez-leur le nouveau lien d’accueil.' },
      error: { icon: AlertTriangle, title: 'Page introuvable', text: 'Ouvrez le lien d’accueil envoyé par les mariés.' },
    }[phase];
    return (
      <main className="flex min-h-screen items-center justify-center bg-ivory px-6" style={themeStyle}>
        <div className="max-w-sm text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-600"><content.icon className="h-7 w-7" strokeWidth={1.6} /></span>
          <h1 className="mt-5 font-display text-2xl text-ink">{content.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{content.text}</p>
        </div>
      </main>
    );
  }

  const ratio = stats.expected ? Math.min(1, stats.arrived / stats.expected) : 0;

  return (
    <main className="min-h-screen bg-ivory pb-16" style={themeStyle}>
      <div className="mx-auto max-w-md px-4 pt-6">
        <header>
          <p className="eyebrow">Accueil des invités</p>
          <h1 className="mt-1 font-display text-3xl text-ink">{couple || 'Mariage'}</h1>
        </header>

        <section className="mt-5 rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200/80" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Users className="h-4 w-4 text-rose-500" /> Arrivés</p>
            <p className="font-display text-2xl text-ink tabular-nums">{stats.arrived}<span className="text-base text-slate-400"> / {stats.expected} personnes</span></p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${ratio * 100}%` }} />
          </div>
        </section>

        <button
          type="button"
          onClick={() => { setResult(null); setScanning(true); }}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.5rem] py-6 text-lg font-semibold shadow-lg active:scale-[0.99]"
          style={{ backgroundColor: 'var(--wed-primary)', color: 'var(--wed-on-primary)' }}
        >
          <ScanLine className="h-6 w-6" /> Scanner un billet
        </button>

        <CodeForm onSubmit={(c) => check(c)} disabled={working} />
        <NameSearch marriageId={marriageId!} accessKey={key!} onCheck={(c) => check(c)} refreshKey={stats.arrived} />
      </div>

      <AnimatePresence>
        {scanning && <Scanner key="scanner" onResult={onScan} onClose={() => setScanning(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {(result || working) && (
          <ResultSheet
            key="result"
            result={result}
            working={working}
            onNext={() => { setResult(null); setScanning(true); }}
            onClose={() => setResult(null)}
            onUndo={(c) => check(c, 'undo')}
            onForce={(c) => check(c, 'force')}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ── Numéro tapé à la main ── */
function CodeForm({ onSubmit, disabled }: { onSubmit: (code: string) => void; disabled: boolean }) {
  const [code, setCode] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (code.trim()) { onSubmit(code); setCode(''); } }}
      className="mt-5 rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200/80"
    >
      <label htmlFor="ticket-code" className="text-sm font-semibold text-ink">Numéro du billet</label>
      <p className="text-xs text-slate-500">Écrit en bas du billet, par exemple 4K7Q-2C9M.</p>
      <div className="mt-3 flex gap-2">
        <input
          id="ticket-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          placeholder="XXXX-XXXX"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-ivory px-3 py-3 font-mono text-base tracking-widest outline-none focus:border-rose-400"
        />
        <button type="submit" disabled={disabled || !code.trim()} className="rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40">Valider</button>
      </div>
    </form>
  );
}

/* ── Recherche par nom (invité sans billet) ── */
function NameSearch({ marriageId, accessKey, onCheck, refreshKey }: { marriageId: string; accessKey: string; onCheck: (code: string) => void; refreshKey: number }) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(false);

  const searching = query.trim().length >= 2;
  const shown = searching ? rows : [];

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase.rpc('checkin_search', { p_marriage_id: marriageId, p_key: accessKey, p_query: q });
      setRows(data?.result === 'ok' ? data.guests : []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, marriageId, accessKey, refreshKey]);

  return (
    <section className="mt-5 rounded-[1.5rem] bg-white p-5 ring-1 ring-slate-200/80">
      <label htmlFor="guest-search" className="text-sm font-semibold text-ink">Pas de billet ?</label>
      <p className="text-xs text-slate-500">Cherchez l&apos;invité par son nom.</p>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="guest-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom de l'invité"
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200 bg-ivory py-3 pl-9 pr-9 text-base outline-none focus:border-rose-400"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>
      {shown.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {shown.map((r) => (
            <li key={r.code} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{r.name}</p>
                <p className="text-xs text-slate-500">
                  {persons(r.guests_count)}{r.table_name ? ` · Table ${r.table_name.replace(/^table\s+/i, '')}` : ''}
                  {r.status !== 'confirmé' && <span className="text-amber-700"> · {r.status === 'décliné' ? 'a décliné' : 'sans réponse'}</span>}
                </p>
              </div>
              {r.checked_in_at
                ? <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Entré à {hour(r.checked_in_at)}</span>
                : <button type="button" onClick={() => onCheck(r.code)} className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Faire entrer</button>}
            </li>
          ))}
        </ul>
      )}
      {searching && !loading && shown.length === 0 &&<p className="mt-3 text-sm text-slate-500">Aucun invité à ce nom.</p>}
    </section>
  );
}

/* ── Caméra ── */
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

function Scanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch {
        setError("La caméra n'est pas disponible. Autorisez-la dans les réglages du navigateur, ou tapez le numéro du billet.");
        return;
      }
      if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => {});

      // Lecture native (Android, Chrome) si possible, sinon jsQR (iPhone)
      const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      let detector: Detector | null = null;
      if (Native) { try { detector = new Native({ formats: ['qr_code'] }); } catch { detector = null; } }
      const jsQR = detector ? null : (await import('jsqr')).default;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const tick = async () => {
        if (stopped) return;
        if (video.readyState >= 2 && video.videoWidth) {
          try {
            let text: string | null = null;
            if (detector) {
              text = (await detector.detect(video))[0]?.rawValue ?? null;
            } else if (jsQR && ctx) {
              const scale = Math.min(1, 640 / video.videoWidth);
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              text = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
            }
            if (text && !stopped) { stopped = true; onResult(text); return; }
          } catch { /* image suivante */ }
        }
        timer = setTimeout(tick, 180);
      };
      tick();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <p className="flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4" /> Visez le QR code du billet</p>
        <button type="button" onClick={onClose} aria-label="Fermer la caméra" className="grid h-10 w-10 place-items-center rounded-full bg-white/15"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="aspect-square w-[70%] max-w-[320px] rounded-3xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        {error && <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 text-center text-sm text-ink">{error}</p>}
      </div>
    </motion.div>
  );
}

/* ── Résultat d'un scan ── */
function ResultSheet({ result, working, onNext, onClose, onUndo, onForce }: {
  result: CheckResult | null; working: boolean; onNext: () => void; onClose: () => void; onUndo: (code: string) => void; onForce: (code: string) => void;
}) {
  const r = result;
  const look = !r ? null : {
    ok: { bg: 'bg-emerald-600', icon: CheckCircle2, title: 'Bienvenue !', text: 'Entrée enregistrée.' },
    already: { bg: 'bg-amber-500', icon: AlertTriangle, title: 'Déjà entré', text: `Ce billet a été scanné à ${hour(r.checked_in_at)}.` },
    not_confirmed: { bg: 'bg-amber-500', icon: AlertTriangle, title: 'Présence non confirmée', text: r.status === 'décliné' ? 'Cet invité avait répondu qu’il ne viendrait pas.' : 'Cet invité n’a pas confirmé sa présence.' },
    undone: { bg: 'bg-slate-700', icon: RotateCcw, title: 'Entrée annulée', text: 'Le billet peut être scanné de nouveau.' },
    unknown: { bg: 'bg-red-600', icon: XCircle, title: 'Billet inconnu', text: 'Ce numéro ne correspond à aucun invité de ce mariage.' },
    other_wedding: { bg: 'bg-red-600', icon: XCircle, title: 'Autre mariage', text: 'Ce billet est celui d’un autre mariage.' },
    denied: { bg: 'bg-red-600', icon: ShieldAlert, title: 'Accès refusé', text: 'Trop d’essais, ou lien d’accueil renouvelé. Patientez quelques minutes ou demandez le nouveau lien aux mariés.' },
  }[r.result];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[60] flex flex-col text-white ${look?.bg ?? 'bg-black/80'}`}
      role="dialog" aria-modal="true" aria-live="assertive"
    >
      {working || !r || !look ? (
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <look.icon className="h-20 w-20" strokeWidth={1.5} />
            <p className="mt-4 text-3xl font-bold">{look.title}</p>
            {r.name && <p className="mt-6 font-display text-4xl leading-tight">{r.name}</p>}
            {r.name && (
              <p className="mt-3 text-xl font-semibold opacity-95">
                {persons(r.guests_count)}{r.table_name ? ` · Table ${r.table_name.replace(/^table\s+/i, '')}` : ''}
              </p>
            )}
            <p className="mt-4 text-base opacity-90">{look.text}</p>
            {r.code && <p className="mt-2 font-mono text-sm opacity-75">N° {formatTicketCode(r.code)}</p>}
          </div>
          <div className="grid gap-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {r.result === 'not_confirmed' && r.code && (
              <button type="button" onClick={() => onForce(r.code!)} className="rounded-2xl bg-white/20 py-4 text-base font-semibold">Faire entrer quand même</button>
            )}
            <button type="button" onClick={onNext} className="flex items-center justify-center gap-2 rounded-2xl bg-white py-4 text-base font-semibold text-ink">
              <ScanLine className="h-5 w-5" /> Billet suivant
            </button>
            <div className="flex justify-center gap-6 text-sm font-semibold opacity-90">
              {(r.result === 'ok' || r.result === 'already') && r.code && (
                <button type="button" onClick={() => onUndo(r.code!)} className="underline underline-offset-4">Annuler cette entrée</button>
              )}
              <button type="button" onClick={onClose} className="underline underline-offset-4">Fermer</button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
