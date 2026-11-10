// Couleurs et polices communes aux cartes de remerciements (écran et image)
import { DEFAULT_PALETTE, isHexColor } from '../../lib/palettes';
import { NAME_FONTS, resolveNameFont } from '../../lib/name-fonts';
import type { ThanksCardData } from '../../lib/thanks';

export const PAPER = '#fbf6ee';
export const CREAM = '#f4ead9';
export const INK = '#3a2e26';
export const SOFT = '#9b8b78';
export const NIGHT = '#14110f';
export const GOLD = '#d9b16b';
export const GOLD_LIGHT = '#f0cf8f';
export const THANKS_SCRIPT = NAME_FONTS.find((f) => f.id === 'pinyon_script')!.family!;

export function thanksColors(card: Pick<ThanksCardData, 'primary'>) {
  return { wine: isHexColor(card.primary) ? card.primary : DEFAULT_PALETTE.primary };
}

// Prénoms des mariés dans leur police manuscrite (studio), sinon Pinyon Script
export const signatureFont = (namesFont: string | null) => resolveNameFont(namesFont).family ?? THANKS_SCRIPT;

export const coupleOf = (card: Pick<ThanksCardData, 'partner1' | 'partner2'>) => [card.partner1, card.partner2].filter(Boolean).join(' & ');
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
