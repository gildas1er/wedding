// Exports du plan de table pour le traiteur / la coordination (PCO) : document Word et impression.
import React from 'react';
import { capacityOf, categoryLabel, seats, sideLabel, sumSeats, type SeatGuest, type SeatTable } from '../../lib/seating';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function downloadWordPCO(marriage: any, tables: SeatTable[], guests: SeatGuest[]) {
  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  const blocks = tables.map((t) => {
    const list = guests.filter((g) => g.table_id === t.id);
    const rows = list.length
      ? list.map((g) => `<tr><td style="padding:6px;border:1px solid #ddd;font-weight:bold">${esc(g.name)}</td><td style="padding:6px;border:1px solid #ddd">${esc(categoryLabel(g.category))}</td><td style="padding:6px;border:1px solid #ddd">${esc(sideLabel(g.side))}</td><td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:bold">${seats(g)}</td></tr>`).join('')
      : `<tr><td colspan="4" style="padding:6px;border:1px solid #ddd;text-align:center;color:#888;font-style:italic">Aucun invité</td></tr>`;
    return `<div style="margin-bottom:24px;page-break-inside:avoid"><h2 style="font-size:14pt;margin:0 0 6px">${t.is_vip ? 'VIP · ' : ''}${esc(t.name)} <span style="font-size:10pt;font-weight:normal;color:#555">(${sumSeats(list)} / ${capacityOf(t)} couverts)</span></h2>
      <table style="width:100%;border-collapse:collapse;font-size:10pt"><thead><tr style="background:#f3efe9;text-align:left"><th style="padding:6px;border:1px solid #ddd">Nom</th><th style="padding:6px;border:1px solid #ddd">Catégorie</th><th style="padding:6px;border:1px solid #ddd">Côté</th><th style="padding:6px;border:1px solid #ddd;text-align:right">Couverts</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join('');
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>Plan de table</title></head>
    <body style="font-family:Arial,sans-serif"><h1 style="font-size:18pt;margin-bottom:2px">Plan de table — ${esc(couple)}</h1>
    <p style="color:#555;margin-top:0">Date : ${esc(marriage?.wedding_date ?? '')} · ${sumSeats(guests.filter((g) => g.table_id))} couverts placés sur ${tables.length} tables</p><hr/>${blocks}</body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `Plan_de_table_${couple.replace(/\W+/g, '_') || 'mariage'}.doc` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Version imprimable (masquée à l'écran)
export function PrintZone({ marriage, tables, guests }: { marriage: any; tables: SeatTable[]; guests: SeatGuest[] }) {
  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  return (
    <div className="hidden bg-white p-6 text-black print:block">
      <div className="mb-6 flex items-end justify-between border-b-2 border-black pb-3">
        <div>
          <h1 className="font-sans text-2xl font-bold">Plan de table — {couple}</h1>
          <p className="text-sm text-slate-600">Feuille de route du traiteur et de la coordination</p>
        </div>
        <p className="text-right text-xs font-semibold">{sumSeats(guests.filter((g) => g.table_id))} couverts · {tables.length} tables</p>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {tables.map((t) => {
          const list = guests.filter((g) => g.table_id === t.id);
          return (
            <div key={t.id} className="break-inside-avoid rounded-xl border border-slate-300 p-4">
              <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
                <p className="font-sans text-base font-bold">{t.is_vip ? 'VIP · ' : ''}{t.name}</p>
                <p className="text-xs font-bold">{sumSeats(list)} / {capacityOf(t)}</p>
              </div>
              {list.length === 0 ? <p className="text-xs italic text-slate-400">Aucun invité</p> : (
                <table className="w-full text-left text-xs">
                  <tbody>
                    {list.map((g) => (
                      <tr key={g.id} className="border-b border-slate-100">
                        <td className="py-1 font-semibold">{g.name}</td>
                        <td className="py-1 text-slate-600">{categoryLabel(g.category)}</td>
                        <td className="py-1 text-slate-600">{sideLabel(g.side)}</td>
                        <td className="py-1 text-right font-semibold">{seats(g)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
