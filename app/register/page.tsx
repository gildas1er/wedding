"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, ArrowRight, Mail, Lock, Eye, EyeOff, 
  Check, User, Calendar, Phone, ChevronDown, AlertCircle, Gift
} from 'lucide-react';
import Link from 'next/link';
import Captcha, { CAPTCHA_ERROR_FR, captchaEnabled, isCaptchaError } from '../../components/auth/Captcha';
import PasswordCriteria from '../../components/auth/PasswordCriteria';
import PhoneField from '../../components/auth/PhoneField';
import { passwordChecks } from '../../lib/password';
import { DEFAULT_COUNTRY, formatPhone, parsePhone } from '../../lib/phone-auth';
import type { CountryCode } from 'libphonenumber-js';
import { LaunchCard, useLaunchOffer } from '../../components/promo/LaunchOffer';
import { LEGAL } from '../../lib/legal';
import { REFERRAL_DISCOUNT_XOF, REFERRAL_STORAGE_KEY, normalizeCode } from '../../lib/promo';
import { formatXof } from '../../lib/plan';
import { supabase } from '../lib/supabase'; 
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error' | '', content: string }>({ 
    type: '', 
    content: '' 
  });
  
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Inscription avec un e-mail (comme avant) ou avec un numéro de téléphone (e-mail facultatif)
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [loginPhone, setLoginPhone] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [role, setRole] = useState("");
  // Anti-robot (Turnstile) : jeton à usage unique, renouvelé après chaque envoi
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  // Pendant l'offre de lancement (-30 %, non cumulable), le bandeau du parrain n'est pas affiché ;
  // le code reste enregistré à l'inscription (récompense du parrain si le couple paie)
  const launchActive = useLaunchOffer();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  
  // Lien de parrainage (/register?parrain=CODE) : gardé aussi pour une inscription avec Google
  const [referral, setReferral] = useState<{ code: string; inviter: string } | null>(null);
  useEffect(() => {
    let code = normalizeCode(new URLSearchParams(window.location.search).get('parrain') ?? '');
    try {
      if (code) localStorage.setItem(REFERRAL_STORAGE_KEY, code);
      else code = normalizeCode(localStorage.getItem(REFERRAL_STORAGE_KEY) ?? '');
    } catch { /* navigation privée */ }
    if (!code) return;
    supabase.rpc('referral_inviter', { p_code: code }).then(({ data }) => {
      if (typeof data === 'string' && data.trim() && data.trim() !== '&') setReferral({ code, inviter: data });
      else { try { localStorage.removeItem(REFERRAL_STORAGE_KEY); } catch { /* rien */ } }
    });
  }, []);

  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [dateError, setDateError] = useState("");

  const validateEmail = (val: string) => {
    setEmail(val);
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(val && !re.test(val) ? "Format d'email invalide" : "");
  };

  const validatePhone = (val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    setPhone(cleanVal);
    setPhoneError(cleanVal.length > 0 && cleanVal.length !== 10 ? "Le numéro doit comporter 10 chiffres" : "");
  };

  const validateDate = (val: string) => {
    setWeddingDate(val);
    if (!val) return;
    const selectedDate = new Date(val);
    const today = new Date();
    const minDate = new Date();
    minDate.setMonth(today.getMonth() + 1);
    if (selectedDate < minDate) {
      setDateError("Le mariage doit être prévu au moins 1 mois à l'avance");
    } else {
      setDateError("");
    }
  };

  const translateError = (msg: string) => {
    const errors: { [key: string]: string } = {
      'User already registered': "Cet email est déjà utilisé par un autre compte.",
      'Signup disabled': "Les inscriptions sont temporairement désactivées.",
      'Invalid format for email': "Le format de l'adresse email est invalide.",
      'Password should be at least 6 characters': "Le mot de passe est trop court.",
      'Network HTTP error': "Erreur de connexion. Vérifiez votre accès internet.",
    };
    return errors[msg] || "Une erreur inattendue est survenue. Veuillez réessayer.";
  };

  const validation = passwordChecks(password);
  // Onglet téléphone : numéro complet et valide pour le pays choisi
  const parsedPhone = parsePhone(loginPhone, country);
  const loginPhoneError = loginPhone.replace(/\D/g, '').length >= 6 && !parsedPhone
    ? (country === 'CI' ? 'Numéro ivoirien : 10 chiffres' : 'Numéro invalide pour ce pays')
    : '';

  const allValid = 
    Object.values(validation).every(Boolean) && 
    termsAccepted && fullName && partnerName && 
    weddingDate && !dateError && 
    role &&
    (method === 'email'
      ? email && !emailError && phone.length === 10 && !phoneError
      : parsedPhone && !emailError);

  // --- LOGIQUE DE SOUMISSION ADAPTÉE ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    if (captchaEnabled && !captchaToken) { setMessage({ type: 'error', content: 'Vérification anti-robot en cours : réessayez dans un instant.' }); return; }
    
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    if (method === 'phone') {
      await registerWithPhone();
      return;
    }

    try {
      // 1. Création du compte Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Le lien de confirmation revient sur l'app, qui ouvre la session puis le tableau de bord
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken: captchaToken ?? undefined,
          data: {
            full_name: fullName,
            partner_name_1: fullName,
            partner_name_2: partnerName,
            phone: phone,
            wedding_date: weddingDate,
            role: role,
            // Preuve du consentement : version des documents acceptés et date
            terms_version: LEGAL.version,
            terms_accepted_at: new Date().toISOString(),
            marketing_opt_in: marketingOptIn,
            ...(referral ? { referral_code: referral.code } : {}),
          },
        },
      });

      if (authError) throw authError;

      if (data?.user?.identities?.length === 0) {
        setMessage({ type: 'error', content: translateError('User already registered') });
      } else if (data?.user) {
        // 2. Le mariage est créé par un trigger en base (create_marriage_for_new_user).
        if (!data.session) {
          // Confirmation par e-mail activée : pas encore de session.
          // On envoie le couple sur la connexion avec un message clair et l'e-mail pré-rempli.
          router.push(`/login?inscription=ok&email=${encodeURIComponent(email)}`);
          return;
        }

        // Secours si le trigger n'a pas pu créer le mariage
        const { data: existing } = await supabase
          .from('marriages')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!existing) {
          const { error: marriageError } = await supabase
            .from('marriages')
            .insert([{
              user_id: data.user.id,
              partner_1_name: fullName,
              partner_2_name: partnerName,
              wedding_date: weddingDate,
              location_city: "À définir",
              couple_slug: `${fullName.toLowerCase().trim().replace(/\s+/g, '-')}-${partnerName.toLowerCase().trim().replace(/\s+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`
            }]);

          if (marriageError) throw marriageError;
        }

        posthog.capture('registration_completed');
        setMessage({ 
          type: 'success', 
          content: 'Compte créé avec succès ! Préparation de votre espace...' 
        });
        
        // Nettoyage et redirection
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }

    } catch (error: any) {
      setMessage({ type: 'error', content: isCaptchaError(error) ? CAPTCHA_ERROR_FR : translateError(error.message) });
    } finally {
      setIsLoading(false);
      setCaptchaReset((n) => n + 1);
    }
  };

  // Inscription par téléphone : le serveur crée le compte (déjà confirmé), puis la session s'ouvre
  // avec le jeton à usage unique qu'il renvoie. Pas de code, pas d'e-mail à confirmer.
  const registerWithPhone = async () => {
    try {
      const res = await fetch('/api/auth/register-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country, phone: loginPhone, password, fullName, partnerName, email: email.trim(),
          weddingDate, role, termsAccepted, marketingOptIn,
          referralCode: referral?.code ?? null, captchaToken,
        }),
      }).catch(() => null);
      const out = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage({ type: 'error', content: out.error || translateError('Network HTTP error') });
        return;
      }
      posthog.capture('registration_completed', { method: 'phone' });
      const { error } = out.tokenHash
        ? await supabase.auth.verifyOtp({ token_hash: out.tokenHash, type: 'magiclink' })
        : { error: new Error('no token') };
      if (error) {
        // Compte créé mais session non ouverte : on passe par la connexion, numéro pré-rempli
        router.push(`/login?inscription=tel&tel=${encodeURIComponent(parsedPhone ?? '')}`);
        return;
      }
      setMessage({ type: 'success', content: 'Compte créé avec succès ! Préparation de votre espace...' });
      setTimeout(() => router.push('/dashboard'), 1500);
    } finally {
      setIsLoading(false);
      setCaptchaReset((n) => n + 1);
    }
  };

  const labelClass = "block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1";

  return (
    <div className="min-h-screen bg-ivory flex flex-col lg:flex-row">

      {/* Côté gauche - Visuel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=70&w=1400" alt="Mariage" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-8">
            <Heart className="text-white w-8 h-8 fill-current" />
          </div>
          <h2 className="text-4xl font-normal text-white mb-6 italic" style={{ fontFamily: 'var(--font-display)' }}>Commencez votre histoire ici.</h2>
          <p className="text-slate-300 leading-relaxed font-medium">Rejoignez WeddingStudio et organisez votre mariage en toute sérénité.</p>
        </div>
      </div>

      {/* Côté droit - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-[480px] py-10">
          
          <div className="mb-8 text-center lg:text-left">
            <span className="text-rose-500 font-black uppercase tracking-[0.2em] text-[10px] mb-2 block">Inscription</span>
            <h1 className="text-3xl font-normal text-slate-900 mb-2 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Prenez le contrôle de <br /> <span className="italic text-rose-500">votre grand jour.</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">Créez votre compte gratuit en quelques secondes.</p>
          </div>

          <LaunchCard variant="dark" className="mb-4" />

          {referral && !launchActive && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400 text-white"><Gift className="h-4 w-4" /></span>
              <p><strong>{referral.inviter}</strong> vous invitent sur WeddingStudio : <strong>{formatXof(REFERRAL_DISCOUNT_XOF)} de réduction</strong> sur votre palier, avec le code <span className="font-mono font-semibold">{referral.code}</span>.</p>
            </div>
          )}

          {message.content && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}
            >
              {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
              {message.content}
            </motion.div>
          )}

          <div role="tablist" aria-label="Façon de créer le compte" className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            {([['email', 'Avec mon e-mail', Mail], ['phone', 'Avec mon téléphone', Phone]] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" role="tab" aria-selected={method === id}
                onClick={() => { setMethod(id); setMessage({ type: '', content: '' }); }}
                className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-black transition-all sm:text-sm ${method === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className="h-4 w-4 shrink-0" /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {method === 'phone' && (
              <div>
                <label htmlFor="register-phone" className={`${labelClass} flex justify-between gap-2`}>
                  Téléphone {loginPhoneError
                    ? <span className="text-[9px] text-red-500 normal-case">{loginPhoneError}</span>
                    : <span className="text-[9px] text-slate-400 normal-case tracking-normal">sert à vous connecter</span>}
                </label>
                <PhoneField id="register-phone" country={country} onCountry={setCountry} value={loginPhone} onValue={setLoginPhone} error={loginPhoneError} />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Prénom du Marié</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: Franck" required className="w-full bg-white border border-slate-200 py-4 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-slate-900 shadow-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Prénom de la Mariée</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Ex: Rackie" required className="w-full bg-white border border-slate-200 py-4 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-slate-900 shadow-sm" />
              </div>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${method === 'email' ? 'md:grid-cols-2' : ''}`}>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1 flex justify-between">
                  Email {emailError
                    ? <span className="text-[9px] text-red-500 normal-case">{emailError}</span>
                    : method === 'phone' && <span className="text-[9px] text-slate-400 normal-case tracking-normal">facultatif</span>}
                </label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${emailError ? 'text-red-400' : 'text-slate-400'}`} />
                  <input type="email" value={email} onChange={(e) => validateEmail(e.target.value)} placeholder="votre@email.com" required={method === 'email'} className={`w-full bg-white border ${emailError ? 'border-red-200 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-500'} py-4 pl-12 pr-4 rounded-2xl outline-none transition-all font-medium text-slate-900 shadow-sm`} />
                </div>
                {method === 'phone' && <p className="mt-1.5 ml-1 text-[11px] text-slate-400">Conseillé : pour recevoir les rappels avant la suppression de votre espace.</p>}
              </div>
              {method === 'email' && <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1 flex justify-between">
                  Téléphone {phoneError && <span className="text-[9px] text-red-500 normal-case">{phoneError}</span>}
                </label>
                <div className="relative">
                  <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${phoneError ? 'text-red-400' : 'text-slate-400'}`} />
                  <input type="tel" value={phone} onChange={(e) => validatePhone(e.target.value)} placeholder="07 00 00 00 00" required className={`w-full bg-white border ${phoneError ? 'border-red-200 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-500'} py-4 pl-12 pr-4 rounded-2xl outline-none transition-all font-medium text-slate-900 shadow-sm`} />
                </div>
              </div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1 flex justify-between">
                  Date du mariage {dateError && <span className="text-[9px] text-red-500 normal-case text-right leading-tight">Minimum +1 mois</span>}
                </label>
                <div className="relative">
                  <Calendar className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${dateError ? 'text-red-400' : 'text-slate-400'}`} />
                  <input type="date" value={weddingDate} onChange={(e) => validateDate(e.target.value)} required className={`w-full bg-white border ${dateError ? 'border-red-200 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-500'} py-4 pl-12 pr-4 rounded-2xl outline-none transition-all font-medium text-slate-900 shadow-sm`} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Je suis</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select required defaultValue="" onChange={(e) => setRole(e.target.value)} className="w-full bg-white border border-slate-200 py-4 pl-12 pr-10 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-slate-900 appearance-none cursor-pointer shadow-sm">
                    <option value="" disabled>Sélectionnez...</option>
                    <option value="le-marie">Le marié</option>
                    <option value="la-mariee">La mariée</option>
                    <option value="le-pco">Le PCO</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="w-full bg-white border border-slate-200 py-4 pl-12 pr-12 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-slate-900 shadow-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
              <PasswordCriteria password={password} className="mt-4" />
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 accent-rose-500 h-4 w-4" required />
                <span className="text-xs text-slate-500 leading-relaxed font-medium">J&apos;accepte les <a href="/conditions" target="_blank" rel="noopener noreferrer" className="text-rose-500 font-bold hover:underline">conditions d&apos;utilisation et de vente</a> et la <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="text-rose-500 font-bold hover:underline">politique de confidentialité</a>.</span>
              </label>
              {/* Consentement facultatif et séparé (jamais pré-coché) */}
              <label className="mt-3 flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-1 accent-rose-500 h-4 w-4" />
                <span className="text-xs text-slate-500 leading-relaxed font-medium">J&apos;accepte de recevoir des conseils et nouveautés de WeddingStudio (facultatif, désinscription à tout moment).</span>
              </label>
            </div>

            <Captcha onToken={setCaptchaToken} resetSignal={captchaReset} />

            <button disabled={isLoading || !allValid} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-2 mt-4 ${allValid ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Créer mon compte <ArrowRight className="w-4 h-4" /></>}
            </button>
            {method === 'phone' && parsedPhone && (
              <p className="text-center text-xs text-slate-500">
                Vous vous connecterez avec le <strong className="whitespace-nowrap text-slate-700">{formatPhone(parsedPhone)}</strong> et ce mot de passe : notez-le bien.
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}