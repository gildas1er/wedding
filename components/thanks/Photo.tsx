"use client";

// Photo d'une carte de remerciements, ou dégradé chaud avec un cœur quand il n'y en a pas
import React from 'react';
import { THANKS_SCRIPT } from './style';

export default function Photo({ src, label, className = '', style }: { src: string | null; label: string; className?: string; style?: React.CSSProperties }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={label} className={`h-full w-full object-cover ${className}`} style={style} />;
  }
  return (
    <div aria-hidden className={`grid h-full w-full place-items-center ${className}`} style={{ background: 'linear-gradient(160deg, #e6cfb0, #b88a66 60%, #6b4a38)', ...style }}>
      <span style={{ fontFamily: THANKS_SCRIPT, fontSize: '3.2rem', color: 'rgba(255,255,255,.85)' }}>♥</span>
    </div>
  );
}
