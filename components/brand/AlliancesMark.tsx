// Symbole de la marque : deux alliances entrelacées (bordeaux et or) et un petit diamant.
// Couleurs fixes de la marque : elles ne suivent pas la palette choisie par le couple.
import React from 'react';

export const BRAND = { bordeaux: '#9e3a55', gold: '#b38c4a', goldLight: '#dcc28a', ivory: '#faf7f2' };

type Props = {
  /** Largeur en px (la hauteur suit : rapport 150 × 110) */
  size?: number;
  /** color : sur fond clair · light : sur fond bordeaux ou foncé */
  tone?: 'color' | 'light';
  /** Le diamant disparaît aux très petites tailles */
  gem?: boolean;
  className?: string;
};

export default function AlliancesMark({ size = 32, tone = 'color', gem = true, className }: Props) {
  const first = tone === 'light' ? BRAND.ivory : BRAND.bordeaux;
  const second = tone === 'light' ? BRAND.goldLight : BRAND.gold;
  // Trait plus épais quand le symbole est petit, pour rester lisible
  const stroke = size < 28 ? 10 : size < 60 ? 8.5 : 7;
  return (
    <svg width={size} height={(size * 110) / 150} viewBox="0 0 150 110" className={className} aria-hidden="true" focusable="false">
      <circle cx="58" cy="62" r="34" fill="none" stroke={first} strokeWidth={stroke} />
      <circle cx="92" cy="62" r="34" fill="none" stroke={second} strokeWidth={stroke} />
      {/* Entrelacs : en haut, l'anneau bordeaux repasse devant l'anneau doré */}
      <path d="M 71.8 30.9 A 34 34 0 0 1 89.1 48.2" fill="none" stroke={first} strokeWidth={stroke} />
      {gem && <path d="M92 6 L99.5 16.5 L92 25 L84.5 16.5 Z" fill={BRAND.goldLight} stroke={second} strokeWidth="2" strokeLinejoin="round" />}
    </svg>
  );
}
