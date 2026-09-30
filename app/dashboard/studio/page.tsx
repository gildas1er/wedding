"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Save, Palette, Image as ImageIcon, Upload, Loader2, Clock, MapPin, Calendar,
  Check, Landmark, PartyPopper, Link as LinkIcon, Cross, AlertCircle, ExternalLink,
  MessageCircle, Smartphone, RotateCcw, type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toISODate, toHHMM } from '../../../lib/event-datetime';
import { ceremonyFlags, isHttpUrl, mapsUrl } from '../../../lib/ceremonies';
import {
  DEFAULT_WHATSAPP_TEMPLATE, WHATSAPP_PLACEHOLDERS, buildInvitationMessage, hasLinkPlaceholder,
} from '../../../lib/whatsapp-message';

type Config = {
  primary_color: string;
  invitation_text: string;
  bg_image_url: string;
  show_civil: boolean;
  show_religious: boolean;
  show_reception: boolean;
  mairie_date: string;
  mairie_hour: string;
  mairie_location: string;
  mairie_maps_url: string;
  religious_date: string;
  religious_hour: string;
  religious_location: string;
  religious_maps_url: string;
  reception_hour: string;
  reception_location: string;
  reception_maps_url: string;
  whatsapp_message: string;
};

const EMPTY_CONFIG: Config = {
  primary_color: '#9e3a55',
  invitation_text: 'Vous êtes invités',
  bg_image_url: '',
  show_civil: true,
  show_religious: false,
  show_reception: true,
  mairie_date: '', mairie_hour: '', mairie_location: '', mairie_maps_url: '',
  religious_date: '', religious_hour: '', religious_location: '', religious_maps_url: '',
  reception_hour: '', reception_location: '', reception_maps_url: '',
  whatsapp_message: DEFAULT_WHATSAPP_TEMPLATE,
};

// Colonnes ajoutées par la migration 3 (enregistrées à part pour ne pas bloquer le reste)
const EXTENDED_KEYS = ['show_civil', 'show_religious', 'show_reception', 'whatsapp_message'] as const;

type Notice = { type: 'success' | 'error' | 'info'; text: string } | null;

export default function InvitationStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [marriage, setMarriage] = useState<any>(null);
  const [legacyValues, setLegacyValues] = useState<Record<string, string>>({});
  const [extendedAvailable, setExtendedAvailable] = useState(true);
  const [previewTab, setPreviewTab] = useState<'rsvp' | 'whatsapp'>('rsvp');

  const [config, setConfig] = useState<Config>(EMPTY_CONFIG);
  const [savedConfig, setSavedConfig] = useState<Config>(EMPTY_CONFIG);
  const isDirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(savedConfig), [config, savedConfig]);

  const set = <K extends keyof Config>(key: K, value: Config[K]) => setConfig((prev) => ({ ...prev, [key]: value }));

  const flash = (n: Notice, ms = 3500) => {
    setNotice(n);
    if (n) setTimeout(() => setNotice((cur) => (cur === n ? null : cur)), ms);
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('marriages').select('*').eq('user_id', user.id).single();
        if (!data) return;

        setMarriage(data);
        setExtendedAvailable('whatsapp_message' in data);

        // Conversion des anciennes saisies en texte libre vers les formats des sélecteurs
        const year = data.wedding_date ? new Date(data.wedding_date).getFullYear() : undefined;
        const legacy: Record<string, string> = {};
        const asDate = (key: string) => {
          const iso = toISODate(data[key], year);
          if (data[key] && !iso) legacy[key] = data[key];
          return iso ?? '';
        };
        const asHour = (key: string) => {
          const hhmm = toHHMM(data[key]);
          if (data[key] && !hhmm) legacy[key] = data[key];
          return hhmm ?? '';
        };
        const flags = ceremonyFlags(data);
        const loaded: Config = {
          primary_color: data.primary_color || EMPTY_CONFIG.primary_color,
          invitation_text: data.invitation_text || EMPTY_CONFIG.invitation_text,
          bg_image_url: data.bg_image_url || '',
          show_civil: flags.civil,
          show_religious: flags.religious,
          show_reception: flags.reception,
          mairie_date: asDate('mairie_date'),
          mairie_hour: asHour('mairie_hour'),
          mairie_location: data.mairie_location || '',
          mairie_maps_url: data.mairie_maps_url || '',
          religious_date: asDate('religious_date'),
          religious_hour: asHour('religious_hour'),
          religious_location: data.religious_location || '',
          religious_maps_url: data.religious_maps_url || '',
          reception_hour: asHour('reception_hour'),
          reception_location: data.reception_location || '',
          reception_maps_url: data.reception_maps_url || '',
          whatsapp_message: data.whatsapp_message || DEFAULT_WHATSAPP_TEMPLATE,
        };
        setLegacyValues(legacy);
        setConfig(loaded);
        setSavedConfig(loaded);
      } catch (error) {
        console.error('Erreur lors du chargement:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Prévient avant de quitter la page avec des modifications non publiées
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // ── Aperçu : la vraie page RSVP dans une iframe, alimentée en direct ──
  const postPreview = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'studio-preview', config }, window.location.origin);
  }, [config]);

  useEffect(() => { postPreview(); }, [postPreview]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'studio-preview-ready') postPreview();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postPreview]);

  const handleSave = async () => {
    if (!marriage) return;
    for (const [key, label] of [['mairie_maps_url', 'mairie'], ['religious_maps_url', 'église'], ['reception_maps_url', 'réception']] as const) {
      if (config[key] && !isHttpUrl(config[key])) {
        flash({ type: 'error', text: `Le lien Google Maps (${label}) n'est pas valide. Laissez-le vide pour qu'il soit créé automatiquement.` }, 5000);
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase.from('marriages').update({
      primary_color: config.primary_color,
      invitation_text: config.invitation_text,
      bg_image_url: config.bg_image_url,
      mairie_date: config.mairie_date || null,
      mairie_hour: config.mairie_hour || null,
      mairie_location: config.mairie_location,
      mairie_maps_url: config.mairie_maps_url,
      religious_date: config.religious_date || null,
      religious_hour: config.religious_hour || null,
      religious_location: config.religious_location,
      religious_maps_url: config.religious_maps_url,
      reception_hour: config.reception_hour || null,
      reception_location: config.reception_location,
      reception_maps_url: config.reception_maps_url,
    }).eq('id', marriage.id);

    if (error) {
      setSaving(false);
      flash({ type: 'error', text: `Erreur lors de la sauvegarde : ${error.message}` }, 6000);
      return;
    }

    // Cérémonies et message WhatsApp : colonnes de la migration 3
    const message = config.whatsapp_message.trim();
    const { error: extError } = await supabase.from('marriages').update({
      show_civil: config.show_civil,
      show_religious: config.show_religious,
      show_reception: config.show_reception,
      whatsapp_message: !message || message === DEFAULT_WHATSAPP_TEMPLATE.trim() ? null : config.whatsapp_message,
    }).eq('id', marriage.id);

    setSaving(false);
    setLegacyValues({});
    if (extError) {
      const saved = { ...config };
      for (const k of EXTENDED_KEYS) (saved as any)[k] = (savedConfig as any)[k];
      setSavedConfig(saved);
      setExtendedAvailable(false);
      flash({ type: 'info', text: "Programme publié. Le choix des cérémonies et le message WhatsApp demandent la migration 3 dans Supabase." }, 7000);
      return;
    }
    setSavedConfig(config);
    setMarriage((m: any) => ({ ...m, ...config }));
    flash({ type: 'success', text: "L'invitation est publiée !" });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !marriage) return;
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `backgrounds/${marriage.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('invitations').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('invitations').getPublicUrl(filePath);
      set('bg_image_url', publicUrl);
    } catch (error: any) {
      flash({ type: 'error', text: `Erreur lors de l'envoi de la photo : ${error.message}` }, 6000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Insère un repère ({prenom}, {lien}…) à la position du curseur
  const insertPlaceholder = (token: string) => {
    const el = messageRef.current;
    const text = config.whatsapp_message;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    set('whatsapp_message', text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const couple = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  const sampleMessage = buildInvitationMessage(config.whatsapp_message, {
    prenom: 'Aya Bamba',
    maries: couple || 'Awa & Yao',
    lien: `${typeof window !== 'undefined' ? window.location.origin : ''}/rsvp/${marriage?.id ?? ''}?guest=…`,
  });

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-ivory">
      <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      <p className="mt-4 text-sm text-slate-500">Chargement du studio…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory p-4 text-ink sm:p-8 lg:p-12">
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -16, x: '-50%' }}
            role="status"
            className={`fixed left-1/2 top-6 z-[200] flex max-w-[92vw] items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-xl ${
              notice.type === 'error' ? 'bg-red-600 text-white' : notice.type === 'info' ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' : 'bg-ink text-white'
            }`}
          >
            {notice.type === 'success' ? <Check className="h-4 w-4 shrink-0 text-amber-300" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {notice.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
        {/* ═════════ CONFIGURATION ═════════ */}
        <div className="space-y-8 lg:col-span-7">
          <header>
            <p className="eyebrow">Faire-part & RSVP</p>
            <h1 className="mt-2 text-3xl font-normal sm:text-4xl">Le <span className="italic text-rose-500">studio</span></h1>
            <p className="mt-1 text-slate-500">Composez l&apos;invitation que vos proches recevront. L&apos;aperçu se met à jour en direct.</p>
          </header>

          {/* Identité & photo */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card icon={Palette} title="Identité visuelle">
              <Field label="Couleur signature">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
                  <input type="color" value={config.primary_color} onChange={(e) => set('primary_color', e.target.value)} className="h-10 w-10 cursor-pointer rounded-lg border-none bg-transparent" aria-label="Couleur signature" />
                  <span className="font-mono text-sm text-slate-600">{config.primary_color}</span>
                </div>
              </Field>
              <Field label="Titre de l'invitation">
                <input type="text" value={config.invitation_text} onChange={(e) => set('invitation_text', e.target.value)} placeholder="Ex : Vous êtes invités" className={inputClass} />
              </Field>
            </Card>

            <Card icon={ImageIcon} title="Photo de couverture">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="group relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-ivory transition-colors hover:border-amber-300">
                {uploading && <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm"><Loader2 className="h-6 w-6 animate-spin text-rose-500" /></div>}
                {config.bg_image_url ? (
                  <img src={config.bg_image_url} alt="Photo de couverture" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <span className="space-y-2 text-center">
                    <Upload className="mx-auto h-6 w-6 text-slate-400" />
                    <span className="block text-sm font-medium text-slate-500">Importer une photo</span>
                  </span>
                )}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
            </Card>
          </div>

          {/* Programme */}
          <Card icon={Clock} title="Le programme" subtitle="Activez uniquement les cérémonies prévues : les autres n'apparaîtront pas aux invités.">
            {!extendedAvailable && <MigrationHint />}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <CeremonyCard icon={Landmark} title="Cérémonie civile" tone="rose" enabled={config.show_civil} onToggle={(v) => set('show_civil', v)}>
                <DateField label="Date de la cérémonie civile" value={config.mairie_date} onChange={(v) => set('mairie_date', v)} legacy={legacyValues.mairie_date} />
                <TimeField label="Heure de la cérémonie civile" value={config.mairie_hour} onChange={(v) => set('mairie_hour', v)} legacy={legacyValues.mairie_hour} />
                <IconInput icon={MapPin} placeholder="Lieu (ex : Mairie de Cocody)" value={config.mairie_location} onChange={(v) => set('mairie_location', v)} />
                <MapsField value={config.mairie_maps_url} location={config.mairie_location} onChange={(v) => set('mairie_maps_url', v)} />
              </CeremonyCard>

              <CeremonyCard icon={Cross} title="Cérémonie religieuse" tone="blue" enabled={config.show_religious} onToggle={(v) => set('show_religious', v)}>
                <DateField label="Date de la cérémonie religieuse" value={config.religious_date} onChange={(v) => set('religious_date', v)} legacy={legacyValues.religious_date} />
                <TimeField label="Heure de la cérémonie religieuse" value={config.religious_hour} onChange={(v) => set('religious_hour', v)} legacy={legacyValues.religious_hour} />
                <IconInput icon={MapPin} placeholder="Lieu (ex : Paroisse Saint-Laurent)" value={config.religious_location} onChange={(v) => set('religious_location', v)} />
                <MapsField value={config.religious_maps_url} location={config.religious_location} onChange={(v) => set('religious_maps_url', v)} />
              </CeremonyCard>

              <div className="md:col-span-2">
                <CeremonyCard icon={PartyPopper} title="Réception & dîner" tone="amber" enabled={config.show_reception} onToggle={(v) => set('show_reception', v)}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <TimeField label="Heure de la réception" value={config.reception_hour} onChange={(v) => set('reception_hour', v)} legacy={legacyValues.reception_hour} />
                    <IconInput icon={MapPin} placeholder="Lieu de la fête" value={config.reception_location} onChange={(v) => set('reception_location', v)} />
                  </div>
                  <MapsField value={config.reception_maps_url} location={config.reception_location} onChange={(v) => set('reception_maps_url', v)} />
                </CeremonyCard>
              </div>
            </div>
          </Card>

          {/* Message WhatsApp */}
          <Card icon={MessageCircle} title="Message WhatsApp" subtitle="Le texte envoyé à chaque invité. Les repères sont remplacés automatiquement.">
            {!extendedAvailable && <MigrationHint />}
            <div className="flex flex-wrap items-center gap-2">
              {WHATSAPP_PLACEHOLDERS.map(({ token, label }) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => insertPlaceholder(token)}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                  title={`Insérer : ${label}`}
                >
                  {token} <span className="font-normal text-amber-700/80">· {label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => set('whatsapp_message', DEFAULT_WHATSAPP_TEMPLATE)}
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Message par défaut
              </button>
            </div>
            <textarea
              ref={messageRef}
              value={config.whatsapp_message}
              onChange={(e) => set('whatsapp_message', e.target.value)}
              rows={14}
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-[15px] leading-relaxed text-ink outline-none transition-colors focus:border-amber-400"
              aria-label="Message WhatsApp"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {hasLinkPlaceholder(config.whatsapp_message) ? (
                <span className="text-slate-500">Astuce : *gras* et _italique_ fonctionnent dans WhatsApp.</span>
              ) : (
                <span className="font-medium text-amber-700">Sans {'{lien}'}, le lien de réponse sera ajouté à la fin du message.</span>
              )}
              <button type="button" onClick={() => setPreviewTab('whatsapp')} className="font-semibold text-rose-600 hover:text-rose-700 lg:hidden">
                Voir l&apos;aperçu
              </button>
            </div>
          </Card>

          {/* Publication */}
          <div className="sticky bottom-4 z-30 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-lg backdrop-blur">
            <p className="flex-1 pl-2 text-sm text-slate-500">
              {isDirty ? <span className="font-medium text-amber-700">Modifications non publiées</span> : 'Tout est à jour'}
            </p>
            <button onClick={handleSave} disabled={saving || !isDirty} className="inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-40">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Publication…' : 'Publier'}
            </button>
          </div>
        </div>

        {/* ═════════ APERÇU ═════════ */}
        <div className="flex flex-col items-center lg:col-span-5">
          <div className="flex w-full flex-col items-center gap-5 lg:sticky lg:top-8">
            <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {([['rsvp', 'Page RSVP', Smartphone], ['whatsapp', 'Message WhatsApp', MessageCircle]] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreviewTab(id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${previewTab === id ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:text-ink'}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            <div className="relative h-[720px] w-full max-w-[360px] overflow-hidden rounded-[3rem] border-[10px] border-ink bg-ink shadow-2xl">
              <div className="absolute left-1/2 top-0 z-20 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-ink" />
              <div className="absolute inset-0 overflow-hidden rounded-[2.4rem] bg-white">
                {/* L'iframe reste montée pour garder l'aperçu à jour pendant qu'on regarde le message */}
                {marriage && (
                  <iframe
                    ref={iframeRef}
                    src={`/rsvp/${marriage.id}?preview=1`}
                    title="Aperçu de la page RSVP"
                    onLoad={postPreview}
                    className={`h-full w-full border-0 ${previewTab === 'rsvp' ? '' : 'invisible'}`}
                  />
                )}
                {previewTab === 'whatsapp' && <WhatsAppPreview couple={couple} message={sampleMessage} />}
              </div>
            </div>

            {marriage && previewTab === 'rsvp' && (
              <a href={`/rsvp/${marriage.id}?preview=1`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink">
                <ExternalLink className="h-4 w-4" /> Ouvrir en plein écran
              </a>
            )}
            <p className="max-w-[360px] text-center text-xs leading-relaxed text-slate-500">
              {previewTab === 'rsvp'
                ? "Aperçu de la vraie page reçue par vos invités, avec vos modifications non publiées."
                : "Exemple pour une invitée nommée Aya Bamba. Chaque invité reçoit son propre lien."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Composants ─────────── */

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-amber-400';

function Card({ icon: Icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-700"><Icon className="h-[18px] w-[18px]" strokeWidth={1.6} /></span>
        <div>
          <h2 className="font-display text-xl text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const TONES = {
  rose: { ring: 'border-rose-200', bg: 'bg-rose-50/40', text: 'text-rose-600', switch: 'bg-rose-500' },
  blue: { ring: 'border-blue-200', bg: 'bg-blue-50/40', text: 'text-blue-600', switch: 'bg-blue-500' },
  amber: { ring: 'border-amber-200', bg: 'bg-amber-50/40', text: 'text-amber-700', switch: 'bg-amber-500' },
} as const;

function CeremonyCard({ icon: Icon, title, tone, enabled, onToggle, children }: {
  icon: LucideIcon; title: string; tone: keyof typeof TONES; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div className={`rounded-2xl border p-4 transition-colors sm:p-5 ${enabled ? `${t.ring} ${t.bg}` : 'border-dashed border-slate-200 bg-slate-50/50'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`flex items-center gap-2.5 text-sm font-semibold ${enabled ? t.text : 'text-slate-400'}`}>
          <Icon className="h-4 w-4" strokeWidth={1.8} /> {title}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`${title} : ${enabled ? 'prévue' : 'non prévue'}`}
          onClick={() => onToggle(!enabled)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? t.switch : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {enabled ? (
        <div className="mt-4 space-y-3">{children}</div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Non prévue — masquée sur l&apos;invitation.</p>
      )}
    </div>
  );
}

function IconInput({ icon: Icon, value, onChange, placeholder }: { icon: LucideIcon; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={`${inputClass} pl-10`} />
    </div>
  );
}

function LegacyNote({ value, what }: { value?: string; what: string }) {
  if (!value) return null;
  return <p className="mt-1.5 pl-1 text-xs text-amber-700">Ancienne saisie « {value} » : choisissez {what} ci-dessus.</p>;
}

function DateField({ label, value, onChange, legacy }: { label: string; value: string; onChange: (v: string) => void; legacy?: string }) {
  return (
    <div>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="date" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} min-h-[3rem] cursor-pointer pl-10`} />
      </div>
      <LegacyNote value={legacy} what="la date" />
    </div>
  );
}

function TimeField({ label, value, onChange, legacy }: { label: string; value: string; onChange: (v: string) => void; legacy?: string }) {
  return (
    <div>
      <div className="relative">
        <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="time" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} min-h-[3rem] cursor-pointer pl-10`} />
      </div>
      <LegacyNote value={legacy} what="l'heure" />
    </div>
  );
}

function MapsField({ value, location, onChange }: { value: string; location: string; onChange: (v: string) => void }) {
  const invalid = Boolean(value) && !isHttpUrl(value);
  const effective = mapsUrl(value, location);
  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="url"
            inputMode="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Lien Google Maps (facultatif)"
            aria-label="Lien Google Maps"
            aria-invalid={invalid}
            className={`${inputClass} pl-10 text-sm ${invalid ? 'border-red-300 focus:border-red-400' : ''}`}
          />
        </div>
        <a
          href={effective ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!effective}
          onClick={(e) => { if (!effective) e.preventDefault(); }}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
            effective ? 'border-slate-200 bg-white text-ink hover:border-ink' : 'cursor-not-allowed border-slate-100 text-slate-300'
          }`}
        >
          <ExternalLink className="h-4 w-4" /> Tester
        </a>
      </div>
      <p className={`mt-1.5 pl-1 text-xs ${invalid ? 'text-red-600' : 'text-slate-500'}`}>
        {invalid
          ? 'Lien invalide : il doit commencer par https://'
          : value
            ? 'Vos invités ouvriront ce lien.'
            : location.trim()
              ? 'Laissé vide : un lien sera créé automatiquement à partir du lieu.'
              : 'Renseignez le lieu, ou collez un lien Google Maps.'}
      </p>
    </div>
  );
}

function MigrationHint() {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      Pour enregistrer ces réglages, lancez la migration « 20260930_03_studio_ceremonies_message.sql » dans Supabase. En attendant, l&apos;aperçu fonctionne.
    </p>
  );
}

// Rendu façon WhatsApp : *gras*, _italique_, lignes « > » en citation
function formatWhatsAppLine(line: string, key: number) {
  const quote = line.startsWith('> ');
  const content = quote ? line.slice(2) : line;
  const parts = content.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((part, i) => {
    if (/^\*[^*]+\*$/.test(part)) return <strong key={i}>{part.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
  return (
    <span key={key} className={`block min-h-[1.2em] break-words ${quote ? 'border-l-4 border-[#25d366]/40 pl-2 text-[#54656f]' : ''}`}>
      {parts}
    </span>
  );
}

function WhatsAppPreview({ couple, message }: { couple: string; message: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-[#efeae2]">
      <div className="flex items-center gap-3 bg-[#008069] px-4 pb-3 pt-9 text-white">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-sm font-semibold">
          <Heart className="h-4 w-4 fill-white" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{couple || 'Les mariés'}</p>
          <p className="text-xs text-white/75">en ligne</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="ml-auto max-w-[88%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-2.5 pb-1.5 pt-2 text-[13.5px] leading-snug text-[#111b21] shadow-sm">
          {message.split('\n').map(formatWhatsAppLine)}
          <p className="mt-1 text-right text-[10px] text-[#667781]">12:00 ✓✓</p>
        </div>
      </div>
    </div>
  );
}
