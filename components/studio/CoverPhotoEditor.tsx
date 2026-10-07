"use client";

import React, { useRef, useState } from 'react';
import { Upload, Loader2, RefreshCw, Crosshair, Trash2, Move, ImageOff } from 'lucide-react';
import { useConfirm } from '../ui/ConfirmDialog';

export const DEFAULT_COVER_POSITION = '50% 50%';

function parsePosition(position: string | null | undefined): [number, number] {
  const m = position?.match(/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/);
  return m ? [Number(m[1]), Number(m[2])] : [50, 50];
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

type Props = {
  url: string;
  position: string;
  busyLabel: string | null; // "Optimisation…", "Envoi…" ou null
  onPickFile: (file: File) => void;
  onChangePosition: (position: string) => void;
  onRemove: () => void;
};

export default function CoverPhotoEditor({ url, position, busyLabel, onPickFile, onChangePosition, onRemove }: Props) {
  const { confirm } = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [px, py] = parsePosition(position);

  const openPicker = () => inputRef.current?.click();

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onPickFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Faire glisser la photo déplace la zone visible (sens naturel : on "tire" l'image)
  const onPointerDown = (e: React.PointerEvent) => {
    if (busyLabel) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px, py };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const start = drag.current;
    const frame = frameRef.current;
    if (!start || !frame) return;
    const { width, height } = frame.getBoundingClientRect();
    const nx = clamp(start.px - ((e.clientX - start.x) / width) * 150);
    const ny = clamp(start.py - ((e.clientY - start.y) / height) * 150);
    onChangePosition(`${Math.round(nx)}% ${Math.round(ny)}%`);
  };
  const onPointerUp = () => { drag.current = null; };

  // Réglage au clavier (flèches) pour l'accessibilité
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    onChangePosition(`${clamp(px + move[0])}% ${clamp(py + move[1])}%`);
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  const busyOverlay = busyLabel && (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-sm">
      <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
      <span className="text-sm font-medium text-slate-600">{busyLabel}</span>
    </div>
  );

  if (!url) {
    return (
      <div>
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          disabled={Boolean(busyLabel)}
          className={`relative flex aspect-[6/5] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
            dragOver ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-ivory hover:border-amber-300'
          }`}
        >
          {busyOverlay}
          <Upload className="h-6 w-6 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Glissez une photo ici ou cliquez</span>
          <span className="text-xs text-slate-400">JPG, PNG ou WebP · 15 Mo maximum</span>
        </button>
        <p className="mt-2 text-xs text-slate-500">Sans photo, une image de réception par défaut est affichée.</p>
        {fileInput}
      </div>
    );
  }

  return (
    <div>
      <div
        ref={frameRef}
        role="slider"
        tabIndex={0}
        aria-label="Cadrage de la photo : faites glisser ou utilisez les flèches"
        aria-valuetext={`Horizontal ${Math.round(px)} %, vertical ${Math.round(py)} %`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`group relative aspect-[6/5] w-full cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-slate-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-amber-400 active:cursor-grabbing ${dragOver ? 'ring-2 ring-amber-400' : ''}`}
      >
        {busyOverlay}
        <img src={url} alt="Photo de couverture" draggable={false} className="pointer-events-none h-full w-full object-cover" style={{ objectPosition: position || DEFAULT_COVER_POSITION }} />
        {/* Dégradé identique à la page RSVP, pour juger du rendu final */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/10 to-black/30" />
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-white opacity-90 backdrop-blur transition-opacity group-active:opacity-0">
          <Move className="h-3.5 w-3.5" /> Glissez pour cadrer
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={openPicker} disabled={Boolean(busyLabel)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-ink disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> Changer
        </button>
        <button type="button" onClick={() => onChangePosition(DEFAULT_COVER_POSITION)} disabled={position === DEFAULT_COVER_POSITION} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-ink disabled:opacity-40">
          <Crosshair className="h-4 w-4" /> Recentrer
        </button>
        <button type="button" onClick={async () => { if (await confirm({ title: 'Retirer la photo de couverture ?', tone: 'neutral', icon: ImageOff, confirmLabel: 'Retirer', message: 'Une image de réception par défaut la remplacera. Le changement sera visible après publication.' })) onRemove(); }} disabled={Boolean(busyLabel)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
          <Trash2 className="h-4 w-4" /> Retirer
        </button>
      </div>
      {fileInput}
    </div>
  );
}
