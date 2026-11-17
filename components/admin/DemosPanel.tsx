"use client";

// Administration > Démos : tous les modèles d'invitation pré-remplis (faux couple Aya & Konan) pour chaque
// type de cérémonie, à envoyer à un prospect avec son nom sur l'invitation. Rien n'est créé en base.
import React, { useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import { INVITATION_TEMPLATES } from '../../lib/invitation-templates';
import { BOGOLAN_PATTERN, KITA_PATTERN, waxPattern } from '../../lib/african-invitation';
import { DEMO_TYPES, demoUrl, type DemoType } from '../../lib/demo-invitation';

const THUMBS: Record<string, React.CSSProperties> = {
  classique: { background: 'linear-gradient(#c9b7a8, #ffffff 70%)' },
  enveloppe: { background: 'linear-gradient(135deg, #f3e6d8 50%, #e7d3bf 50%)' },
  story: { background: 'linear-gradient(#9e3a55 60%, #1b1220 60%)' },
  pagne: { backgroundImage: waxPattern('#9e3a55', '#c9962b'), backgroundSize: '24px 24px' },
  kita: { backgroundImage: KITA_PATTERN, backgroundSize: '50px 32px' },
  bogolan: { backgroundImage: BOGOLAN_PATTERN, backgroundSize: '22px 22px' },
  village: { background: 'linear-gradient(#f39a3d, #f9dfa2 50%, #b8662f 50%)' },
  avant_premiere: { background: 'linear-gradient(#9e3a55 45%, #0b0b0c 45%)' },
};

export default function DemosPanel() {
  const [name, setName] = useState('');
  const [type, setType] = useState<DemoType>('dot');
  const [copied, setCopied] = useState<string | null>(null);
  // L'onglet ne s'affiche qu'après un clic : le navigateur est toujours là
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const current = DEMO_TYPES.find((t) => t.id === type)!;
  const link = (tpl: string) => demoUrl(origin, tpl, type, name);
  const message = (tpl: string) => `Bonjour${name.trim() ? ` ${name.trim()}` : ''}, voici à quoi pourrait ressembler l'invitation de ${current.of} avec WeddingStudio : ${link(tpl)}`;

  const copy = async (tpl: string) => {
    try { await navigator.clipboard.writeText(link(tpl)); setCopied(tpl); setTimeout(() => setCopied(null), 1800); }
    catch { window.prompt('Copiez le lien :', link(tpl)); }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <label htmlFor="demo-prospect" className="block text-xs font-semibold text-slate-600">Nom du prospect <span className="font-normal text-slate-400">(affiché sur l’invitation, facultatif)</span></label>
        <input id="demo-prospect" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex : Madame Koné"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] outline-none focus:border-rose-400" />
        <div role="radiogroup" aria-label="Type de cérémonie" className="mt-4 flex flex-wrap gap-2">
          {DEMO_TYPES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={type === t.id} onClick={() => setType(t.id)}
              className={`min-h-[40px] rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors ${type === t.id ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-slate-500">Aya &amp; Konan · {current.summary} Les dates tombent toujours un samedi, dans environ quatre mois.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INVITATION_TEMPLATES.map((t) => (
          <div key={t.id} className="grid grid-cols-[56px_1fr] gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <span aria-hidden className="h-[72px] w-14 rounded-xl ring-1 ring-slate-200" style={THUMBS[t.id]} />
            <div className="min-w-0">
              <p className="font-display text-[16px] text-ink">{t.label}</p>
              <p className="mt-0.5 line-clamp-3 text-[12px] leading-snug text-slate-500">{t.description}</p>
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-1.5">
              <a href={origin ? link(t.id) : '#'} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-slate-200 text-[12px] font-bold text-ink hover:border-ink">
                <ExternalLink className="h-3.5 w-3.5" /> Voir
              </a>
              <button type="button" onClick={() => copy(t.id)}
                className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-slate-200 text-[12px] font-bold text-ink hover:border-ink">
                {copied === t.id ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copié</> : <><Copy className="h-3.5 w-3.5" /> Copier</>}
              </button>
              <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(message(t.id))}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-[#1f9d55] text-[12px] font-bold text-white hover:opacity-90">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
