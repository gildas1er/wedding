"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Users, Wallet, LogOut, Settings, LayoutGrid,
  ListChecks, Armchair, Mail, CalendarClock, Crown, Menu, X, QrCode, Heart, Lock, Loader2, Images, type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../app/lib/supabase';
import PricingModal from './PricingModal';
import SouvenirModal from './SouvenirModal';
import DeleteAccountModal from './DeleteAccountModal';
import { isPremium } from '../../lib/plan';
import { SOUVENIR_ALLOWED_PATHS, formatLongDate, spaceLifecycle } from '../../lib/lifecycle';

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Général',
    items: [{ href: '/dashboard', label: 'Tableau de bord', icon: LayoutGrid }],
  },
  {
    title: 'Organisation',
    items: [
      { href: '/dashboard/invite', label: 'Invités', icon: Users },
      { href: '/dashboard/studio', label: 'Faire-part & RSVP', icon: Mail },
      { href: '/dashboard/partage', label: 'Partager', icon: QrCode },
      { href: '/dashboard/album', label: 'Album photos', icon: Images },
      { href: '/dashboard/table', label: 'Plan de table', icon: Armchair },
      { href: '/dashboard/tasks', label: 'Checklist', icon: ListChecks },
      { href: '/dashboard/budget', label: 'Budget', icon: Wallet },
      { href: '/dashboard/planning', label: 'Jour J', icon: CalendarClock },
    ],
  },
  {
    title: 'Compte',
    items: [{ href: '/dashboard/settings', label: 'Paramètres', icon: Settings }],
  },
];

type Couple = {
  id: string; p1: string; p2: string; date: string | null; premium: boolean;
  lifecycle: ReturnType<typeof spaceLifecycle>;
};

const SOUVENIR_ITEM: NavItem = { href: '/dashboard/souvenir', label: 'Mes souvenirs', icon: Heart };
const ALBUM_ITEM: NavItem = { href: '/dashboard/album', label: 'Album photos', icon: Images };
const SOUVENIR_ITEMS = [SOUVENIR_ITEM, ALBUM_ITEM];
const isAllowedInSouvenir = (pathname: string) => SOUVENIR_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function daysUntil(date: string | null) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  return diff;
}

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onNavigate} className="group inline-flex items-baseline gap-0.5">
      <span className="font-display text-[1.35rem] leading-none text-ink tracking-tight">Wedding</span>
      <span className="font-display italic text-[1.35rem] leading-none text-rose-500">Studio</span>
    </Link>
  );
}

// Carte du couple : monogramme + compte à rebours
function CoupleCard({ couple }: { couple: Couple | null }) {
  const days = daysUntil(couple?.date ?? null);
  const initials = couple ? `${couple.p1.charAt(0)}${couple.p2.charAt(0)}`.toUpperCase() : '';
  return (
    <div className="mx-4 mb-5 rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ivory ring-1 ring-amber-300">
          <span className="font-display text-base text-amber-700 tracking-wide">
            {initials ? `${initials.charAt(0)}·${initials.charAt(1)}` : '♥'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] text-ink">
            {couple ? <>{couple.p1} <span className="italic text-rose-500">&</span> {couple.p2}</> : <span className="text-slate-400">Votre mariage</span>}
          </p>
          <p className="text-xs text-slate-500">
            {couple?.date
              ? new Date(couple.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Date à définir'}
          </p>
        </div>
      </div>
      {days !== null && days >= 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-ivory px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Jour J</span>
          <span className="font-display text-lg text-rose-600">{days === 0 ? "C'est aujourd'hui" : `J-${days}`}</span>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ pathname, couple, onUpgrade, onLogout, onNavigate }: {
  pathname: string; couple: Couple | null; onUpgrade: () => void; onLogout: () => void; onNavigate?: () => void;
}) {
  const souvenir = couple?.lifecycle.phase === 'souvenir';
  // Mode souvenir : « Mes souvenirs » et l'album en tête, le reste verrouillé
  const sections = souvenir
    ? [{ title: 'Souvenirs', items: SOUVENIR_ITEMS }, ...NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter((it) => it.href !== ALBUM_ITEM.href) }))]
    : NAV_SECTIONS;
  return (
    <>
      <CoupleCard couple={couple} />

      <nav id="dashboard-sidebar-nav" className="flex-1 px-3 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={section.title} className={i > 0 ? 'pt-4' : ''}>
            <p className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                // Mode souvenir : les rubriques restent visibles mais ne sont plus accessibles
                if (souvenir && !SOUVENIR_ITEMS.some((it) => it.href === href)) {
                  return (
                    <span
                      key={href}
                      aria-disabled="true"
                      title="Indisponible en mode souvenir"
                      className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-slate-400/80"
                    >
                      <Icon size={18} strokeWidth={1.6} className="text-slate-300" />
                      <span className="flex-1">{label}</span>
                      <Lock size={13} className="text-slate-300" />
                    </span>
                  );
                }
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigate}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-all ${
                      active
                        ? 'bg-white text-ink font-semibold shadow-sm ring-1 ring-slate-200/80'
                        : 'text-slate-600 font-medium hover:bg-white/60 hover:text-ink'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-rose-500" />}
                    <Icon size={18} strokeWidth={active ? 2 : 1.6} className={active ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-600'} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Offre Premium / mode souvenir */}
        {souvenir ? (
          <Link href="/dashboard/souvenir" onClick={onNavigate} className="mt-6 mb-3 block rounded-2xl border border-amber-300 bg-amber-50/70 p-3.5 text-sm">
            <span className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-amber-700"><Heart size={13} /> Mode souvenir</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-600">
              Lecture seule. Suppression le {formatLongDate(couple?.lifecycle.deleteAt ?? null)}.
            </span>
          </Link>
        ) : couple?.premium ? (
          <Link href="/dashboard/premium" onClick={onNavigate} className="mt-6 mb-3 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50/70 p-3 text-sm">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-amber-300"><Crown size={15} /></span>
            <span><span className="block font-semibold text-ink">Premium actif</span><span className="text-xs text-slate-500">Invités illimités</span></span>
          </Link>
        ) : (
          <div className="relative mt-6 mb-3 overflow-hidden rounded-2xl bg-ink p-4 text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="relative">
              <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                <Crown size={13} /> Premium
              </p>
              <p className="mt-1.5 font-display text-[15px] leading-snug">Invités illimités pour votre grand jour</p>
              <button
                onClick={onUpgrade}
                className="mt-3 w-full rounded-lg bg-amber-300 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-amber-200"
              >
                Découvrir l&apos;offre
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-slate-200/80 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-slate-500 transition-colors hover:bg-white/60 hover:text-rose-600"
        >
          <LogOut size={18} strokeWidth={1.6} />
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
  const [couple, setCouple] = useState<Couple | null>(null);
  const [souvenirModal, setSouvenirModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  // Noms et date du couple pour la carte du menu
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from('marriages')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!data) return;
      const lifecycle = spaceLifecycle(data);
      setCouple({ id: data.id, p1: data.partner_1_name || '', p2: data.partner_2_name || '', date: data.wedding_date, premium: isPremium(data), lifecycle });
      // Mode souvenir : le pop-up s'affiche une fois par visite
      if (lifecycle.phase === 'souvenir') {
        let seen = false;
        try { seen = sessionStorage.getItem(`ws-souvenir-${data.id}`) === '1'; sessionStorage.setItem(`ws-souvenir-${data.id}`, '1'); } catch { /* navigation privée */ }
        if (!seen) setSouvenirModal(true);
      }
    });
  }, []);

  const souvenir = couple?.lifecycle.phase === 'souvenir';
  const pageAllowed = !souvenir || isAllowedInSouvenir(pathname);

  // Mode souvenir : les pages fermées renvoient vers « Mes souvenirs »
  useEffect(() => {
    if (souvenir && !isAllowedInSouvenir(pathname)) router.replace('/dashboard/souvenir');
  }, [souvenir, pathname, router]);

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
  const days = daysUntil(couple?.date ?? null);

  return (
    <div className="min-h-screen bg-ivory">
      {/* BARRE LATÉRALE — ORDINATEUR */}
      <aside className="paper hidden lg:flex fixed inset-y-0 left-0 w-[17rem] z-40 flex-col border-r border-slate-200/80 print:hidden">
        <div className="px-7 pt-7 pb-5"><Wordmark /></div>
        <SidebarContent pathname={pathname} couple={couple} onUpgrade={openPricing} onLogout={handleLogout} />
      </aside>

      {/* BARRE DU HAUT — MOBILE & TABLETTE */}
      <header className="lg:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between bg-ivory/85 backdrop-blur-xl border-b border-slate-200/80 print:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={drawerOpen}
          className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-white"
        >
          <Menu size={22} strokeWidth={1.8} />
        </button>
        <Wordmark />
        {days !== null && days >= 0
          ? <span className="rounded-full bg-white px-2.5 py-1 font-display text-sm text-rose-600 ring-1 ring-slate-200">J-{days}</span>
          : <span className="w-9" aria-hidden />}
      </header>

      {/* MENU TIROIR — MOBILE & TABLETTE */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="lg:hidden fixed inset-0 z-[90] bg-ink/40 backdrop-blur-sm print:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu principal"
              className="paper lg:hidden fixed inset-y-0 left-0 z-[95] w-[17rem] max-w-[85vw] flex flex-col shadow-2xl print:hidden"
            >
              <div className="px-6 pt-6 pb-5 flex items-center justify-between">
                <Wordmark onNavigate={() => setDrawerOpen(false)} />
                <button onClick={() => setDrawerOpen(false)} aria-label="Fermer le menu" className="p-2 rounded-xl text-slate-500 hover:bg-white">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent pathname={pathname} couple={couple} onUpgrade={openPricing} onLogout={handleLogout} onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {souvenirModal && couple && (
          <SouvenirModal
            couple={[couple.p1, couple.p2].filter(Boolean).join(' & ')}
            marriageId={couple.id}
            deleteAt={couple.lifecycle.deleteAt}
            daysBeforeDeletion={couple.lifecycle.daysBeforeDeletion}
            onClose={() => setSouvenirModal(false)}
            onDelete={() => { setSouvenirModal(false); setDeleteModal(true); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteModal && <DeleteAccountModal onClose={() => setDeleteModal(false)} />}
      </AnimatePresence>

      <div className="lg:pl-[17rem] min-w-0 print:pl-0">
        {/* Après le mariage : l'espace reste complet jusqu'à J+1 mois */}
        {couple && !souvenir && couple.lifecycle.weddingPassed && couple.lifecycle.activeUntil && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900 print:hidden">
            Félicitations ! Votre espace reste complet jusqu&apos;au <strong>{formatLongDate(couple.lifecycle.activeUntil)}</strong>, puis passera en mode souvenir (lecture seule).{' '}
            <Link href="/dashboard/souvenir" className="font-semibold underline underline-offset-2">Télécharger mes données</Link>
          </div>
        )}
        {pageAllowed ? children : <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>}
      </div>
    </div>
  );
}
