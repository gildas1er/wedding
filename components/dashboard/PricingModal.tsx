"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin, Send, Zap, X, type LucideIcon } from 'lucide-react';

function PricingFeature({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon size={16} /></div>
      <span className="text-sm font-bold text-slate-700">{text}</span>
    </div>
  );
}

export default function PricingModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-[2rem] sm:rounded-[3rem] max-w-4xl w-full max-h-[90dvh] overflow-y-auto shadow-2xl flex flex-col md:flex-row"
      >
        <button onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 text-slate-400 hover:text-slate-700 md:hidden">
          <X size={18} />
        </button>
        <div className="p-8 sm:p-12 flex-1">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Passez au Premium 👑</h2>
          <p className="text-slate-500 mb-8 font-medium">Tout ce dont vous avez besoin pour un mariage sans stress.</p>
          <div className="space-y-4">
            <PricingFeature icon={Users} text="Invités illimités (Gratuit limité à 15)" />
            <PricingFeature icon={MapPin} text="Plan de table interactif" />
            <PricingFeature icon={Send} text="Relances RSVP automatiques" />
            <PricingFeature icon={Zap} text="Export PDF pour le traiteur" />
          </div>
        </div>
        <div className="bg-slate-50 p-8 sm:p-12 w-full md:w-[350px] flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100">
          <div className="mb-8">
            <span className="text-4xl font-black text-slate-900">25.000</span>
            <span className="text-sm font-bold text-slate-400"> FCFA</span>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">Paiement unique - Accès à vie</p>
          </div>
          <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all mb-4">
            Débloquer maintenant
          </button>
          <button onClick={onClose} className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Plus tard</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
