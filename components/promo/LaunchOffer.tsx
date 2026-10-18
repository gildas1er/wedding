"use client";

// Affichage de l'offre de lancement (-30 % sur la première formule jusqu'au 20 décembre 2026).
// Les pages publiques sont préparées au déploiement : l'offre est donc décidée dans le navigateur,
// à l'heure de la visite, pour disparaître toute seule après la date.
import React, { useEffect, useState } from 'react';
import { BadgePercent } from 'lucide-react';
import { LAUNCH_OFFER, launchOfferActive } from '../../lib/launch-offer';

export function useLaunchOffer() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setActive(launchOfferActive()));
    // Page restée ouverte au moment de la fin de l'offre
    const t = window.setInterval(() => setActive(launchOfferActive()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return active;
}

// Bandeau fin, en haut de page
export function LaunchRibbon({ className = '' }: { className?: string }) {
  const active = useLaunchOffer();
  if (!active) return null;
  return (
    <p className={`bg-rose-500 px-4 py-2 text-center text-[12px] font-semibold leading-snug text-white sm:text-[13px] ${className}`}>
      Offre de lancement : <span className="text-amber-300">-{LAUNCH_OFFER.percent} %</span><span className="hidden sm:inline"> sur votre formule</span> jusqu&apos;au {LAUNCH_OFFER.shortEnd}
    </p>
  );
}

// Encart (accueil, inscription)
export function LaunchCard({ variant = 'light', className = '' }: { variant?: 'light' | 'dark'; className?: string }) {
  const active = useLaunchOffer();
  if (!active) return null;
  if (variant === 'dark') {
    return (
      <div className={`flex items-start gap-3 rounded-2xl bg-ink p-4 text-sm text-white ${className}`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-300 text-ink"><BadgePercent className="h-4 w-4" /></span>
        <p><strong className="text-amber-300">Offre de lancement : -{LAUNCH_OFFER.percent} %</strong> sur votre première formule jusqu&apos;au {LAUNCH_OFFER.endLabel}. Rien à saisir : la réduction s&apos;applique toute seule.</p>
      </div>
    );
  }
  return (
    <div className={`flex max-w-md items-center gap-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4 ${className}`}>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink font-display text-xl text-amber-300">-{LAUNCH_OFFER.percent}%</span>
      <p className="text-sm text-slate-600">
        <strong className="block text-ink">Offre de lancement</strong>
        Commencez gratuitement. Votre première formule à -{LAUNCH_OFFER.percent} % jusqu&apos;au {LAUNCH_OFFER.endLabel}, appliqué automatiquement.
      </p>
    </div>
  );
}
