"use client";

// Carte « Votre parcours » : les 5 premières étapes d'un mariage bien lancé, cochées
// automatiquement à partir des données du couple. Disparaît quand tout est fait.
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

export type JourneyState = {
  templateChosen: boolean;
  firstSent: boolean;
  guests: number;
  firstAnswer: boolean;
  cover: boolean;
};

export function journeySteps(s: JourneyState) {
  return [
    { label: 'Choisir votre modèle de faire-part', done: s.templateChosen, href: '/dashboard/studio', action: 'Ouvrir le Studio' },
    { label: 'Envoyer une première invitation', done: s.firstSent, href: '/dashboard/invite', action: 'Choisir un invité' },
    { label: `Ajouter 10 invités${s.guests > 0 && s.guests < 10 ? ` (${s.guests} / 10)` : ''}`, done: s.guests >= 10, href: '/dashboard/invite', action: 'Importer mes contacts' },
    { label: 'Recevoir une première réponse', done: s.firstAnswer, href: '/dashboard/invite', action: 'Relancer mes invités' },
    { label: 'Ajouter votre photo de couverture', done: s.cover, href: '/dashboard/studio', action: 'Ajouter ma photo' },
  ];
}

export default function JourneyCard({ state }: { state: JourneyState }) {
  const steps = journeySteps(state);
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <section className="mb-8 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:mb-10 sm:p-7" aria-labelledby="journey-title">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">Bien démarrer</p>
          <h2 id="journey-title" className="mt-1 font-display text-2xl text-ink">Votre parcours</h2>
        </div>
        <p className="font-display text-2xl text-rose-500">{done}<span className="text-base text-slate-400"> / {steps.length}</span></p>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-[width] duration-700" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-4 divide-y divide-slate-100">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3 py-2.5">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] ${s.done ? 'border-emerald-600 bg-emerald-600 text-white' : i === nextIndex ? 'border-rose-500' : 'border-slate-300'}`}>
              {s.done && <Check size={12} strokeWidth={3} />}
            </span>
            <span className={`min-w-0 flex-1 text-sm ${s.done ? 'text-slate-400 line-through' : i === nextIndex ? 'font-semibold text-ink' : 'text-slate-600'}`}>{s.label}</span>
            {i === nextIndex && (
              <Link href={s.href} className="group inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-rose-600 hover:text-rose-700">
                <span className="hidden sm:inline">{s.action}</span><span className="sm:hidden">Y aller</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
