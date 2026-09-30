"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Check, Upload, VolumeX, Loader2, Music } from 'lucide-react';
import { TRACKS, NO_MUSIC, resolveMusic } from '../../lib/music';

type Props = {
  value: string; // '' = mélodie d'origine, 'none' = sans musique, sinon l'adresse
  busyLabel: string | null;
  onChange: (value: string) => void;
  onPickFile: (file: File) => void;
};

export default function MusicPicker({ value, busyLabel, onChange, onPickFile }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestedRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const current = resolveMusic(value || null);

  // Coupe l'écoute en quittant la page
  useEffect(() => () => audioRef.current?.pause(), []);

  const togglePreview = (url: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing === url) { audio.pause(); return; }
    requestedRef.current = url;
    audio.src = url;
    setLoadingUrl(url);
    audio.play().catch(() => setLoadingUrl(null));
  };

  const select = (next: string) => onChange(next);

  const isSelected = (url: string, isDefault: boolean) =>
    isDefault ? !value : value === url;

  return (
    <div className="space-y-3">
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => { setPlaying(requestedRef.current); setLoadingUrl(null); }}
        onPause={() => setPlaying(null)}
        onEnded={() => setPlaying(null)}
        onError={() => { setPlaying(null); setLoadingUrl(null); }}
      />

      <div role="radiogroup" aria-label="Musique d'ambiance" className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {TRACKS.map((track, i) => (
          <TrackRow
            key={track.id}
            title={track.title}
            subtitle={`${track.composer} · ${track.mood}`}
            selected={isSelected(track.url, i === 0)}
            playing={playing === track.url}
            loading={loadingUrl === track.url}
            onSelect={() => select(i === 0 ? '' : track.url)}
            onPreview={() => togglePreview(track.url)}
          />
        ))}

        {current.isCustom && current.url && (
          <TrackRow
            title="Votre morceau"
            subtitle="Envoyé depuis votre appareil"
            selected
            playing={playing === current.url}
            loading={loadingUrl === current.url}
            onSelect={() => {}}
            onPreview={() => togglePreview(current.url!)}
          />
        )}

        <button
          type="button"
          role="radio"
          aria-checked={value === NO_MUSIC}
          onClick={() => { audioRef.current?.pause(); select(NO_MUSIC); }}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ivory"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><VolumeX className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Sans musique</span>
            <span className="block text-xs text-slate-500">Le bouton musique n&apos;apparaît pas sur l&apos;invitation</span>
          </span>
          <Radio selected={value === NO_MUSIC} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={Boolean(busyLabel)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink disabled:opacity-50"
      >
        {busyLabel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busyLabel ?? (current.isCustom ? 'Remplacer votre morceau' : 'Envoyer votre propre chanson')}
      </button>
      <p className="text-xs text-slate-500">MP3 ou M4A, 10 Mo maximum. La musique ne démarre que si l&apos;invité appuie sur le bouton.</p>
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,.mp3,.m4a"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-ink bg-ink text-white' : 'border-slate-300'}`}>
      {selected && <Check className="h-3 w-3" />}
    </span>
  );
}

function TrackRow({ title, subtitle, selected, playing, loading, onSelect, onPreview }: {
  title: string; subtitle: string; selected: boolean; playing: boolean; loading: boolean; onSelect: () => void; onPreview: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${selected ? 'bg-ivory' : 'hover:bg-ivory/60'}`}>
      <button
        type="button"
        onClick={onPreview}
        aria-label={playing ? `Arrêter l'écoute de ${title}` : `Écouter ${title}`}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors ${playing ? 'bg-ink text-white' : 'border border-amber-300 text-amber-700 hover:bg-amber-50'}`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
      <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            {playing && <Music className="h-3.5 w-3.5 animate-pulse text-rose-500" />}{title}
          </span>
          <span className="block truncate text-xs text-slate-500">{subtitle}</span>
        </span>
        <Radio selected={selected} />
      </button>
    </div>
  );
}
