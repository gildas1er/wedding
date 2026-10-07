// Police des prénoms des mariés sur l'invitation (choisie dans le studio).
// Les fichiers ne sont téléchargés par le navigateur que pour la police réellement affichée.
import type { CSSProperties } from 'react';
import { Alex_Brush, Great_Vibes, Monsieur_La_Doulaise, Parisienne, Pinyon_Script } from 'next/font/google';

const greatVibes = Great_Vibes({ weight: '400', subsets: ['latin', 'latin-ext'], display: 'swap', preload: false });
const alexBrush = Alex_Brush({ weight: '400', subsets: ['latin', 'latin-ext'], display: 'swap', preload: false });
const monsieur = Monsieur_La_Doulaise({ weight: '400', subsets: ['latin', 'latin-ext'], display: 'swap', preload: false });
const parisienne = Parisienne({ weight: '400', subsets: ['latin', 'latin-ext'], display: 'swap', preload: false });
const pinyon = Pinyon_Script({ weight: '400', subsets: ['latin'], display: 'swap', preload: false });

// scale : les écritures manuscrites paraissent plus petites, on les agrandit pour garder la même présence
export const NAME_FONTS = [
  { id: 'classique', label: 'Classique', family: null, scale: 1 },
  { id: 'great_vibes', label: 'Great Vibes', family: greatVibes.style.fontFamily, scale: 1.25 },
  { id: 'alex_brush', label: 'Alex Brush', family: alexBrush.style.fontFamily, scale: 1.3 },
  { id: 'monsieur_la_doulaise', label: 'Monsieur La Doulaise', family: monsieur.style.fontFamily, scale: 1.4 },
  { id: 'parisienne', label: 'Parisienne', family: parisienne.style.fontFamily, scale: 1.2 },
  { id: 'pinyon_script', label: 'Pinyon Script', family: pinyon.style.fontFamily, scale: 1.2 },
] as const;

export type NameFontId = (typeof NAME_FONTS)[number]['id'];
export const DEFAULT_NAME_FONT: NameFontId = 'classique';

export const resolveNameFont = (value: unknown) => NAME_FONTS.find((f) => f.id === value) ?? NAME_FONTS[0];

// Style à poser sur l'élément qui affiche les prénoms (taille relative à celle du parent)
export function nameFontStyle(value: unknown): CSSProperties {
  const f = resolveNameFont(value);
  if (!f.family) return {};
  return { fontFamily: f.family, fontSize: `${f.scale}em`, fontStyle: 'normal', fontWeight: 400, lineHeight: 1.15 };
}
