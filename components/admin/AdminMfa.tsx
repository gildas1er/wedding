"use client";

// Double authentification de l'administration (code à 6 chiffres d'une application d'authentification :
// Google Authenticator, Microsoft Authenticator, 1Password…).
// - setup : première fois, le compte enregistre l'application (QR code ou clé à saisir), puis confirme un code.
// - verify : à chaque connexion, le code du moment.
// Le serveur (requireAdmin) refuse toute action d'administration tant que la session n'est pas validée par un code.
import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, Smartphone, Copy, Check } from 'lucide-react';
import { supabase } from '../../app/lib/supabase';
import AlliancesMark from '../brand/AlliancesMark';

type Mode = 'setup' | 'verify';

// Supabase renvoie le QR code en SVG brut (« data:image/svg+xml;utf-8,<svg…> »), que certains navigateurs
// n'affichent pas : on le réencode dans une forme lue partout
function qrImage(raw: string) {
  const comma = raw.indexOf(',');
  if (!raw.startsWith('data:image/svg+xml') || comma < 0 || raw.slice(0, comma).includes(';base64')) return raw;
  let svg = raw.slice(comma + 1);
  try { svg = decodeURIComponent(svg); } catch { /* déjà en clair */ }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function AdminMfa({ mode, onDone }: { mode: Mode; onDone: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Préparation : l'application déjà enregistrée (verify), ou une nouvelle inscription (setup)
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (!alive) return;
      if (listError) { setError('Impossible de joindre le service de connexion. Rechargez la page.'); return; }
      if (mode === 'verify') {
        const factor = data?.totp?.find((f) => f.status === 'verified');
        if (factor) setFactorId(factor.id); else setError('Aucune application enregistrée : rechargez la page pour l’activer.');
        return;
      }
      // Une inscription commencée mais jamais confirmée bloquerait la nouvelle : on la retire
      for (const f of data?.all ?? []) {
        if (f.factor_type === 'totp' && f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `WeddingStudio admin ${new Date().toISOString().slice(0, 10)}` });
      if (!alive) return;
      if (enrollError || !enrolled) { setError('La double authentification n’est pas disponible. Vérifiez qu’elle est activée dans Supabase (Authentication > Multi-Factor).'); return; }
      setFactorId(enrolled.id);
      setQr(qrImage(enrolled.totp.qr_code));
      setSecret(enrolled.totp.secret);
    })();
    return () => { alive = false; };
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;
    setBusy(true); setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (verifyError) { setError('Code incorrect ou expiré. Saisissez le code affiché maintenant dans votre application.'); setCode(''); return; }
    onDone();
  };

  const copySecret = async () => {
    if (!secret) return;
    try { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* copie refusée : la clé reste lisible */ }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory p-6">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="flex items-center gap-3">
          <AlliancesMark size={34} />
          <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">Admin</span>
        </div>

        {mode === 'setup' ? (
          <>
            <h1 className="mt-5 font-display text-2xl text-ink">Activez la double authentification</h1>
            <p className="mt-2 text-sm text-slate-600">L’administration donne accès à tous les couples : en plus du mot de passe, un code à 6 chiffres de votre téléphone sera demandé à chaque connexion.</p>
            <ol className="mt-5 space-y-4 text-sm text-slate-700">
              <li className="flex gap-3"><Step n={1} /><span>Installez une application d’authentification sur votre téléphone : <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> ou <strong>1Password</strong>.</span></li>
              <li className="flex gap-3"><Step n={2} /><span className="min-w-0 flex-1">
                Dans l’application, touchez « + » et scannez ce QR code :
                <span className="mt-3 flex justify-center">
                  {qr ? <img src={qr} alt="QR code à scanner avec l’application d’authentification" width={176} height={176} className="rounded-xl border border-slate-200 bg-white p-2" />
                    : !error && <span className="grid h-44 w-44 place-items-center rounded-xl bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></span>}
                </span>
                {secret && (
                  <span className="mt-3 block text-xs text-slate-500">
                    Pas d’appareil photo ? Saisissez cette clé à la main :
                    <button type="button" onClick={copySecret} className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left font-mono text-[13px] tracking-wider text-ink hover:bg-slate-100">
                      <span className="break-all">{secret}</span>{copied ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <Copy className="h-4 w-4 shrink-0 text-slate-400" />}
                    </button>
                  </span>
                )}
              </span></li>
              <li className="flex gap-3"><Step n={3} /><span>Saisissez le code à 6 chiffres affiché par l’application.</span></li>
            </ol>
          </>
        ) : (
          <>
            <span className="mt-5 grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600"><Smartphone className="h-6 w-6" /></span>
            <h1 className="mt-4 font-display text-2xl text-ink">Code de vérification</h1>
            <p className="mt-2 text-sm text-slate-600">Ouvrez votre application d’authentification et saisissez le code à 6 chiffres de WeddingStudio.</p>
          </>
        )}

        <form onSubmit={submit} className="mt-6">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"><KeyRound className="h-3.5 w-3.5" /> Code à 6 chiffres</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} autoFocus
              aria-describedby={error ? 'mfa-error' : undefined}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-ink outline-none focus:border-amber-400"
              placeholder="000000"
            />
          </label>
          {error && <p id="mfa-error" role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={busy || code.length !== 6 || !factorId}
            className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {mode === 'setup' ? 'Activer et entrer' : 'Valider'}
          </button>
        </form>
        <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.assign('/login'); }}
          className="mt-3 w-full text-center text-xs font-semibold text-slate-500 hover:text-ink">Se déconnecter</button>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-50 text-xs font-bold text-amber-700">{n}</span>;
}
