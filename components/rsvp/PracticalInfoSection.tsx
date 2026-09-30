import React from 'react';
import { Phone, MessageCircle, ExternalLink } from 'lucide-react';
import type { PracticalInfo } from '../../lib/practical-info';
import { toInternationalDigits } from '../../lib/phone';
import { isHttpUrl } from '../../lib/ceremonies';
import { INFO_ICONS } from '../practical-info-icons';

const LINK_LABELS: Partial<Record<PracticalInfo['kind'], string>> = {
  gifts: 'Voir la liste',
  accommodation: 'Réserver',
  access: 'Itinéraire',
};

// Rubriques pratiques affichées aux invités (les données sont déjà nettoyées par sanitizeInfos)
export default function PracticalInfoSection({ infos }: { infos: PracticalInfo[] }) {
  if (!infos.length) return null;
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-center gap-3">
        <div className="gold-rule w-10" />
        <p className="eyebrow">Infos pratiques</p>
        <div className="gold-rule w-10" />
      </div>
      <div className="space-y-3">
        {infos.map((info) => {
          const Icon = INFO_ICONS[info.kind];
          const digits = info.kind === 'contact' ? toInternationalDigits(info.phone) : null;
          const linkLabel = LINK_LABELS[info.kind] ?? 'Ouvrir le lien';
          return (
            <div key={info.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-500">
                  <Icon size={19} strokeWidth={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  {info.title && <h4 className="font-display text-[17px] leading-tight text-ink">{info.title}</h4>}
                  {info.text && <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">{info.text}</p>}

                  {info.kind === 'dress_code' && info.colors && info.colors.length > 0 && (
                    <div className="mt-3 flex gap-2" aria-label="Couleurs suggérées">
                      {info.colors.map((c) => (
                        <span key={c} className="h-7 w-7 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  )}

                  {info.kind === 'contact' && (info.name || digits) && (
                    <div className="mt-3">
                      {info.name && <p className="text-sm font-semibold text-ink">{info.name}</p>}
                      {digits && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <a href={`tel:+${digits}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink">
                            <Phone className="h-3.5 w-3.5" /> Appeler
                          </a>
                          <a href={`https://api.whatsapp.com/send?phone=${digits}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90" style={{ color: 'var(--wed-on-primary)' }}>
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {isHttpUrl(info.url) && info.kind !== 'contact' && (
                    <a href={info.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink">
                      <ExternalLink className="h-3.5 w-3.5" /> {linkLabel}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
