"use client";

// Plan de salle imprimable (A4 paysage) : disposition réelle des tables et de la piste,
// puis un index alphabétique « Qui est à quelle table ? » pour l'accueil des invités.
import React from 'react';
import { capacityOf, defaultPosition, normalize, type SeatGuest, type SeatTable } from '../../lib/seating';
import { FLOOR_SIZE, floorStorageKey, tableSize } from './FloorPlan';

type Marriage = { id?: string; partner_1_name?: string | null; partner_2_name?: string | null; wedding_date?: string | null } | null;

function readFloor(marriageId?: string) {
  if (!marriageId || typeof window === 'undefined') return { x: 460, y: 200 };
  try {
    const v = JSON.parse(localStorage.getItem(floorStorageKey(marriageId)) || 'null');
    if (v && typeof v.x === 'number' && typeof v.y === 'number') return v as { x: number; y: number };
  } catch { /* navigation privée */ }
  return { x: 460, y: 200 };
}

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export default function FloorPlanPrint({ marriage, tables, guests, occupancy }: {
  marriage: Marriage;
  tables: SeatTable[];
  guests: SeatGuest[];
  occupancy: Map<string, number>;
}) {
  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  const floor = readFloor(marriage?.id);

  const items = tables.map((t, i) => {
    const pos = t.position_x != null && t.position_y != null ? { x: t.position_x, y: t.position_y } : defaultPosition(i);
    return { t, ...pos, ...tableSize(t) };
  });
  const boxes = [{ x: floor.x, y: floor.y, w: FLOOR_SIZE.w, h: FLOOR_SIZE.h }, ...items];
  const pad = 50;
  const minX = Math.min(...boxes.map((b) => b.x)) - pad;
  const minY = Math.min(...boxes.map((b) => b.y)) - pad;
  const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + pad;
  const maxY = Math.max(...boxes.map((b) => b.y + b.h)) + pad;

  const tableName = new Map(tables.map((t) => [t.id, t.name]));
  const seated = guests
    .filter((g) => g.table_id && tableName.has(g.table_id))
    .sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
  const totalSeats = [...occupancy.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="hidden bg-white text-black print:block">
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>

      {/* Page 1 : le plan */}
      <section className="flex h-[188mm] flex-col" style={{ breakAfter: 'page' }}>
        <header className="mb-3 flex items-end justify-between border-b-2 border-black pb-2">
          <div>
            <h1 className="font-sans text-xl font-bold">Plan de salle{couple ? ` — ${couple}` : ''}</h1>
            {marriage?.wedding_date && <p className="text-xs text-slate-600 first-letter:uppercase">{formatDate(marriage.wedding_date)}</p>}
          </div>
          <p className="text-right text-xs font-semibold">{tables.length} table{tables.length > 1 ? 's' : ''} · {totalSeats} couverts placés</p>
        </header>

        <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} preserveAspectRatio="xMidYMid meet" className="min-h-0 w-full flex-1" role="img" aria-label="Plan de salle">
          {/* Piste de danse */}
          <rect x={floor.x} y={floor.y} width={FLOOR_SIZE.w} height={FLOOR_SIZE.h} rx="24" fill="#fbf1dc" stroke="#b38c4a" strokeWidth="3" strokeDasharray="12 8" />
          <text x={floor.x + FLOOR_SIZE.w / 2} y={floor.y + FLOOR_SIZE.h / 2 + 8} textAnchor="middle" fontSize="24" fontFamily="Georgia, serif" fill="#7b5c2c">Piste de danse</text>

          {items.map(({ t, x, y, w, h }) => {
            const cap = capacityOf(t);
            const occ = occupancy.get(t.id) ?? 0;
            const round = t.shape !== 'rectangle';
            const cx = x + w / 2;
            const cy = y + h / 2;
            const nameSize = Math.max(16, Math.min(26, (w - 30) / Math.max(4, t.name.length) * 1.7));
            return (
              <g key={t.id}>
                {round
                  ? <circle cx={cx} cy={cy} r={w / 2 - 2} fill="#fff" stroke={t.is_vip ? '#b38c4a' : '#333'} strokeWidth={t.is_vip ? 5 : 3} />
                  : <rect x={x} y={y} width={w} height={h} rx="16" fill="#fff" stroke={t.is_vip ? '#b38c4a' : '#333'} strokeWidth={t.is_vip ? 5 : 3} />}
                {t.is_vip && <text x={cx} y={cy - nameSize - 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="#7b5c2c" letterSpacing="2">VIP</text>}
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={nameSize} fontWeight="700" fontFamily="Arial, sans-serif" fill="#111">{t.name}</text>
                <text x={cx} y={cy + nameSize + 6} textAnchor="middle" fontSize="15" fill="#555">{occ} / {cap} couverts</text>
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-center text-[9pt] text-slate-500">Disposition enregistrée dans WeddingStudio · les tables entourées d&apos;or sont les tables VIP.</p>
      </section>

      {/* Page 2 : index des invités */}
      {seated.length > 0 && (
        <section>
          <header className="mb-3 border-b-2 border-black pb-2">
            <h2 className="font-sans text-xl font-bold">Qui est à quelle table ?</h2>
            <p className="text-xs text-slate-600">Liste alphabétique des invités placés, à afficher à l&apos;entrée de la salle.</p>
          </header>
          <ol className="columns-3 gap-6 text-[10pt]">
            {seated.map((g) => (
              <li key={g.id} className="flex break-inside-avoid justify-between gap-3 border-b border-dotted border-slate-300 py-1">
                <span className="font-semibold">{g.name}{(g.guests_count ?? 1) > 1 ? ` (+${(g.guests_count ?? 1) - 1})` : ''}</span>
                <span className="shrink-0 text-slate-700">{tableName.get(g.table_id!)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
