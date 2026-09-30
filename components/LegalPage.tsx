import React from 'react';
import Link from 'next/link';
import { LEGAL } from '../lib/legal';

// Mise en page commune des documents juridiques
export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory text-ink">
      <header className="border-b border-slate-200/70 bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="inline-flex items-baseline gap-0.5">
            <span className="font-display text-xl text-ink">Wedding</span><span className="font-display text-xl italic text-rose-500">Studio</span>
          </Link>
          <nav className="flex gap-4 text-sm text-slate-500">
            <Link href="/conditions" className="hover:text-ink">Conditions</Link>
            <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-normal leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-slate-600">{intro}</p>
        <p className="mt-2 text-sm text-slate-400">Dernière mise à jour : {LEGAL.lastUpdate} · version {LEGAL.version}</p>
        <div className="legal mt-10 space-y-10">{children}</div>
      </main>
    </div>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="font-display text-2xl font-normal text-ink">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-700 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:space-y-1.5">{children}</div>
    </section>
  );
}
