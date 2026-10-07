"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ZoomIn, ZoomOut, Maximize, Crown, Music2, LayoutGrid } from 'lucide-react';
import { capacityOf, defaultPosition, type SeatTable } from '../../lib/seating';

type Pos = { x: number; y: number };
type Props = {
  marriageId: string;
  tables: SeatTable[];
  occupancy: Map<string, number>;
  selectionSeats: number;
  dragSeats: number;
  onTableTap: (tableId: string) => void;          // placer la sélection ou ouvrir la table
  onSavePositions: (p: { id: string; x: number; y: number }[]) => void;
};

export const FLOOR_SIZE = { w: 320, h: 190 };
export const floorStorageKey = (marriageId: string) => `seating:floor:${marriageId}`;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.8;

export function tableSize(t: SeatTable) {
  const cap = capacityOf(t);
  if (t.shape === 'rectangle') return { w: Math.min(320, 150 + cap * 9), h: 96 };
  const d = Math.min(230, 118 + cap * 5);
  return { w: d, h: d };
}

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export default function FloorPlan({ marriageId, tables, occupancy, selectionSeats, dragSeats, onTableTap, onSavePositions }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  // Vue : zoom + position de la caméra, dans un seul état pour rester cohérents
  const [view, setView] = useState({ z: 0.8, x: 0, y: 0 });
  const zoom = view.z;
  const camera = { x: view.x, y: view.y };
  const setCamera = (f: (c: Pos) => Pos) => setView((v) => ({ ...v, ...f({ x: v.x, y: v.y }) }));
  const [local, setLocal] = useState<Record<string, Pos>>({}); // positions pendant un déplacement
  const floorKey = floorStorageKey(marriageId);
  const [floor, setFloor] = useState<Pos>(() => {
    try { const v = JSON.parse(localStorage.getItem(floorKey) || 'null'); if (v && typeof v.x === 'number') return v; } catch {}
    return { x: 460, y: 200 };
  });

  const posOf = useCallback((t: SeatTable, i: number): Pos =>
    local[t.id] ?? (t.position_x != null && t.position_y != null ? { x: t.position_x, y: t.position_y } : defaultPosition(i)), [local]);

  /* ── Recadrage ── */
  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const boxes = [
      { x: floor.x, y: floor.y, w: FLOOR_SIZE.w, h: FLOOR_SIZE.h },
      ...tables.map((t, i) => ({ ...posOf(t, i), ...tableSize(t) })),
    ];
    const minX = Math.min(...boxes.map((b) => b.x)) - 60;
    const minY = Math.min(...boxes.map((b) => b.y)) - 60;
    const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + 60;
    const maxY = Math.max(...boxes.map((b) => b.y + b.h)) + 60;
    const { width, height } = vp.getBoundingClientRect();
    const z = clampZoom(Math.min(width / (maxX - minX), (height - 64) / (maxY - minY), 1.1));
    setView({ z, x: (width - (maxX - minX) * z) / 2 - minX * z, y: 64 + (height - 64 - (maxY - minY) * z) / 2 - minY * z });
  }, [tables, floor, posOf]);

  const fittedOnce = useRef(false);
  useLayoutEffect(() => {
    if (fittedOnce.current) return;
    fittedOnce.current = true;
    fit();
  }, [fit]);

  const zoomAt = (factor: number, cx?: number, cy?: number) => {
    const vp = viewportRef.current?.getBoundingClientRect();
    const px = cx ?? (vp ? vp.width / 2 : 0);
    const py = cy ?? (vp ? vp.height / 2 : 0);
    setView((v) => {
      const nz = clampZoom(v.z * factor);
      return { z: nz, x: px - ((px - v.x) / v.z) * nz, y: py - ((py - v.y) / v.z) * nz };
    });
  };

  /* ── Déplacement du plan (glisser, deux doigts, molette) ── */
  const pointers = useRef(new Map<number, Pos>());
  const pinch = useRef<{ dist: number } | null>(null);
  const panLast = useRef<Pos | null>(null);

  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.world) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    panLast.current = { x: e.clientX, y: e.clientY };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  };
  const onBgPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = viewportRef.current!.getBoundingClientRect();
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(dist / pinch.current.dist, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      pinch.current.dist = dist;
      return;
    }
    if (panLast.current) {
      const dx = e.clientX - panLast.current.x;
      const dy = e.clientY - panLast.current.y;
      panLast.current = { x: e.clientX, y: e.clientY };
      setCamera((c) => ({ x: c.x + dx, y: c.y + dy }));
    }
  };
  const onBgPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    panLast.current = pointers.current.size === 1 ? [...pointers.current.values()][0] : null;
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY / 300), e.clientX - rect.left, e.clientY - rect.top);
      else setCamera((c) => ({ x: c.x - e.deltaX, y: c.y - e.deltaY }));
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  });

  /* ── Déplacement d'une table ou de la piste ── */
  const itemDrag = useRef<{ id: string; start: Pos; origin: Pos; moved: boolean } | null>(null);

  const startItemDrag = (id: string, origin: Pos) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    itemDrag.current = { id, start: { x: e.clientX, y: e.clientY }, origin, moved: false };
  };
  const moveItem = (e: React.PointerEvent) => {
    const d = itemDrag.current;
    if (!d) return;
    const dx = (e.clientX - d.start.x) / zoom;
    const dy = (e.clientY - d.start.y) / zoom;
    if (!d.moved && Math.hypot(dx * zoom, dy * zoom) < 5) return;
    d.moved = true;
    const next = { x: d.origin.x + dx, y: d.origin.y + dy };
    if (d.id === '__floor') setFloor(next);
    else setLocal((l) => ({ ...l, [d.id]: next }));
  };
  const endItem = (e: React.PointerEvent) => {
    const d = itemDrag.current;
    itemDrag.current = null;
    if (!d) return;
    if (!d.moved) {
      if (d.id !== '__floor') onTableTap(d.id);
      return;
    }
    if (d.id === '__floor') {
      try { localStorage.setItem(floorKey, JSON.stringify(floor)); } catch {}
      return;
    }
    const p = local[d.id];
    if (p) onSavePositions([{ id: d.id, x: p.x, y: p.y }]);
    e.stopPropagation();
  };

  // Les positions locales sont abandonnées dès que la table enregistrée les reprend
  useEffect(() => {
    setLocal((l) => {
      const next = { ...l };
      let changed = false;
      for (const t of tables) {
        const p = next[t.id];
        if (p && t.position_x === Math.round(p.x) && t.position_y === Math.round(p.y) && itemDrag.current?.id !== t.id) { delete next[t.id]; changed = true; }
      }
      return changed ? next : l;
    });
  }, [tables]);

  /* ── Dispositions toutes faites ── */
  const applyPreset = (preset: 'rows' | 'u' | 'circle') => {
    const cx = floor.x + FLOOR_SIZE.w / 2;
    const cy = floor.y + FLOOR_SIZE.h / 2;
    const n = tables.length;
    const gap = 70;
    const size = (t: SeatTable) => tableSize(t);
    const maxW = Math.max(...tables.map((t) => size(t).w), 160);
    const maxH = Math.max(...tables.map((t) => size(t).h), 160);
    const out: { id: string; x: number; y: number }[] = [];

    if (preset === 'circle') {
      const radius = Math.max(FLOOR_SIZE.w / 2 + maxW, (n * (maxW + gap)) / (2 * Math.PI));
      tables.forEach((t, i) => {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        out.push({ id: t.id, x: cx + radius * Math.cos(a) - size(t).w / 2, y: cy + radius * Math.sin(a) - size(t).h / 2 });
      });
    } else if (preset === 'u') {
      const top = Math.max(1, Math.ceil(n / 3));
      const sides = n - top;
      const left = Math.ceil(sides / 2);
      const width = top * (maxW + gap);
      const x0 = cx - width / 2;
      const yTop = floor.y - maxH - gap;
      tables.forEach((t, i) => {
        if (i < top) out.push({ id: t.id, x: x0 + i * (maxW + gap), y: yTop });
        else if (i < top + left) out.push({ id: t.id, x: x0 - maxW / 2, y: yTop + (i - top + 1) * (maxH + gap) });
        else out.push({ id: t.id, x: x0 + width - maxW / 2, y: yTop + (i - top - left + 1) * (maxH + gap) });
      });
    } else {
      const perRow = Math.max(2, Math.ceil(Math.sqrt(n * 1.6)));
      const width = perRow * (maxW + gap) - gap;
      tables.forEach((t, i) => {
        out.push({ id: t.id, x: cx - width / 2 + (i % perRow) * (maxW + gap), y: floor.y + FLOOR_SIZE.h + gap + Math.floor(i / perRow) * (maxH + gap) });
      });
    }
    setLocal(Object.fromEntries(out.map((p) => [p.id, { x: p.x, y: p.y }])));
    onSavePositions(out);
    requestAnimationFrame(() => fit());
  };

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-ivory-deep">
      {/* Barre d'outils */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/95 p-1 shadow-md backdrop-blur">
          <LayoutGrid className="ml-2 h-4 w-4 text-amber-600" aria-hidden />
          {([['u', 'En U'], ['circle', 'En cercle'], ['rows', 'En rangées']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => applyPreset(id)} disabled={!tables.length}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-ivory hover:text-ink disabled:opacity-40">{label}</button>
          ))}
        </div>
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/95 p-1 shadow-md backdrop-blur">
          <button type="button" onClick={() => zoomAt(1 / 1.2)} aria-label="Dézoomer" className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-ivory"><ZoomOut className="h-4 w-4" /></button>
          <span className="w-12 text-center text-xs font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => zoomAt(1.2)} aria-label="Zoomer" className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-ivory"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" onClick={fit} aria-label="Afficher tout le plan" className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-ivory"><Maximize className="h-4 w-4" /></button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onBgPointerDown}
        onPointerMove={onBgPointerMove}
        onPointerUp={onBgPointerUp}
        onPointerCancel={onBgPointerUp}
        style={{ backgroundImage: 'radial-gradient(rgb(179 140 74 / 0.35) 1px, transparent 1px)', backgroundSize: `${40 * zoom}px ${40 * zoom}px`, backgroundPosition: `${camera.x}px ${camera.y}px` }}
      >
        <div data-world="1" className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${zoom})` }}>
          {/* Piste de danse */}
          <div
            onPointerDown={startItemDrag('__floor', floor)}
            onPointerMove={moveItem}
            onPointerUp={endItem}
            className="absolute flex cursor-move touch-none select-none flex-col items-center justify-center rounded-3xl border-2 border-dashed border-amber-400 bg-amber-100/70"
            style={{ left: floor.x, top: floor.y, width: FLOOR_SIZE.w, height: FLOOR_SIZE.h }}
          >
            <Music2 className="h-7 w-7 text-amber-600" strokeWidth={1.5} />
            <p className="mt-1 font-display text-lg text-amber-900">Piste de danse</p>
          </div>

          {tables.map((t, i) => (
            <FloorTable
              key={t.id}
              table={t}
              pos={posOf(t, i)}
              occupied={occupancy.get(t.id) ?? 0}
              highlightSeats={dragSeats || selectionSeats}
              onPointerDown={startItemDrag(t.id, posOf(t, i))}
              onPointerMove={moveItem}
              onPointerUp={endItem}
            />
          ))}
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-xs text-slate-500 shadow-sm sm:block">
        {selectionSeats ? 'Touchez une table pour y placer la sélection' : 'Glissez les tables pour les disposer · touchez-en une pour la voir'}
      </p>
    </div>
  );
}

function FloorTable({ table, pos, occupied, highlightSeats, onPointerDown, onPointerMove, onPointerUp }: {
  table: SeatTable; pos: Pos; occupied: number; highlightSeats: number;
  onPointerDown: (e: React.PointerEvent) => void; onPointerMove: (e: React.PointerEvent) => void; onPointerUp: (e: React.PointerEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `table:${table.id}`, data: { tableId: table.id } });
  const { w, h } = tableSize(table);
  const cap = capacityOf(table);
  const free = cap - occupied;
  const pct = Math.min(1, occupied / cap);
  const round = table.shape !== 'rectangle';
  const fits = highlightSeats > 0 && highlightSeats <= free;
  const r = Math.min(w, h) / 2 - 6;
  const circ = 2 * Math.PI * r;

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      aria-label={`${table.name}, ${occupied} sur ${cap} places`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`absolute flex cursor-pointer touch-none select-none flex-col items-center justify-center border-2 bg-white text-center shadow-lg transition-[box-shadow,border-color] ${round ? 'rounded-full' : 'rounded-2xl'} ${
        isOver ? (fits ? 'border-amber-400 ring-4 ring-amber-200' : 'border-red-300 ring-4 ring-red-100')
          : highlightSeats && fits ? 'border-amber-300' : table.is_vip ? 'border-amber-400' : 'border-slate-200'
      }`}
      style={{ left: pos.x, top: pos.y, width: w, height: h }}
    >
      {round && (
        <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox={`0 0 ${w} ${h}`} aria-hidden>
          <circle cx={w / 2} cy={h / 2} r={r} fill="none" stroke="rgb(231 225 216)" strokeWidth="4" />
          <circle cx={w / 2} cy={h / 2} r={r} fill="none" stroke={pct >= 1 ? '#52855e' : '#cba965'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} />
        </svg>
      )}
      {table.is_vip && <Crown className="mb-0.5 h-4 w-4 text-amber-500" />}
      <p className="max-w-[80%] truncate font-display text-[17px] leading-tight text-ink">{table.name}</p>
      <p className={`mt-0.5 text-xs font-semibold ${free <= 0 ? 'text-emerald-600' : 'text-slate-500'}`}>{occupied}/{cap}</p>
      {!round && (
        <div className="mt-1.5 h-1 w-3/5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${pct >= 1 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct * 100}%` }} />
        </div>
      )}
    </div>
  );
}
