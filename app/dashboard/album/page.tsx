"use client";

// Album photos du couple : les photos envoyées par ses invités (privé, ouvert aussi en mode souvenir).
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { zip } from 'fflate';
import { Images, Download, Loader2, X, ChevronLeft, ChevronRight, QrCode, AlertCircle, MessageSquareQuote } from 'lucide-react';

type Photo = { id: string; file_name: string; guest_name: string; message: string | null; created_at: string; url: string };

const fileLabel = (p: Photo, i: number) => {
  const who = p.guest_name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'invite';
  return `${String(i + 1).padStart(3, '0')}-${who}.jpg`;
};

export default function AlbumPage() {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [zipping, setZipping] = useState<{ done: number; total: number } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/album', { cache: 'no-store' }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok) { setError(json?.error ?? "Impossible de charger l'album. Vérifiez votre connexion."); setPhotos([]); return; }
    setPhotos(json.photos ?? []);
  }, []);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  // Navigation au clavier dans la visionneuse
  useEffect(() => {
    if (open === null || !photos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : Math.min(photos.length - 1, i + 1)));
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, photos]);

  // Toutes les photos dans un seul fichier .zip (préparé dans le navigateur)
  const downloadAll = async () => {
    if (!photos?.length || zipping) return;
    setError(null);
    setZipping({ done: 0, total: photos.length });
    const files: Record<string, Uint8Array> = {};
    let done = 0;
    try {
      for (let i = 0; i < photos.length; i += 4) {
        await Promise.all(photos.slice(i, i + 4).map(async (p, k) => {
          const res = await fetch(p.url);
          if (!res.ok) throw new Error(String(res.status));
          files[fileLabel(p, i + k)] = new Uint8Array(await res.arrayBuffer());
          done++;
          setZipping({ done, total: photos.length });
        }));
      }
      const data = await new Promise<Uint8Array>((resolve, reject) => zip(files, { level: 0 }, (err, out) => (err ? reject(err) : resolve(out))));
      const url = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'album-photos-mariage.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setError("Le téléchargement de l'album a été interrompu. Vérifiez votre connexion puis réessayez.");
    } finally {
      setZipping(null);
    }
  };

  const current = open !== null && photos ? photos[open] : null;
  const guests = photos ? new Set(photos.map((p) => p.guest_name)).size : 0;

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:py-12">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Souvenirs</p>
            <h1 className="mt-2 text-3xl font-normal sm:text-4xl">Album <span className="italic text-rose-500">photos</span></h1>
            <p className="mt-1 text-slate-500">
              {photos === null ? 'Chargement…' : photos.length
                ? `${photos.length} photo${photos.length > 1 ? 's' : ''} envoyée${photos.length > 1 ? 's' : ''} par ${guests} invité${guests > 1 ? 's' : ''}.`
                : 'Les photos envoyées par vos invités apparaîtront ici.'}
            </p>
          </div>
          {!!photos?.length && (
            <button
              type="button"
              onClick={downloadAll}
              disabled={zipping !== null}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-70"
            >
              {zipping ? <><Loader2 className="h-4 w-4 animate-spin" /> Préparation… {zipping.done}/{zipping.total}</> : <><Download className="h-4 w-4" /> Tout télécharger (.zip)</>}
            </button>
          )}
        </header>

        {error && (
          <p role="alert" className="mb-5 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        {photos === null ? (
          <div className="flex h-[40vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-rose-500" /></div>
        ) : photos.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Images className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <p className="font-display text-xl text-ink">Votre album vous attend</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Partagez le lien ou le QR code d&apos;envoi de photos à vos invités : leurs photos arriveront ici, avec leur nom et leur message.</p>
            <Link href="/dashboard/partage" className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700">
              <QrCode className="h-4 w-4" /> Lien d&apos;envoi de photos
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {photos.map((p, i) => (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(i)} className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Photo de ${p.guest_name}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-8 text-left text-xs font-semibold text-white">
                    <span className="block truncate">{p.guest_name}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Visionneuse */}
      <AnimatePresence>
        {current && open !== null && photos && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Photo de ${current.guest_name}`}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{current.guest_name} <span className="font-normal text-white/60">· {open + 1}/{photos.length}</span></p>
              <a href={`${current.url}${current.url.includes('?') ? '&' : '?'}download=${encodeURIComponent(fileLabel(current, open))}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold hover:bg-white/20">
                <Download className="h-4 w-4" /> Télécharger
              </a>
              <button type="button" onClick={() => setOpen(null)} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.url} alt={`Photo de ${current.guest_name}`} className="max-h-full max-w-full rounded-lg object-contain" />
              {open > 0 && (
                <button type="button" onClick={() => setOpen(open - 1)} aria-label="Photo précédente" className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-black/40 hover:bg-black/60"><ChevronLeft className="h-6 w-6" /></button>
              )}
              {open < photos.length - 1 && (
                <button type="button" onClick={() => setOpen(open + 1)} aria-label="Photo suivante" className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-black/40 hover:bg-black/60"><ChevronRight className="h-6 w-6" /></button>
              )}
            </div>
            {current.message && (
              <p className="mx-auto flex max-w-xl items-start gap-2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-sm italic text-white/85">
                <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> « {current.message} »
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
