"use client";

// Nouveau mot de passe : atteinte depuis le lien reçu par e-mail (session de récupération ouverte par /auth/confirm
// ou /auth/callback). Sans session valide, on propose de redemander un lien.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthShell, { authButtonClass, authInputClass, authLabelClass } from '../../components/auth/AuthShell';

const RULES = [
  { id: 'len', label: 'Au moins 8 caractères', test: (p: string) => p.length >= 8 },
  { id: 'letter', label: 'Une lettre', test: (p: string) => /\p{L}/u.test(p) },
  { id: 'digit', label: 'Un chiffre', test: (p: string) => /\d/.test(p) },
];

export default function NewPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setStatus(user ? 'ready' : 'invalid');
    });
  }, []);

  const rulesOk = RULES.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirmation;
  const canSubmit = rulesOk && matches && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes('different from the old')) setError('Choisissez un mot de passe différent de l’ancien.');
      else if (msg.includes('weak') || msg.includes('should be at least')) setError('Ce mot de passe est trop simple. Allongez-le ou ajoutez des chiffres et des symboles.');
      else if (msg.includes('session') || msg.includes('jwt') || err.status === 401) { setStatus('invalid'); return; }
      else setError('Le mot de passe n’a pas pu être modifié. Vérifiez votre connexion puis réessayez.');
      return;
    }
    setStatus('done');
    setTimeout(() => router.push('/dashboard'), 2500);
  };

  return (
    <AuthShell
      title={status === 'done' ? 'Mot de passe modifié' : status === 'invalid' ? 'Lien expiré' : 'Nouveau mot de passe'}
      subtitle={status === 'ready' ? <>Choisissez le nouveau mot de passe de votre compte{email ? <> <strong className="break-all text-ink">{email}</strong></> : null}.</> : undefined}
      sideTitle={<>Un nouveau départ<br />pour votre espace.</>}
      sideText="Choisissez un mot de passe que vous retiendrez facilement, mais que personne ne pourra deviner."
    >
      <title>Nouveau mot de passe | WeddingStudio</title>

      {status === 'checking' && <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>}

      {status === 'invalid' && (
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-red-100 bg-white p-6 text-center shadow-sm">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-500 ring-8 ring-red-50/50"><AlertCircle className="h-8 w-8" strokeWidth={1.7} /></span>
            <p className="mt-5 text-slate-600">Ce lien a expiré ou a déjà été utilisé. Pour votre sécurité, chaque lien n&apos;est valable qu&apos;une fois, pendant 1 heure.</p>
          </div>
          <Link href="/mot-de-passe-oublie" className={`${authButtonClass} bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600`}>
            Recevoir un nouveau lien <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {status === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 text-center shadow-sm">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50"><ShieldCheck className="h-8 w-8" strokeWidth={1.7} /></span>
            <p className="mt-5 text-slate-600">Votre nouveau mot de passe est enregistré. Vous êtes connecté et redirigé vers votre espace…</p>
          </div>
          <Link href="/dashboard" className={`${authButtonClass} bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600`}>
            Aller à mon espace <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}

      {status === 'ready' && (
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <p role="alert" className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> {error}
            </p>
          )}
          <div>
            <label htmlFor="new-password" className={authLabelClass}>Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoFocus className={`${authInputClass} pr-12`} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-slate-400 hover:text-slate-600">
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs font-semibold">
              {RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.id} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`grid h-4 w-4 place-items-center rounded-full ${ok ? 'bg-emerald-500 text-white' : 'border border-slate-300'}`}>{ok && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <label htmlFor="confirm-password" className={authLabelClass}>Confirmez le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="confirm-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="••••••••" required className={`${authInputClass} ${confirmation && !matches ? 'border-red-300' : ''}`} />
            </div>
            {confirmation && !matches && <p className="ml-1 mt-2 text-xs font-semibold text-red-500">Les deux mots de passe ne sont pas identiques.</p>}
          </div>
          <button type="submit" disabled={!canSubmit} className={`${authButtonClass} ${canSubmit ? 'bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600' : 'bg-slate-200 text-slate-400 shadow-none'}`}>
            {saving ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Enregistrer le mot de passe <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
