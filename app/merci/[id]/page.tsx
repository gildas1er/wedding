"use client";

// Carte de remerciements d'un invité (migration 35), ouverte depuis le lien envoyé par les mariés sur
// WhatsApp : /merci/<mariage>?g=<invité>. À enregistrer en image, ou en PDF à imprimer (formules payantes).
// En dessous, WeddingStudio se présente à ceux qui se marient bientôt (code de parrainage des mariés).
import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, FileText, Heart, Loader2 } from 'lucide-react';
import posthog from 'posthog-js';
import ThanksCard from '../../../components/thanks/ThanksCard';
import AfterWeddingPromo from '../../../components/rsvp/AfterWeddingPromo';
import { formatWeddingDay, thanksFilename, type ThanksCardData } from '../../../lib/thanks';
import { canvasToBlob, canvasToPdf, saveFile } from '../../../lib/ticket';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'later'; weddingDate: string | null; couple: string }
  | { kind: 'card'; card: ThanksCardData };

export default function MerciPage() {
  return (
    <Suspense fallback={<Shell><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-300" /></Shell>}>
      <Merci />
    </Suspense>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#efe6d8] px-4 pb-16 pt-[max(2.5rem,env(safe-area-inset-top))]">{children}</main>;
}

function Merci() {
  const { id } = useParams<{ id: string }>();
  const guest = useSearchParams().get('g') ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [saving, setSaving] = useState<'png' | 'pdf' | null>(null);

  useEffect(() => {
    fetch(`/api/merci?m=${encodeURIComponent(id)}&g=${encodeURIComponent(guest)}`)
      .then(async (res) => {
        const out = await res.json().catch(() => null);
        if (!res.ok || !out) return setState({ kind: 'missing' });
        if (!out.available) return setState({ kind: 'later', weddingDate: out.weddingDate ?? null, couple: [out.partner1, out.partner2].filter(Boolean).join(' & ') });
        setState({ kind: 'card', card: out.card });
        posthog.capture('thanks_card_opened', { template: out.card.template });
      })
      .catch(() => setState({ kind: 'missing' }));
  }, [id, guest]);

  const save = async (card: ThanksCardData, ext: 'png' | 'pdf') => {
    setSaving(ext);
    try {
      const { drawThanksCard } = await import('../../../lib/thanks-draw');
      const exportCard = async (c: ThanksCardData) => {
        const canvas = await drawThanksCard(c);
        return ext === 'pdf' ? canvasToPdf(canvas, 10) : canvasToBlob(canvas, 'image/png');
      };
      // Photo refusée par le navigateur pour l'export (autorisation du stockage) : carte sans photo
      const blob = await exportCard(card).catch(() => exportCard({ ...card, photoUrl: null, coverUrl: null }));
      await saveFile(blob, thanksFilename(card.guestName, ext), ext === 'png');
      posthog.capture('thanks_card_saved', { format: ext });
    } catch (e) {
      console.error('Carte de remerciements :', e);
    } finally {
      setSaving(null);
    }
  };

  if (state.kind === 'loading') return <Shell><Loader2 className="mx-auto mt-24 h-6 w-6 animate-spin text-[#9b8b78]" /></Shell>;

  if (state.kind !== 'card') {
    return (
      <Shell>
        <div className="mx-auto mt-16 max-w-sm rounded-[1.5rem] bg-[#fbf6ee] p-8 text-center text-[#3a2e26] shadow-sm">
          <Heart className="mx-auto h-8 w-8 text-[#9b3355]" strokeWidth={1.5} />
          {state.kind === 'later' ? (
            <>
              <h1 className="mt-4 font-display text-2xl">Votre carte arrive bientôt</h1>
              <p className="mt-2 text-sm text-[#7d7268]">{state.couple || 'Les mariés'} vous ont préparé une carte de remerciements. Elle s’ouvrira à partir du {formatWeddingDay(state.weddingDate)}.</p>
            </>
          ) : (
            <>
              <h1 className="mt-4 font-display text-2xl">Carte introuvable</h1>
              <p className="mt-2 text-sm text-[#7d7268]">Ce lien est incomplet ou n’est plus valable. Demandez aux mariés de vous le renvoyer.</p>
            </>
          )}
        </div>
      </Shell>
    );
  }

  const { card } = state;
  const couple = [card.partner1, card.partner2].filter(Boolean).join(' & ');
  return (
    <Shell>
      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="mb-8 text-center text-[.68rem] font-bold uppercase tracking-[.24em] text-[#9b8b78]">
        {couple} vous remercient
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 40, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
        <ThanksCard card={card} />
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mx-auto mt-8 grid max-w-[380px] gap-2">
        <button type="button" onClick={() => save(card, 'png')} disabled={saving !== null}
          className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[#3a2e26] text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {saving === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Garder ma carte en photo
        </button>
        {card.paid && (
          <button type="button" onClick={() => save(card, 'pdf')} disabled={saving !== null}
            className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-[#d8cbb8] bg-[#fbf6ee] text-sm font-bold text-[#3a2e26] hover:border-[#3a2e26] disabled:opacity-60">
            {saving === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF à imprimer (10 × 15 cm)
          </button>
        )}
        {card.guestbookOpen && <a href={`/guestbook?id=${card.marriageId}`} className="mt-1 text-center text-sm font-semibold text-[#7d7268] underline-offset-4 hover:text-[#3a2e26] hover:underline">
          Répondre par un mot dans leur livre d’or
        </a>}
      </motion.div>

      <div className="mx-auto mt-14 max-w-xl">
        <AfterWeddingPromo couple={couple} referralCode={card.referralCode} />
      </div>
    </Shell>
  );
}
