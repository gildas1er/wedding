"use client";

// Liste des règles du mot de passe, avec un exemple pour chacune : elles passent au vert une à une
import React from 'react';
import { Check } from 'lucide-react';
import { passwordChecks } from '../../lib/password';

const RULES = [
  { key: 'length', label: '8+ caractères', example: 'ex. Mariage2026!' },
  { key: 'upper', label: '1 Majuscule', example: 'ex. M' },
  { key: 'lower', label: '1 Minuscule', example: 'ex. a' },
  { key: 'number', label: '1 Chiffre', example: 'ex. 2026' },
  { key: 'special', label: '1 Spécial', example: 'ex. ! @ # ?' },
] as const;

export default function PasswordCriteria({ password, className = '' }: { password: string; className?: string }) {
  const checks = passwordChecks(password);
  return (
    <div className={`p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col gap-1.5 ${className}`}>
      {RULES.map(({ key, label, example }) => {
        const met = checks[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="flex w-3.5 shrink-0 justify-center">
              {met ? <Check className="w-3 h-3 text-emerald-500" /> : <div className="w-1 h-1 rounded-full bg-slate-300" />}
            </span>
            <span className={`text-[10px] font-medium ${met ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
            <span className={`ml-auto shrink-0 rounded-md border px-1.5 py-px font-mono text-[10px] ${met ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>{example}</span>
          </div>
        );
      })}
    </div>
  );
}
