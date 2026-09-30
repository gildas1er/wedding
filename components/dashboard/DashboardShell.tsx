"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart, Users, Banknote, LogOut, Settings, LayoutDashboard,
  ClipboardList, Utensils, Send, Clock, Crown, Menu, X, type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../app/lib/supabase';
import PricingModal from './PricingModal';

const MENU_FONT = { fontFamily: '"Inter", system-ui, sans-serif' };

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Général',
    items: [{ href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard }],
  },
  {
    title: 'Organisation',
    items: [
      { href: '/dashboard/invite', label: 'Liste des invités', icon: Users },
      { href: '/dashboard/studio', label: 'Invitations (RSVP)', icon: Send },
      { href: '/dashboard/table', label: 'Gestion des tables', icon: Utensils },
      { href: '/dashboard/tasks', label: 'Mes tâches', icon: ClipboardList },
      { href: '/dashboard/budget', label: 'Budget', icon: Banknote },
      { href: '/dashboard/planning', label: 'Planning Jour J', icon: Clock },
    ],
  },
  {
    title: 'Compte',
    items: [{ href: '/dashboard/settings', label: 'Paramètres', icon: Settings }],
  },
];

// Pages qui partagent la même entrée de menu (anciennes versions, vues d'impression…)
const ACTIVE_ALIASES: Record<string, string> = {
  '/dashboard/guests': '/dashboard/invite',
  '/dashboard/tables': '/dashboard/table',
  '/dashboard/invitation': '/dashboard/studio',
};

function isActive(pathname: string, href: string) {
  const base = Object.entries(ACTIVE_ALIASES).find(([alias]) => pathname.startsWith(alias))?.[1];
  const current = base ?? pathname;
  if (href === '/dashboard') return current === '/dashboard';
  return current === href || current.startsWith(`${href}/`);
}

function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3">
      <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100">
        <Heart size={20} className="text-white fill-white" />
      </div>
      <span className="font-bold text-xl tracking-tight text-slate-900">Mariage</span>
    </Link>
  );
}

function SidebarContent({ pathname, onUpgrade, onLogout, onNavigate }: { pathname: string; onUpgrade: () => void; onLogout: () => void; onNavigate?: () => void }) {
  return (
    <>
      <nav id="dashboard-sidebar-nav" className="flex-1 px-4 space-y-1 overflow-y-auto">
        {NAV_SECTIONS.map((section, i) => (
          <div key={section.title} className={i > 0 ? 'pt-6' : ''}>
            <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{section.title}</p>
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mt-8 p-6 bg-gradient-to-br from-indigo-600 to-rose-500 rounded-[2rem] text-white shadow-xl relative overflow-hidden group mx-2">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
          <h4 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Crown size={12} /> Version Premium</h4>
          <p className="text-[10px] leading-relaxed mb-4 font-medium text-white/80">Débloquez l&apos;export PDF et les invités illimités.</p>
          <button onClick={onUpgrade} className="w-full py-3 bg-white text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">Upgrade</button>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/dashboard';
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  // Bloque le scroll de la page et permet de fermer avec Échap quand le menu est ouvert
  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const openPricing = () => { setDrawerOpen(false); setShowPricing(true); };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* BARRE LATÉRALE — ORDINATEUR */}
      <aside style={MENU_FONT} className="hidden lg:flex fixed inset-y-0 left-0 w-64 z-40 flex-col bg-white border-r border-slate-200 print:hidden">
        <div className="p-8"><Logo /></div>
        <SidebarContent pathname={pathname} onUpgrade={openPricing} onLogout={handleLogout} />
      </aside>

      {/* BARRE DU HAUT — MOBILE & TABLETTE */}
      <header style={MENU_FONT} className="lg:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between bg-white/90 backdrop-blur-xl border-b border-slate-200 print:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={drawerOpen}
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <Menu size={22} />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center"><Heart size={16} className="text-white fill-white" /></div>
          <span className="font-bold text-lg tracking-tight text-slate-900">Mariage</span>
        </Link>
        <span className="w-9" aria-hidden />
      </header>

      {/* MENU TIROIR — MOBILE & TABLETTE */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="lg:hidden fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm print:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              style={MENU_FONT}
              role="dialog"
              aria-modal="true"
              aria-label="Menu principal"
              className="lg:hidden fixed inset-y-0 left-0 z-[95] w-72 max-w-[85vw] flex flex-col bg-white shadow-2xl print:hidden"
            >
              <div className="p-6 flex items-center justify-between">
                <Logo onNavigate={() => setDrawerOpen(false)} />
                <button onClick={() => setDrawerOpen(false)} aria-label="Fermer le menu" className="p-2 rounded-xl text-slate-500 hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent pathname={pathname} onUpgrade={openPricing} onLogout={handleLogout} onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
      </AnimatePresence>

      <div className="lg:pl-64 min-w-0 print:pl-0">{children}</div>
    </div>
  );
}
