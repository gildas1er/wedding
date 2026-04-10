"use client";
import React, { useState, useEffect, useRef } from 'react';
// useRef kept for heroRef (section scroll anchor)
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, BarChart3, Printer,
  ArrowRight, ChevronLeft, ChevronRight,
  CheckCircle2, Sparkles, Smartphone, Star,
  Users, Calendar, Shield, Zap
} from 'lucide-react';

/* ─────────────── DATA ─────────────── */
const slides = [
  {
    img: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200",
    label: "Cérémonie",
  },
  {
    img: "https://images.pexels.com/photos/4074118/pexels-photo-4074118.jpeg?auto=compress&w=1200",
    label: "Réception",
  },
  {
    img: "https://images.pexels.com/photos/29865464/pexels-photo-29865464.jpeg?auto=compress&w=1200",
    label: "Décoration",
  },
  {
    img: "https://images.pexels.com/photos/31184294/pexels-photo-31184294.jpeg?auto=compress&w=1200",
    label: "Moment unique",
  },
];

const features = [
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "WhatsApp Sync",
    desc: "Envoyez vos invitations. Vos invités valident, le tableau de bord se met à jour instantanément.",
    accent: "#f43f5e",
    bg: "#fff1f3",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Budget Intelligent",
    desc: "Conversion CFA/Euro en temps réel. Gérez vos acomptes et restes à payer en toute sérénité.",
    accent: "#d97706",
    bg: "#fffbeb",
  },
  {
    icon: <Printer className="w-6 h-6" />,
    title: "Export Studio",
    desc: "Générez vos plans de table et menus en PDF haute définition d'un simple clic.",
    accent: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Liste d'invités",
    desc: "Gérez votre liste complète, les régimes alimentaires et les placements de table facilement.",
    accent: "#0891b2",
    bg: "#ecfeff",
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: "Planning Détaillé",
    desc: "Chaque étape planifiée au quart d'heure, des préparatifs à la soirée dansante.",
    accent: "#16a34a",
    bg: "#f0fdf4",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Données Sécurisées",
    desc: "Vos informations personnelles et celles de vos invités sont chiffrées et protégées.",
    accent: "#be185d",
    bg: "#fdf2f8",
  },
];

const testimonials = [
  {
    name: "Amina & Koffi",
    date: "Mariage en Janvier 2026",
    text: "WeddingStudio a transformé notre planification. Les RSVP WhatsApp ont été une révolution — 180 réponses en 48h !",
    avatar: "AK",
    stars: 5,
  },
  {
    name: "Chloé & Thierry",
    date: "Mariage en Mars 2026",
    text: "Le budget intelligent nous a évité de nombreuses surprises. L'export PDF pour nos tables était impeccable.",
    avatar: "CT",
    stars: 5,
  },
  {
    name: "Fatou & Samuel",
    date: "Mariage en Mai 2026",
    text: "Interface magnifique, simple à utiliser. Notre wedding planner était aussi conquise. Je recommande à 100%.",
    avatar: "FS",
    stars: 5,
  },
];

const stats = [
  { value: "2 400+", label: "Mariés comblés" },
  { value: "98%", label: "Satisfaction" },
  { value: "12min", label: "Mise en route" },
  { value: "100%", label: "Gratuit au départ" },
];

/* ─────────────── HELPERS ─────────────── */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500 hover:text-rose-500 transition-colors duration-200"
    >
      {children}
    </a>
  );
}

function StarRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
      ))}
    </div>
  );
}

/* ─────────────── MAIN ─────────────── */
export default function LandingPage() {
  const [current, setCurrent] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  /* Auto-slide */
  useEffect(() => {
    const t = setInterval(
      () => setCurrent((p) => (p + 1) % slides.length),
      5000
    );
    return () => clearInterval(t);
  }, []);

  const prev = () => setCurrent((p) => (p === 0 ? slides.length - 1 : p - 1));
  const next = () => setCurrent((p) => (p + 1) % slides.length);

  return (
    <div
      className="min-h-screen bg-[#FAFAF8] text-slate-900 overflow-x-hidden"
      style={{ fontFamily: '"DM Sans", sans-serif' }}
    >
      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-[100] bg-white/90 backdrop-blur-2xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 group-hover:scale-105 transition-transform">
              <Heart className="text-white w-4 h-4 fill-current" />
            </div>
            <span
              className="text-xl font-black tracking-tight text-slate-900"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Wedding<span className="text-rose-500">Studio</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#features">Fonctionnalités</NavLink>
            <NavLink href="#testimonials">Témoignages</NavLink>
            <NavLink href="#about">À propos</NavLink>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="/login"
              className="text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:text-rose-500 transition-colors"
            >
              Connexion
            </a>
            <a
              href="/register"
              className="bg-rose-500 text-white px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-0.5"
            >
              Commencer
            </a>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex flex-col gap-1.5 p-2"
          >
            <span className={`block h-0.5 w-6 bg-slate-800 transition-transform duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 w-6 bg-slate-800 transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-6 bg-slate-800 transition-transform duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden bg-white border-t border-slate-100"
            >
              <div className="flex flex-col gap-4 px-6 py-6">
                {['#features', '#testimonials', '#about'].map((href) => (
                  <a key={href} href={href} onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-slate-700 hover:text-rose-500 transition-colors">
                    {href.replace('#', '').charAt(0).toUpperCase() + href.replace('#', '').slice(1)}
                  </a>
                ))}
                <a href="/register" className="mt-2 bg-rose-500 text-white text-center py-3 rounded-xl text-sm font-bold tracking-wide">
                  Commencer gratuitement
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-20 overflow-hidden"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-[#FAFAF8] to-amber-50/40 -z-10" />

        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-rose-100/40 blur-3xl -z-10" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-amber-100/30 blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-20 items-center w-full">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-rose-100 shadow-sm mb-8"
            >
              <Sparkles className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">
                L'organisation réinventée
              </span>
            </motion.div>

            {/* Headline */}
            <h1
              className="text-5xl lg:text-[5.5rem] font-black leading-[1.05] mb-8 text-slate-900"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Le plus{' '}
              <em className="text-rose-500 not-italic">beau jour</em>
              <br /> de votre vie,{' '}
              <br />
              <span className="relative inline-block">
                orchestré.
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 9 Q75 2 150 8 Q225 14 298 7" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" fill="none" />
                </svg>
              </span>
            </h1>

            <p className="text-slate-500 text-lg leading-relaxed mb-10 max-w-md font-normal">
              WeddingStudio allie <strong className="text-slate-700 font-semibold">élégance du design</strong> et gestion moderne — RSVP WhatsApp, budget intelligent, exports PDF & bien plus.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4 mb-14">
              <a
                href="/register"
                className="group inline-flex items-center gap-3 bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-1"
              >
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#features"
                className="inline-flex items-center gap-2 bg-white text-slate-700 px-8 py-4 rounded-2xl font-bold text-sm border border-slate-200 hover:border-rose-200 hover:text-rose-500 transition-all shadow-sm"
              >
                Voir les fonctionnalités
              </a>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-5">
              <div className="flex -space-x-3">
                {['AK', 'CT', 'FS', 'MB'].map((init, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-md"
                    style={{
                      background: `hsl(${i * 55 + 340}, 70%, 60%)`,
                      zIndex: 4 - i,
                    }}
                  >
                    {init}
                  </div>
                ))}
              </div>
              <div>
                <StarRow />
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  <strong className="text-slate-800">2 400+ mariés</strong> nous font confiance
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right column — Slider */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Main frame */}
            <div className="relative rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.15)] border-[10px] border-white aspect-[4/5] bg-slate-100">
              <AnimatePresence mode="wait">
                <motion.img
                  key={current}
                  src={slides[current].img}
                  alt={slides[current].label}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.9, ease: 'easeInOut' }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Slide label */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`label-${current}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-6 left-6 text-white"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 mb-1">
                    {slides[current].label}
                  </p>
                  <div className="flex gap-1.5">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={`h-1 rounded-full transition-all duration-300 ${i === current ? 'bg-white w-8' : 'bg-white/40 w-4'}`}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Nav arrows */}
              <div className="absolute inset-y-0 inset-x-0 flex items-center justify-between px-4 pointer-events-none">
                <button
                  onClick={prev}
                  className="pointer-events-auto w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/40 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  className="pointer-events-auto w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/40 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Floating card — RSVP */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-8 -left-6 bg-white p-5 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-50 flex items-center gap-4 min-w-[200px]"
            >
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900" style={{ fontFamily: '"Playfair Display", serif' }}>
                  RSVP reçu !
                </p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                  Via WhatsApp
                </p>
              </div>
            </motion.div>

            {/* Floating card — guests */}
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute -top-8 -right-4 bg-white p-4 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.10)] border border-slate-50"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Invités confirmés</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-rose-500" style={{ fontFamily: '"Playfair Display", serif' }}>
                  184
                </span>
                <span className="text-sm font-bold text-slate-400 mb-1">/ 210</span>
              </div>
              <div className="mt-2 h-1.5 w-36 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-rose-400" style={{ width: '87.6%' }} />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="bg-slate-900 py-14">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p
                className="text-4xl font-black text-white mb-1"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                {s.value}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block text-[10px] font-black uppercase tracking-[0.5em] text-rose-500 mb-4"
            >
              Nos outils Studio
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Tout gérer, <em className="text-rose-500">au même endroit.</em>
            </motion.h2>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 cursor-default"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: f.bg, color: f.accent }}
                >
                  {f.icon}
                </div>
                <h3
                  className="text-xl font-black mb-3 text-slate-900"
                  style={{ fontFamily: '"Playfair Display", serif' }}
                >
                  {f.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>

                {/* Accent bottom bar */}
                <div
                  className="mt-6 h-0.5 w-0 group-hover:w-12 rounded-full transition-all duration-500"
                  style={{ backgroundColor: f.accent }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHOWCASE SPLIT ── */}
      <section id="about" className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          {/* Mockup side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-rose-500 to-rose-600 p-8 shadow-[0_40px_80px_rgba(244,63,94,0.25)]">
              {/* Mock dashboard UI */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Budget total</p>
                    <p className="text-white text-2xl font-black mt-0.5" style={{ fontFamily: '"Playfair Display", serif' }}>
                      8 500 000 F
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Traiteur', pct: 40, amount: '3 400 000 F' },
                    { label: 'Lieu', pct: 25, amount: '2 125 000 F' },
                    { label: 'Décoration', pct: 15, amount: '1 275 000 F' },
                    { label: 'Tenues', pct: 12, amount: '1 020 000 F' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-white text-[11px] font-semibold mb-1">
                        <span>{item.label}</span>
                        <span className="text-white/70">{item.amount}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/20">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.15 }}
                          className="h-full rounded-full bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invites card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Invités RSVP</p>
                  <p className="text-white font-black">184 confirmés · 18 en attente</p>
                </div>
                <div className="w-8 h-8 bg-green-400/30 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-200" />
                </div>
              </div>
            </div>

            {/* Decoration */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-3xl bg-amber-100 -z-10 rotate-6" />
            <div className="absolute -top-6 -left-6 w-20 h-20 rounded-2xl bg-rose-100 -z-10 -rotate-12" />
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-500 block mb-5">
              Notre Vision
            </span>
            <h2
              className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-6"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Conçu pour les mariés{' '}
              <em className="text-rose-500">modernes.</em>
            </h2>
            <p className="text-slate-500 leading-relaxed mb-8">
              Nous savons que chaque mariage est unique. WeddingStudio a été pensé depuis la Côte d'Ivoire pour répondre aux réalités locales : gestion en CFA, invitations WhatsApp, et exports élégants pour vos prestataires.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                'RSVP instantané via WhatsApp sans application à installer',
                'Conversion CFA / Euro en temps réel',
                'Plans de table générés en PDF prêts à imprimer',
                'Tableau de bord accessible depuis votre téléphone',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-rose-500" />
                  </div>
                  <span className="text-slate-600 text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <a
              href="/register"
              className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-rose-500 transition-all"
            >
              Créer mon espace mariage <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-32 bg-[#FAFAF8] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-500 block mb-4">
              Ils nous font confiance
            </span>
            <h2
              className="text-4xl lg:text-5xl font-black text-slate-900"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Ils ont dit <em className="text-rose-500">oui.</em>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow"
              >
                <StarRow count={t.stars} />
                <p className="text-slate-600 text-sm leading-relaxed mt-5 mb-6 font-medium">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ background: `hsl(${i * 60 + 340}, 65%, 62%)` }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{t.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      {t.date}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-rose-500 rounded-[3rem] p-16 text-center overflow-hidden shadow-[0_40px_100px_rgba(244,63,94,0.3)]"
          >
            {/* Blobs */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-rose-400 rounded-full opacity-30 blur-2xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-rose-600 rounded-full opacity-30 blur-2xl" />

            <div className="relative z-10">
              <Heart className="w-12 h-12 text-white/30 fill-white/20 mx-auto mb-6" />
              <h2
                className="text-4xl lg:text-5xl font-black text-white mb-4 leading-tight"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                Prêts à commencer <br />
                votre aventure ?
              </h2>
              <p className="text-white/80 text-lg mb-10 max-w-lg mx-auto">
                Rejoignez les 2 400+ couples qui organisent leur mariage de rêve avec WeddingStudio.
              </p>
              <a
                href="/register"
                className="inline-flex items-center gap-3 bg-white text-rose-500 px-10 py-5 rounded-2xl font-black text-sm hover:scale-105 transition-transform shadow-xl"
              >
                Créer mon espace gratuitement
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center">
                  <Heart className="text-white w-4 h-4 fill-current" />
                </div>
                <span
                  className="text-xl font-black text-white"
                  style={{ fontFamily: '"Playfair Display", serif' }}
                >
                  Wedding<span className="text-rose-400">Studio</span>
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                L'excellence digitale pour votre union. Simplifiez chaque étape de votre mariage avec nos outils professionnels.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5">
                Produit
              </p>
              <ul className="space-y-3">
                {['Fonctionnalités', 'Tarifs', 'Guide démarrage', 'FAQ'].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-5">
                Légal
              </p>
              <ul className="space-y-3">
                {["Conditions d'utilisation", 'Confidentialité', 'Cookies', 'Contact'].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              © 2026 WeddingStudio Côte d'Ivoire · Créé pour l'éternité
            </p>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
              Fait avec <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 mx-1" /> en Côte d'Ivoire
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
