"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, ArrowRight, Mail, Lock, Eye, EyeOff, 
  Check, User, Calendar, Phone, ChevronDown, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../lib/supabase'; 
import { useRouter } from 'next/navigation';

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
  const [weddingDate, setWeddingDate] = useState("");
  const [role, setRole] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  
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

  const [validation, setValidation] = useState({
    length: false, upper: false, lower: false, number: false, special: false,
  });

  useEffect(() => {
    setValidation({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const allValid = 
    Object.values(validation).every(Boolean) && 
    termsAccepted && fullName && partnerName && 
    email && !emailError && 
    phone.length === 10 && !phoneError &&
    weddingDate && !dateError && 
    role;

  // --- LOGIQUE DE SOUMISSION ADAPTÉE ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    try {
      // 1. Création du compte Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            partner_name_1: fullName,
            partner_name_2: partnerName,
            phone: phone,
            wedding_date: weddingDate,
            role: role,
          },
        },
      });

      if (authError) throw authError;

      if (data?.user?.identities?.length === 0) {
        setMessage({ type: 'error', content: translateError('User already registered') });
      } else if (data?.user) {
        // 2. ÉTAPE CRUCIALE : Impact de la table marriages
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
      setMessage({ type: 'error', content: translateError(error.message) });
    } finally {
      setIsLoading(false);
    }
  };

  const Criterion = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-1.5">
      {met ? <Check className="w-3 h-3 text-emerald-500" /> : <div className="w-1 h-1 rounded-full bg-slate-300 mx-1" />}
      <span className={`text-[10px] font-medium ${met ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col lg:flex-row" style={{ fontFamily: '"DM Sans", sans-serif' }}>
      <title>Prenez le contrôle de votre grand jour | WeddingStudio</title>

      {/* Côté gauche - Visuel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80" alt="Mariage" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-8">
            <Heart className="text-white w-8 h-8 fill-current" />
          </div>
          <h2 className="text-4xl font-black text-white mb-6 italic" style={{ fontFamily: '"Playfair Display", serif' }}>Commencez votre histoire ici.</h2>
          <p className="text-slate-300 leading-relaxed font-medium">Rejoignez WeddingStudio et organisez votre mariage en toute sérénité.</p>
        </div>
      </div>

      {/* Côté droit - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-[480px] py-10">
          
          <div className="mb-8 text-center lg:text-left">
            <span className="text-rose-500 font-black uppercase tracking-[0.2em] text-[10px] mb-2 block">Inscription</span>
            <h1 className="text-3xl font-black text-slate-900 mb-2 leading-tight" style={{ fontFamily: '"Playfair Display", serif' }}>
              Prenez le contrôle de <br /> <span className="italic text-rose-500">votre grand jour.</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">Créez votre compte gratuit en quelques secondes.</p>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1 flex justify-between">
                  Email {emailError && <span className="text-[9px] text-red-500 normal-case">{emailError}</span>}
                </label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${emailError ? 'text-red-400' : 'text-slate-400'}`} />
                  <input type="email" value={email} onChange={(e) => validateEmail(e.target.value)} placeholder="votre@email.com" required className={`w-full bg-white border ${emailError ? 'border-red-200 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-500'} py-4 pl-12 pr-4 rounded-2xl outline-none transition-all font-medium text-slate-900 shadow-sm`} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1 flex justify-between">
                  Téléphone {phoneError && <span className="text-[9px] text-red-500 normal-case">{phoneError}</span>}
                </label>
                <div className="relative">
                  <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${phoneError ? 'text-red-400' : 'text-slate-400'}`} />
                  <input type="tel" value={phone} onChange={(e) => validatePhone(e.target.value)} placeholder="07 00 00 00 00" required className={`w-full bg-white border ${phoneError ? 'border-red-200 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-500'} py-4 pl-12 pr-4 rounded-2xl outline-none transition-all font-medium text-slate-900 shadow-sm`} />
                </div>
              </div>
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
              <div className="mt-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm grid grid-cols-2 gap-y-2">
                <Criterion met={validation.length} label="8+ caractères" />
                <Criterion met={validation.upper} label="1 Majuscule" />
                <Criterion met={validation.lower} label="1 Minuscule" />
                <Criterion met={validation.number} label="1 Chiffre" />
                <Criterion met={validation.special} label="1 Spécial" />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 accent-rose-500 h-4 w-4" required />
                <span className="text-xs text-slate-500 leading-relaxed font-medium">J&apos;accepte les <Link href="/terms" className="text-rose-500 font-bold hover:underline">conditions</Link> et la <Link href="/privacy" className="text-rose-500 font-bold hover:underline">confidentialité</Link>.</span>
              </label>
            </div>

            <button disabled={isLoading || !allValid} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-2 mt-4 ${allValid ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Créer mon compte <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}