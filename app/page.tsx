"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, Mail, Wallet, Armchair, Users, CalendarClock,
  ShieldCheck, Menu, X, MessageCircle,
} from 'lucide-react';

/* ─────────────── CONTENU ─────────────── */
const slides = [
  { img: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200", label: "La réception" },
  { img: "https://images.pexels.com/photos/4074118/pexels-photo-4074118.jpeg?auto=compress&w=1200", label: "Le grand jour" },
  { img: "https://images.pexels.com/photos/29865464/pexels-photo-29865464.jpeg?auto=compress&w=1200", label: "La décoration" },
  { img: "https://images.pexels.com/photos/31184294/pexels-photo-31184294.jpeg?auto=compress&w=1200", label: "Un moment unique" },
];

const features = [
  { icon: MessageCircle, title: "Invitations WhatsApp", desc: "Envoyez chaque invitation en un geste. Vos proches répondent depuis leur téléphone, sans application à installer." },
  { icon: Users, title: "Liste d'invités", desc: "Mairie, église, réception : sachez qui vient à chaque cérémonie, avec les accompagnants et les régimes." },
  { icon: Armchair, title: "Plan de table", desc: "Placez vos invités sur un plan visuel, tables d'honneur comprises, puis imprimez-le pour votre traiteur." },
  { icon: Wallet, title: "Budget serein", desc: "Suivez devis, acomptes et soldes en FCFA, en euros ou en dollars. Plus de mauvaise surprise." },
  { icon: CalendarClock, title: "Déroulé du Jour J", desc: "Chaque moment de la journée est planifié : préparatifs, cérémonies, cocktail et soirée." },
  { icon: Mail, title: "Faire-part en ligne", desc: "Un faire-part élégant à vos couleurs, avec les adresses, les horaires et une musique d'ambiance." },
];

const steps = [
  { n: "I", title: "Créez votre espace", desc: "Vos prénoms, votre date : votre tableau de bord est prêt en quelques minutes." },
  { n: "II", title: "Invitez vos proches", desc: "Importez votre liste et envoyez les invitations par WhatsApp. Les réponses arrivent en direct." },
  { n: "III", title: "Profitez du grand jour", desc: "Budget, tables et déroulé sont prêts. Il ne vous reste qu'à vivre l'instant." },
];

const ease = [0.22, 1, 0.36, 1] as const;
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8, ease },
};

/* ─────────────── ÉLÉMENTS ─────────────── */
function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-baseline gap-0.5">
      <span className={`font-display text-[1.4rem] leading-none tracking-tight ${light ? 'text-white' : 'text-ink'}`}>Wedding</span>
      <span className={`font-display italic text-[1.4rem] leading-none ${light ? 'text-amber-300' : 'text-rose-500'}`}>Studio</span>
    </Link>
  );
}

/* ─────────────── PAGE ─────────────── */
export default function LandingPage() {
  const [current, setCurrent] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory text-ink">
      {/* ── NAVIGATION ── */}
      <nav className="fixed inset-x-0 top-0 z-[100] border-b border-slate-200/60 bg-ivory/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <div className="hidden items-center gap-9 text-sm text-slate-600 md:flex">
            <a href="#fonctionnalites" className="transition-colors hover:text-ink">Fonctionnalités</a>
            <a href="#comment" className="transition-colors hover:text-ink">Comment ça marche</a>
          </div>
          <div className="hidden items-center gap-5 md:flex">
            <Link href="/login" className="text-sm font-medium text-slate-600 transition-colors hover:text-ink">Se connecter</Link>
            <Link href="/register" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700">
              Commencer
            </Link>
          </div>
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" aria-expanded={menuOpen} className="-mr-2 p-2 text-ink md:hidden">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-200/60 bg-ivory md:hidden"
            >
              <div className="flex flex-col gap-1 px-5 py-4">
                <a href="#fonctionnalites" onClick={() => setMenuOpen(false)} className="py-2.5 text-slate-700">Fonctionnalités</a>
                <a href="#comment" onClick={() => setMenuOpen(false)} className="py-2.5 text-slate-700">Comment ça marche</a>
                <Link href="/login" className="py-2.5 text-slate-700">Se connecter</Link>
                <Link href="/register" className="mt-2 rounded-full bg-ink py-3 text-center font-semibold text-white">Créer mon espace</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HÉRO ── */}
      <section className="paper relative pt-28 pb-20 sm:pt-36 lg:pb-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            <p className="eyebrow">Organisation de mariage · Côte d&apos;Ivoire</p>
            <h1 className="mt-5 text-[2.75rem] font-normal leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.75rem]">
              Le plus beau jour de votre vie, <em className="text-rose-500">orchestré</em> avec élégance.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-slate-600">
              Invités, faire-part, plan de table, budget et déroulé du Jour J réunis dans un seul espace, pensé pour les mariages d&apos;ici.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/register" className="group inline-flex items-center gap-2.5 rounded-full bg-rose-500 px-7 py-4 text-[15px] font-semibold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:bg-rose-600">
                Créer mon espace gratuitement
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#fonctionnalites" className="inline-flex items-center gap-2 px-2 py-4 text-[15px] font-semibold text-ink underline decoration-amber-400 decoration-2 underline-offset-8 transition-colors hover:text-rose-600">
                Découvrir
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {['Gratuit pour commencer', 'Pensé pour le mobile', 'En FCFA'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check size={15} className="text-amber-600" />{t}</li>
              ))}
            </ul>
          </motion.div>

          {/* Arche photo */}
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.15, ease }} className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rounded-t-[999px] rounded-b-[2rem] border border-amber-300/70" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[1.75rem] bg-slate-200 shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.img
                  key={current}
                  src={slides[current].img}
                  alt={slides[current].label}
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 text-white">
                <p className="font-display text-lg italic">{slides[current].label}</p>
                <div className="flex gap-1.5">
                  {slides.map((s, i) => (
                    <button key={s.label} onClick={() => setCurrent(i)} aria-label={s.label} className={`h-1 rounded-full transition-all duration-500 ${i === current ? 'w-8 bg-white' : 'w-3 bg-white/40'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Carte flottante : réponse d'un invité */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9, duration: 0.8, ease }}
              className="absolute -left-4 bottom-20 w-56 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur sm:-left-14"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">Nouvelle réponse</p>
              <p className="mt-1.5 font-display text-[17px] text-ink">Aya B. sera présente</p>
              <p className="text-xs text-slate-500">Mairie · Église · Réception — 2 pers.</p>
            </motion.div>

            {/* Carte flottante : compte à rebours */}
            <motion.div
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8, ease }}
              className="absolute -right-3 top-16 rounded-2xl bg-ink px-5 py-4 text-white shadow-xl sm:-right-10"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Jour J</p>
              <p className="font-display text-3xl leading-tight">J-80</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── BANDEAU ── */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-5 py-10 sm:px-8 md:grid-cols-4">
          {[
            ['3 cérémonies', 'civile, religieuse, réception'],
            ['WhatsApp', 'pour inviter et relancer'],
            ['FCFA · € · $', 'budget multi-devises'],
            ['PDF', 'plans et listes à imprimer'],
          ].map(([v, l]) => (
            <div key={v} className="text-center">
              <p className="font-display text-2xl text-ink sm:text-3xl">{v}</p>
              <p className="mt-1 text-sm text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section id="fonctionnalites" className="scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">L&apos;atelier des mariés</p>
            <h2 className="mt-4 text-4xl font-normal leading-tight sm:text-5xl">
              Tout votre mariage, <em className="text-rose-500">au même endroit.</em>
            </h2>
            <div className="gold-rule mx-auto mt-8 w-24" />
          </motion.div>

          <div className="mt-16 grid gap-px overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-slate-200/80 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.06 }}
                className="group bg-white p-8 transition-colors hover:bg-ivory sm:p-10"
              >
                <div className="grid h-12 w-12 place-items-center rounded-full border border-amber-300 text-amber-700 transition-colors group-hover:bg-amber-50">
                  <f.icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="mt-6 font-display text-[22px] text-ink">{f.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VITRINE (fond encre) ── */}
      <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-rose-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-2">
          <motion.div {...reveal}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">Pensé pour les mariages d&apos;ici</p>
            <h2 className="mt-4 text-4xl font-normal leading-tight sm:text-5xl">
              Une organisation <em className="text-amber-300">sereine</em>, du premier devis au dernier pas de danse.
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-white/70">
              Budget en FCFA, invitations par WhatsApp, cérémonies civile et religieuse : WeddingStudio parle la langue de votre mariage.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'Les réponses de vos invités arrivent en direct',
                'Vos acomptes et soldes suivis au franc près',
                'Des plans de table prêts à imprimer pour le traiteur',
                'Tout se gère depuis votre téléphone',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-white/85">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-amber-300/60"><Check size={12} className="text-amber-300" /></span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Aperçu du budget */}
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.15 }} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Budget réglé</p>
                <p className="mt-2 font-display text-4xl">5 525 000 <span className="text-xl text-white/50">FCFA</span></p>
              </div>
              <p className="font-display text-2xl text-amber-300">65%</p>
            </div>
            <div className="mt-8 space-y-5">
              {[
                { label: 'Traiteur', pct: 40, amount: '3 400 000 F' },
                { label: 'Réception', pct: 25, amount: '2 125 000 F' },
                { label: 'Décoration florale', pct: 15, amount: '1 275 000 F' },
                { label: 'Tenues', pct: 12, amount: '1 020 000 F' },
              ].map((item, i) => (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-white/85">{item.label}</span>
                    <span className="text-white/50">{item.amount}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }} whileInView={{ width: `${item.pct * 2}%` }} viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.2 + i * 0.12, ease }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section id="comment" className="scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Comment ça marche</p>
            <h2 className="mt-4 text-4xl font-normal leading-tight sm:text-5xl">Trois étapes vers le <em className="text-rose-500">oui.</em></h2>
          </motion.div>
          <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => (
              <motion.div key={s.n} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} className="text-center md:text-left">
                <p className="font-display text-5xl italic text-amber-500">{s.n}</p>
                <div className="gold-rule my-5 md:mx-0 mx-auto w-16" />
                <h3 className="font-display text-2xl text-ink">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APPEL À L'ACTION ── */}
      <section className="px-5 pb-24 sm:px-8 sm:pb-32">
        <motion.div {...reveal} className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-ivory-deep px-6 py-16 text-center sm:px-16 sm:py-20">
          <div className="absolute inset-4 rounded-[1.5rem] border border-amber-300/60" aria-hidden />
          <div className="relative">
            <ShieldCheck className="mx-auto text-amber-600" size={28} strokeWidth={1.4} />
            <h2 className="mx-auto mt-6 max-w-2xl text-4xl font-normal leading-tight sm:text-5xl">
              Votre histoire mérite une organisation <em className="text-rose-500">à sa hauteur.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-slate-600">Créez votre espace en quelques minutes. C&apos;est gratuit pour commencer.</p>
            <Link href="/register" className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-ink px-8 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-rose-700">
              Créer mon espace <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── PIED DE PAGE ── */}
      <footer className="bg-ink px-5 pt-16 pb-10 text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <Wordmark light />
              <p className="mt-4 text-sm leading-relaxed text-white/55">L&apos;atelier digital des mariés, né en Côte d&apos;Ivoire.</p>
            </div>
            <div className="flex gap-16 text-sm">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Produit</p>
                <a href="#fonctionnalites" className="block text-white/70 hover:text-white">Fonctionnalités</a>
                <a href="#comment" className="block text-white/70 hover:text-white">Comment ça marche</a>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Compte</p>
                <Link href="/login" className="block text-white/70 hover:text-white">Se connecter</Link>
                <Link href="/register" className="block text-white/70 hover:text-white">Créer un compte</Link>
              </div>
            </div>
          </div>
          <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-8 text-xs text-white/40 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} WeddingStudio</p>
            <p>Fait avec soin à Abidjan</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
