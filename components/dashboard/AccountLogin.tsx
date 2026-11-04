"use client";

// Paramètres → Général : comment le couple se connecte, changement du mot de passe et,
// pour un compte créé par téléphone, l'adresse e-mail facultative (rappels avant suppression).
import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Mail, Phone } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import PasswordCriteria from '../auth/PasswordCriteria';
import { passwordOk } from '../../lib/password';
import { contactEmail, formatPhone, loginPhone } from '../../lib/phone-auth';

const field = 'w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-12 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all';
const label = 'text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4';
const button = 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-ink px-6 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40';

export default function AccountLogin({ onToast }: { onToast: (message: string, type?: 'success' | 'error') => void }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState<'password' | 'email' | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setContact(contactEmail(data.user) ?? '');
    });
  }, [supabase]);

  if (!user) return null;
  const phone = loginPhone(user);
  const provider = user.app_metadata?.provider;
  const via = phone
    ? { icon: Phone, text: <>Vous vous connectez avec le <strong className="text-ink">{formatPhone(phone)}</strong> et votre mot de passe.</> }
    : provider === 'google' || provider === 'facebook'
      ? { icon: Mail, text: <>Vous vous connectez avec {provider === 'google' ? 'Google' : 'Facebook'} (<strong className="break-all text-ink">{user.email}</strong>).</> }
      : { icon: Mail, text: <>Vous vous connectez avec <strong className="break-all text-ink">{user.email}</strong> et votre mot de passe.</> };
  const contactValid = !contact.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
  const contactChanged = contact.trim().toLowerCase() !== (contactEmail(user) ?? '').toLowerCase();

  const savePassword = async () => {
    if (!passwordOk(password)) return;
    setBusy('password');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(null);
    if (!error) { setPassword(''); onToast('Mot de passe changé'); return; }
    const msg = error.message.toLowerCase();
    onToast(msg.includes('different') || msg.includes('same')
      ? 'Choisissez un mot de passe différent de l’actuel'
      : msg.includes('reauthentication') || msg.includes('recent')
        ? 'Reconnectez-vous puis réessayez'
        : 'Le mot de passe n’a pas pu être changé', 'error');
  };

  const saveContact = async () => {
    if (!contactValid) return;
    setBusy('email');
    const { data, error } = await supabase.auth.updateUser({ data: { contact_email: contact.trim().toLowerCase() || null } });
    setBusy(null);
    if (error) { onToast('L’adresse n’a pas pu être enregistrée', 'error'); return; }
    if (data.user) setUser(data.user);
    onToast(contact.trim() ? 'Adresse e-mail enregistrée' : 'Adresse e-mail retirée');
  };

  return (
    <div className="space-y-6 border-t border-slate-100 pt-8">
      <div>
        <p className="eyebrow">Connexion</p>
        <p className="mt-2 flex items-start gap-2 text-sm text-slate-600"><via.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{via.text}</span></p>
      </div>

      {phone && (
        <div className="space-y-2">
          <label htmlFor="contact-email" className={label}>Adresse e-mail (facultatif)</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Mail className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input id="contact-email" type="email" inputMode="email" autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="votre@email.com" className={field} />
            </div>
            <button type="button" onClick={saveContact} disabled={busy !== null || !contactValid || !contactChanged} className={button}>
              {busy === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enregistrer
            </button>
          </div>
          <p className="ml-4 text-xs text-slate-400">{contactValid ? 'Pour recevoir les rappels avant la suppression de votre espace. Elle ne sert pas à vous connecter.' : 'Le format de l’adresse e-mail est invalide.'}</p>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="new-password" className={label}>Changer mon mot de passe</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <KeyRound className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
            <input id="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" className={field} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
          <button type="button" onClick={savePassword} disabled={busy !== null || !passwordOk(password)} className={button}>
            {busy === 'password' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Changer
          </button>
        </div>
        {password && <PasswordCriteria password={password} />}
      </div>
    </div>
  );
}
