"use client";
// Billet d'entrée affiché après « Je serai là » (formules payantes, migration 32).
// Rien ne s'affiche si le mariage est en version gratuite ou si la fonction n'est pas encore en base.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Loader2, Ticket } from 'lucide-react';
import posthog from 'posthog-js';
import { supabase } from '../../app/lib/supabase';
import { canvasToBlob, canvasToPdf, drawTicket, saveFile, ticketFilename, ticketUrl, type GuestTicket, type TicketMarriage } from '../../lib/ticket';

export default function GuestTicketCard({ m, marriageId, guestId }: { m: TicketMarriage; marriageId: string; guestId: string }) {
  const [ticket, setTicket] = useState<GuestTicket | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_guest_ticket', { p_marriage_id: marriageId, p_guest_id: guestId });
      if (cancelled || error || !data?.code) return;
      const t = data as GuestTicket;
      const c = await drawTicket(m, t, ticketUrl(window.location.origin, marriageId, t.code));
      if (cancelled) return;
      setTicket(t);
      setCanvas(c);
      setPreview(c.toDataURL('image/jpeg', 0.85));
    })().catch(() => {});
    return () => { cancelled = true; };
    // Le billet est dessiné une fois, avec la fiche telle qu'enregistrée
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marriageId, guestId]);

  if (!ticket || !canvas || !preview) return null;

  const save = async (kind: 'png' | 'pdf') => {
    setBusy(kind);
    try {
      const blob = kind === 'png' ? await canvasToBlob(canvas, 'image/png') : await canvasToPdf(canvas);
      await saveFile(blob, ticketFilename(ticket, kind), kind === 'png');
      posthog.capture('ticket_downloaded', { format: kind });
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600"><Ticket className="h-5 w-5" strokeWidth={1.7} /></span>
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight text-ink">Votre billet d&apos;entrée</p>
          <p className="text-xs text-slate-500">À présenter à l&apos;accueil le jour du mariage.</p>
        </div>
      </div>

      <img src={preview} alt={`Billet d'entrée de ${ticket.name}`} className="mx-auto mt-4 w-full max-w-[240px] rounded-2xl shadow-lg ring-1 ring-slate-200/70" />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => save('png')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: 'var(--wed-primary)', color: 'var(--wed-on-primary)' }}
        >
          {busy === 'png' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Image
        </button>
        <button
          type="button"
          onClick={() => save('pdf')}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-ink hover:border-ink disabled:opacity-60"
        >
          {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
        Gardez l&apos;image dans vos photos : le QR code sera scanné à l&apos;entrée. Vous le retrouvez à tout moment en rouvrant votre invitation.
      </p>
    </motion.div>
  );
}
