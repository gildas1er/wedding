"use client";

// Tenue demandée par les mariés (migration 37) : pagne de la cérémonie, tenue traditionnelle ou couleurs imposées.
// Le pagne peut se commander sur WhatsApp auprès de la personne choisie par le couple.
import React from 'react';
import { MessageCircle, Shirt } from 'lucide-react';
import {
  DRESS_CODES, formatPrice, hasPagne, pagneOrderLink, readDressColors, readPagne, resolveDressCode,
  type InvitationLike,
} from '../../lib/african-invitation';

export default function DressCodeSection({ m, guestName }: { m: InvitationLike; guestName?: string }) {
  const code = resolveDressCode(m.dress_code);
  const colors = readDressColors(m.dress_colors);
  const pagne = readPagne(m.ceremony_pagne);
  if (!code && !hasPagne(pagne)) return null;

  const couple = [m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & ') || 'les mariés';
  const order = pagneOrderLink(pagne, couple, guestName);
  const showPagne = hasPagne(pagne) && (code === 'pagne' || code === null);

  return (
    <section aria-labelledby="tenue-titre" className="mb-10 overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white">
      <div className="flex items-center gap-3 px-5 pt-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700"><Shirt className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
        <div className="min-w-0">
          <p className="eyebrow">La tenue</p>
          <h2 id="tenue-titre" className="font-display text-xl text-ink">{code ? DRESS_CODES.find((d) => d.id === code)!.heading : 'Le pagne de la cérémonie'}</h2>
        </div>
      </div>

      {code === 'couleurs' && colors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 px-5 pt-4">
          {colors.map((c) => <span key={c} title={c} className="h-9 w-9 rounded-full border-2 border-white shadow ring-1 ring-slate-200" style={{ background: c }} />)}
          <span className="text-sm text-slate-500">Habillez-vous dans ces couleurs.</span>
        </div>
      )}
      {code === 'traditionnel' && <p className="px-5 pt-3 text-sm text-slate-600">Les mariés vous invitent à venir en tenue traditionnelle.</p>}

      {showPagne && (
        <div className="mt-4 grid gap-3 px-5 pb-5">
          {pagne.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pagne.photo_url} alt={pagne.label ? `Pagne « ${pagne.label} »` : 'Pagne de la cérémonie'} className="aspect-[4/3] w-full rounded-2xl object-cover" loading="lazy" />
          )}
          {(pagne.label || pagne.price) && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 font-semibold text-ink">{pagne.label || 'Pagne de la cérémonie'}</span>
              {pagne.price && <span className="shrink-0 font-display text-lg tabular-nums text-ink">{formatPrice(pagne.price)}</span>}
            </div>
          )}
          {order && (
            <a href={order} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#1f9d55] px-4 text-sm font-bold text-white transition-opacity hover:opacity-90">
              <MessageCircle className="h-4 w-4" /> Commander mon pagne{pagne.seller_name ? ` à ${pagne.seller_name}` : ''}
            </a>
          )}
        </div>
      )}
      {!showPagne && <div className="pb-5" />}
    </section>
  );
}
