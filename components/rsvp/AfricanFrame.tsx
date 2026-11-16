// Carte crème au liseré pointillé, posée sur le motif du modèle africain (wax, kita, bogolan, mur en banco)
import React from 'react';
import type { AfricanTheme } from '../../lib/african-invitation';

export function AfricanWall({ theme, className = '', children }: { theme: AfricanTheme; className?: string; children: React.ReactNode }) {
  return <div className={`relative rounded-[1.75rem] p-3 shadow-lg ${className}`} style={theme.wall}>{children}</div>;
}

export function AfricanCard({ theme, pad = 'p-6 sm:p-7', children }: { theme: AfricanTheme; pad?: string; children: React.ReactNode }) {
  return (
    <div className={`relative rounded-[1.4rem] ${pad}`} style={{ background: theme.card, color: theme.ink }}>
      <span aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[1.1rem] border-[1.5px] border-dashed opacity-70" style={{ borderColor: theme.dash }} />
      <div className="relative">{children}</div>
    </div>
  );
}

// Petite frise sous un titre : zigzag et trois points
export function AfricanFrieze({ color }: { color: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 12" fill="none" stroke={color} strokeWidth="2" className="mx-auto mt-2 h-3 w-28">
      <path d="M0 10 L8 2 L16 10 L24 2 L32 10 L40 2 M80 10 L88 2 L96 10 L104 2 L112 10 L120 2" />
      <g fill={color} stroke="none"><circle cx="52" cy="6" r="2.4" /><circle cx="60" cy="6" r="2.4" /><circle cx="68" cy="6" r="2.4" /></g>
    </svg>
  );
}
