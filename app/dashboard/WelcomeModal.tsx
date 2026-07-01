"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Users, Banknote, ClipboardList, X } from 'lucide-react';

interface WelcomeModalProps {
  partner1: string;
  partner2: string;
  onClose: () => void;
  onAction: (route: string) => void;
}

export default function WelcomeModal({ partner1, partner2, onClose, onAction }: WelcomeModalProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] p-8 lg:p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden"
        >
          {/* Décoration de fond */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl mb-6">
              <Heart size={32} className="fill-rose-500" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">
              Félicitations {partner1} & {partner2} ! 🥂
            </h2>
            <p className="text-slate-500 font-medium">
              Votre espace de planification est prêt. Par quelle étape souhaitez-vous commencer l'aventure ?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard 
              icon={Users} 
              title="Invités" 
              desc="Importer vos premiers contacts"
              color="emerald"
              onClick={() => onAction('/dashboard/invite')}
            />
            <QuickActionCard 
              icon={Banknote} 
              title="Budget" 
              desc="Fixer vos limites financières"
              color="rose"
              onClick={() => onAction('/dashboard/budget')}
            />
            <QuickActionCard 
              icon={ClipboardList} 
              title="Tâches" 
              desc="Voir les priorités du mois"
              color="indigo"
              onClick={() => onAction('/dashboard/tasks')}
            />
          </div>

          <div className="mt-10 text-center">
            <button 
              onClick={onClose}
              className="text-sm font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
            >
              Plus tard, je vais explorer seul
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function QuickActionCard({ icon: Icon, title, desc, color, onClick }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 shadow-emerald-100",
    rose: "bg-rose-50 text-rose-600 hover:bg-rose-600 shadow-rose-100",
    indigo: "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 shadow-indigo-100"
  };

  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center p-6 rounded-3xl border border-slate-100 transition-all hover:border-transparent hover:shadow-xl group"
    >
      <div className={`p-4 rounded-2xl mb-4 transition-colors ${colors[color]} group-hover:text-white`}>
        <Icon size={24} />
      </div>
      <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-[11px] text-slate-400 font-medium leading-tight">{desc}</p>
    </button>
  );
}