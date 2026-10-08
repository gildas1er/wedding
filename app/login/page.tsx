"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ArrowRight, Chrome, Mail, Lock, Eye, EyeOff, Facebook, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../lib/supabase'; 
import { useRouter } from 'next/navigation';
import { safeNextPath } from '../../lib/safe-redirect';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // États pour les champs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Gestion des messages
  // Après une suppression de compte : /login?compte=supprime
  const [message, setMessage] = useState<{ type: 'success' | 'error' | '', content: string }>({ type: '', content: '' });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('compte') === 'supprime') {
      Promise.resolve().then(() => setMessage({ type: 'success', content: 'Votre compte a été supprimé définitivement. Merci d’avoir organisé votre mariage avec WeddingStudio.' }));
    } else if (params.get('error') === 'auth_failed') {
      Promise.resolve().then(() => setMessage({ type: 'error', content: 'Ce lien de connexion a expiré ou a déjà été utilisé. Connectez-vous avec votre mot de passe.' }));
    }
  }, []);

  const allValid = email.trim() !== '' && password !== '';

  // --- CONNEXION EMAIL/PASSWORD ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setMessage({ type: 'success', content: 'Connexion réussie ! Redirection...' });
        // Revient sur la page demandée avant la connexion (ex. /dashboard/budget)
        const next = safeNextPath(new URLSearchParams(window.location.search).get('next'));
        setTimeout(() => {
          router.push(next);
        }, 1500);
      }
    } catch (error: any) {
      let errorMsg = "Email ou mot de passe incorrect.";
      if (error.message === "Email not confirmed") {
        errorMsg = "Veuillez confirmer votre email avant de vous connecter.";
      }
      setMessage({ type: 'error', content: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // --- CONNEXION SOCIALE (OAuth) ---
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(new URLSearchParams(window.location.search).get('next')))}`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: 'error', content: "Erreur lors de la connexion sociale." });
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col lg:flex-row">
      
      <title>Heureux de vous revoir parmi nous | WeddingStudio</title>

      {/* SECTION GAUCHE */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80" alt="Mariage" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-8">
            <Heart className="text-white w-8 h-8 fill-current" />
          </div>
          <h2 className="text-4xl font-normal text-white mb-6 italic" style={{ fontFamily: 'var(--font-display)' }}>Heureux de vous <br /> revoir parmi nous.</h2>
          <p className="text-slate-300 leading-relaxed font-medium">Connectez-vous pour continuer l&apos;organisation de votre journée inoubliable.</p>
        </div>
      </div>

      {/* SECTION DROITE */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-20">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-[440px]">
          <div className="mb-10">
            <h1 className="text-3xl font-normal text-slate-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>Connexion</h1>
            <p className="text-slate-500 font-medium">Entrez vos identifiants pour accéder à votre espace.</p>
          </div>

          {/* MESSAGES D'ALERTE */}
          {message.content && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
              {message.content}
            </motion.div>
          )}

          {/* BOUTONS SOCIAUX */}
          <div className="grid grid-cols-1 gap-3 mb-8">
            <button onClick={() => handleSocialLogin('google')} className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-4 rounded-2xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
              <Chrome className="w-5 h-5 text-[#4285F4]" />
              Continuer avec Google
            </button>
            <button onClick={() => handleSocialLogin('facebook')} className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-4 rounded-2xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
              <Facebook className="w-5 h-5 text-[#1877F2] fill-[#1877F2]" />
              Continuer avec Facebook
            </button>
          </div>

          <div className="relative mb-8 text-center text-slate-400">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative px-4 bg-ivory text-[10px] font-black uppercase tracking-widest">Ou avec votre email</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@exemple.com" required className="w-full bg-white border border-slate-200 py-4 pl-12 pr-4 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-slate-900 shadow-sm" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2 ml-1">
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">Mot de passe</label>
                <Link href={`/mot-de-passe-oublie${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`} className="text-[11px] font-black uppercase tracking-widest text-rose-500 hover:underline underline-offset-4">Oublié ?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="w-full bg-white border border-slate-200 py-4 pl-12 pr-12 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-medium text-slate-900 shadow-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>

            </div>

            <button type="submit" disabled={isLoading || !allValid} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-2 ${allValid ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center mt-10 text-sm font-medium text-slate-500">
            Vous n&apos;avez pas de compte ?{' '}
            <Link href="/register" className="text-rose-500 font-black hover:underline underline-offset-4">Inscrivez-vous gratuitement</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}