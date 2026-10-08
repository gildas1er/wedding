"use client";

// Mise en page des écrans de compte (mot de passe oublié, nouveau mot de passe), assortie à la page de connexion.
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, KeyRound } from 'lucide-react';

export default function AuthShell({ title, subtitle, sideTitle, sideText, children }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  sideTitle: React.ReactNode;
  sideText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory lg:flex-row">
      {/* Visuel (ordinateur) */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-slate-900 p-12 lg:flex lg:w-1/2">
        <div className="absolute inset-0 opacity-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500 shadow-2xl">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h2 className="mb-6 font-display text-4xl font-normal italic text-white">{sideTitle}</h2>
          <p className="font-medium leading-relaxed text-slate-300">{sideText}</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12 lg:p-20">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-[440px]">
          <Link href="/" className="mb-10 inline-flex items-baseline gap-0.5 lg:hidden">
            <Heart className="mr-1.5 h-4 w-4 self-center fill-rose-500 text-rose-500" />
            <span className="font-display text-xl text-ink">Wedding</span>
            <span className="font-display text-xl italic text-rose-500">Studio</span>
          </Link>
          <div className="mb-8">
            <h1 className="mb-2 font-display text-3xl font-normal text-slate-900">{title}</h1>
            {subtitle && <p className="font-medium text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export const authInputClass = 'w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-medium text-slate-900 shadow-sm outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20';
export const authLabelClass = 'mb-2 ml-1 block text-[11px] font-black uppercase tracking-widest text-slate-500';
export const authButtonClass = 'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-widest shadow-xl transition-all disabled:cursor-not-allowed';
