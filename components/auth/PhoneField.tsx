"use client";

// Numéro de téléphone avec choix du pays (tous les pays, Côte d'Ivoire par défaut).
// Le pays se choisit dans une liste native : sur téléphone, elle s'ouvre en plein écran et
// on peut taper les premières lettres pour aller au bon pays.
import React, { useMemo } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js';
import { countryOptions } from '../../lib/phone-auth';

export default function PhoneField({ id, country, onCountry, value, onValue, error, autoFocus }: {
  id: string;
  country: CountryCode;
  onCountry: (c: CountryCode) => void;
  value: string;
  onValue: (v: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  const { first, others } = useMemo(() => countryOptions(), []);
  const current = [...first, ...others].find((c) => c.code === country);
  const border = error ? 'border-red-200 focus-within:ring-red-500/10 focus-within:border-red-500' : 'border-slate-200 focus-within:ring-rose-500/20 focus-within:border-rose-500';
  return (
    <div className={`flex w-full items-stretch rounded-2xl border bg-white shadow-sm transition-all focus-within:ring-2 ${border}`}>
      <div className="relative flex shrink-0 items-center border-r border-slate-200">
        <span aria-hidden className="pointer-events-none flex items-center gap-1.5 pl-4 pr-7 font-semibold text-slate-900">
          <span className="text-lg leading-none">{current?.flag}</span>{current?.dial}
        </span>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-2 h-4 w-4 text-slate-400" />
        <select
          aria-label="Pays"
          value={country}
          onChange={(e) => onCountry(e.target.value as CountryCode)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          <optgroup label="Les plus utilisés">
            {first.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</option>)}
          </optgroup>
          <optgroup label="Tous les pays">
            {others.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</option>)}
          </optgroup>
        </select>
      </div>
      <div className="relative min-w-0 flex-1">
        <Phone className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${error ? 'text-red-400' : 'text-slate-400'}`} />
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onValue(e.target.value.replace(/[^\d\s().-]/g, ''))}
          placeholder={country === 'CI' ? '07 00 00 00 00' : 'Votre numéro'}
          className="w-full rounded-r-2xl bg-transparent py-4 pl-12 pr-4 font-medium text-slate-900 outline-none"
        />
      </div>
    </div>
  );
}
