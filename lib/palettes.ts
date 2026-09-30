// Palettes proposées aux couples, et construction du thème de la page RSVP à partir de deux couleurs.
import type { CSSProperties } from 'react';

export type Palette = { id: string; name: string; mood: string; primary: string; accent: string };

export const PALETTES: Palette[] = [
  { id: 'bordeaux', name: 'Bordeaux & Or', mood: 'Classique, chaleureux', primary: '#9e3a55', accent: '#b38c4a' },
  { id: 'emeraude', name: 'Émeraude & Or', mood: 'Élégant, profond', primary: '#1f5f4a', accent: '#c2a15a' },
  { id: 'nuit', name: 'Bleu nuit & Argent', mood: 'Chic, moderne', primary: '#1e3a5f', accent: '#8e9aab' },
  { id: 'terracotta', name: 'Terracotta & Sable', mood: 'Solaire, bohème', primary: '#b5563a', accent: '#c9a26b' },
  { id: 'poudre', name: 'Rose poudré & Champagne', mood: 'Doux, romantique', primary: '#b85c78', accent: '#cfae7a' },
  { id: 'lavande', name: 'Prune & Or pâle', mood: 'Raffiné, poétique', primary: '#6b4f86', accent: '#c7a86a' },
  { id: 'wax', name: 'Orange brûlé & Vert', mood: 'Festif, inspiré du pagne', primary: '#c1440e', accent: '#2f7d4f' },
  { id: 'noir', name: 'Noir & Or', mood: 'Glamour, soirée', primary: '#1f1b18', accent: '#b8921f' },
];

export const DEFAULT_PALETTE = PALETTES[0];

const HEX_RE = /^#[0-9a-f]{6}$/i;
export const isHexColor = (v: string | null | undefined): v is string => Boolean(v && HEX_RE.test(v));

export function findPalette(primary?: string | null, accent?: string | null) {
  return PALETTES.find(
    (p) => p.primary.toLowerCase() === primary?.toLowerCase() && (!accent || p.accent.toLowerCase() === accent.toLowerCase())
  );
}

// Accent à utiliser : celui enregistré, sinon celui de la palette correspondante, sinon l'or par défaut
export function resolveAccent(primary?: string | null, accent?: string | null) {
  if (isHexColor(accent)) return accent;
  return findPalette(primary)?.accent ?? DEFAULT_PALETTE.accent;
}

/* ── Contraste ── */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Texte lisible sur un fond de cette couleur (boutons)
export function readableTextOn(bg: string) {
  return contrastRatio(bg, '#ffffff') >= 3 ? '#ffffff' : '#1f1b18';
}

/* ── Thème ── */
// Nuancier complet dérivé d'une couleur, via color-mix (50 = très clair, 950 = très foncé)
const STEPS: [number, string][] = [
  [50, 'white 93%'], [100, 'white 86%'], [200, 'white 72%'], [300, 'white 55%'], [400, 'white 28%'],
  [500, ''], [600, 'black 15%'], [700, 'black 30%'], [800, 'black 45%'], [900, 'black 58%'], [950, 'black 72%'],
];

function scale(name: string, color: string): Record<string, string> {
  return Object.fromEntries(
    STEPS.map(([step, mix]) => [`--color-${name}-${step}`, mix ? `color-mix(in oklab, ${color}, ${mix})` : color])
  );
}

// Variables CSS à poser sur la racine de la page RSVP : les classes "rose-*" (marque) et
// "amber-*" (accent) de toute la page adoptent alors les couleurs du couple.
export function rsvpThemeStyle(primary?: string | null, accent?: string | null): CSSProperties {
  const p = isHexColor(primary) ? primary : DEFAULT_PALETTE.primary;
  const a = resolveAccent(p, accent);
  return {
    ...scale('rose', p),
    ...scale('amber', a),
    '--color-ivory': `color-mix(in oklab, ${p}, #fdfbf8 96%)`,
    '--wed-primary': p,
    '--wed-accent': a,
    '--wed-on-primary': readableTextOn(p),
  } as CSSProperties;
}
