"use client";

// Mot de passe oublié : envoi d'un lien de réinitialisation par e-mail.
// Le message de confirmation est le même que le compte existe ou non (on ne révèle pas les adresses inscrites).
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, Mail, MailCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthShell, { authButtonClass, authInputClass, authLabelClass } from '../../components/auth/AuthShell';

const COOLDOWN = 60; // Supabase limite à un e-mail par minute et par adresse

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Adresse reprise de la page de connexion ; lien expiré signalé par ?lien=expire
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    Promise.resolve().then(() => {
      const prefill = params.get('email');
      if (prefill) setEmail(prefill);
      if (params.get('lien') === 'expire') setError('Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau ci-dessous.');
    });
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address || sending || cooldown) return;
    setSending(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/auth/callback?next=/nouveau-mot-de-passe`,
    });
    setSending(false);
    if (err) {
      const msg = err.message.toLowerCase();
      if (err.status === 429 || msg.includes('security purposes') || msg.includes('rate limit')) {
        setError('Un lien vient déjà d’être envoyé. Patientez une minute avant d’en redemander un.');
        setCooldown(COOLDOWN);
      } else if (msg.includes('invalid') && msg.includes('email')) {
        setError('Cette adresse e-mail n’est pas valide.');
      } else {
        setError('Le lien n’a pas pu être envoyé. Vérifiez votre connexion puis réessayez.');
      }
      return;
    }
    setSentTo(address);
    setCooldown(COOLDOWN);
  };

  return (
    <AuthShell
      title={sentTo ? 'Vérifiez votre boîte mail' : 'Mot de passe oublié'}
      subtitle={sentTo ? undefined : 'Indiquez l’adresse e-mail de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.'}
      sideTitle={<>Pas d&apos;inquiétude,<br />cela arrive à tout le monde.</>}
      sideText="En quelques instants, vous retrouvez l'accès à votre espace et à tout ce que vous avez préparé."
    >
      <title>Mot de passe oublié | WeddingStudio</title>

      {error && (
        <motion.p role="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> {error}
        </motion.p>
      )}

      {sentTo ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-6 text-center shadow-sm">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
              <MailCheck className="h-8 w-8" strokeWidth={1.7} />
            </span>
            <p className="mt-5 text-slate-600">
              Si un compte existe pour <strong className="break-all text-ink">{sentTo}</strong>, vous allez recevoir un e-mail avec un lien pour choisir un nouveau mot de passe.
            </p>
            <p className="mt-3 text-sm text-slate-500">Le lien est valable <strong>1 heure</strong>.</p>
          </div>

          <ul className="space-y-2 rounded-2xl bg-white/70 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            <li>• Rien reçu après quelques minutes ? Regardez dans les <strong>courriers indésirables</strong> (spams).</li>
            <li>• Vérifiez que l&apos;adresse est bien celle utilisée à l&apos;inscription.</li>
          </ul>

          <button type="button" onClick={() => send()} disabled={sending || cooldown > 0} className={`${authButtonClass} border border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50 disabled:opacity-60`}>
            <RefreshCw className={`h-4 w-4 ${sending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `Renvoyer le lien (${cooldown} s)` : 'Renvoyer le lien'}
          </button>
          <button type="button" onClick={() => { setSentTo(null); setError(null); }} className="w-full text-center text-sm font-bold text-slate-500 underline-offset-4 hover:text-ink hover:underline">
            Utiliser une autre adresse
          </button>
        </motion.div>
      ) : (
        <form onSubmit={send} className="space-y-5">
          <div>
            <label htmlFor="reset-email" className={authLabelClass}>Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="reset-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@exemple.com" required autoFocus className={authInputClass} />
            </div>
          </div>
          <button type="submit" disabled={sending || !email.trim() || cooldown > 0} className={`${authButtonClass} ${email.trim() && !cooldown ? 'bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600' : 'bg-slate-200 text-slate-400 shadow-none'}`}>
            {sending ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : cooldown > 0 ? `Patientez ${cooldown} s` : <>Recevoir le lien <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      )}

      <p className="mt-10 text-center text-sm font-medium text-slate-500">
        <Link href="/login" className="inline-flex items-center gap-1.5 font-black text-rose-500 underline-offset-4 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour à la connexion
        </Link>
      </p>
    </AuthShell>
  );
}
