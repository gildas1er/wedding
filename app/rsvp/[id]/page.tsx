"use client";
import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Calendar, MapPin, GlassWater, 
  CheckCircle2, Clock, Users, Loader2, Sparkles,
  Landmark, Cross, Check, MessageSquare, Volume2, VolumeX, Music, Handshake
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';
import { formatDateFr, formatHourFr } from '../../../lib/event-datetime';
import { ceremonyFlags, mapsUrl } from '../../../lib/ceremonies';
import { rsvpThemeStyle, resolveAccent } from '../../../lib/palettes';
import { resolveMusic } from '../../../lib/music';
import { sanitizeInfos } from '../../../lib/practical-info';
import PracticalInfoSection from '../../../components/rsvp/PracticalInfoSection';
import EnvelopeIntro from '../../../components/rsvp/EnvelopeIntro';
import StoryIntro from '../../../components/rsvp/StoryIntro';
import { coupleInitials, resolveTemplate } from '../../../lib/invitation-templates';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PublicRSVP() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-rose-500" />
      </div>
    }>
      <RSVPContent />
    </Suspense>
  );
}

function RSVPContent() {
  const params = useParams();
  const id = params?.id; // ID du mariage
  const searchParams = useSearchParams();
  
  // Sécurité & nettoyage UUID
  const rawGuestId = searchParams.get('guest');
  const cleanedGuestId = rawGuestId ? rawGuestId.replace(/['"]+/g, '') : null;
  // Un identifiant mal formé ne doit pas empêcher d'afficher l'invitation
  const guestId = cleanedGuestId && UUID_RE.test(cleanedGuestId) ? cleanedGuestId : null;
  // Aperçu affiché dans le studio : la configuration non publiée arrive par postMessage
  const isPreview = searchParams.get('preview') === '1';
  const [previewOverrides, setPreviewOverrides] = useState<Record<string, unknown>>({});
  // Modèle « Enveloppe » : rejouable depuis le studio ; ouverte une fois par visite
  const [replay, setReplay] = useState(0);
  const [openedIntro, setOpenedIntro] = useState<string | null>(() => {
    if (typeof window === 'undefined' || isPreview) return null;
    try { return sessionStorage.getItem(`ws-intro-${String(params?.id ?? '')}`); } catch { return null; }
  });
  
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [marriage, setMarriage] = useState<any>(null);
  const [guestName, setGuestName] = useState('');

  // Gestion Audio
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // État explicit pour suivre l'interaction utilisateur
  const [userInteracted, setUserInteracted] = useState(false);

  // Nouveaux états pour le RSVP multi-événements
  const [allEventsSelected, setAllEventsSelected] = useState(true);
  const [form, setForm] = useState({
    status: '',
    guests_count: 1,
    notes: '',
    attending_dot: true,
    attending_civil: true,
    attending_church: true,
    attending_reception: true
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) { setLoading(false); return; }
      try {
        // Infos publiques du mariage + fiche de l'invité, via une fonction sécurisée
        // (les invités n'ont plus d'accès direct aux tables)
        const { data, error } = await supabase.rpc('get_rsvp_invitation', {
          p_marriage_id: id,
          p_guest_id: guestId,
        });
        if (error) throw error;
        if (data?.marriage) setMarriage(data.marriage);

        if (guestId) {
          const gData = data?.guest;

          if (gData) {
            setGuestName(gData.name);
            const isDot = gData.attending_dot ?? true;
            const isCivil = gData.attending_civil ?? true;
            const isChurch = gData.attending_church ?? true;
            const isReception = gData.attending_reception ?? true;

            setForm(prev => ({ 
              ...prev, 
              status: '', // Laissé vide au chargement pour masquer le bouton
              guests_count: gData.guests_count || 1,
              notes: gData.notes || '',
              attending_dot: isDot,
              attending_civil: isCivil,
              attending_church: isChurch,
              attending_reception: isReception
            }));

            // Vérifier si toutes les options sont cochées
            if (!isDot || !isCivil || !isChurch || !isReception) {
              setAllEventsSelected(false);
            }
          }
        }
      } catch (e) { 
        console.error("Erreur de chargement:", e); 
      }
      setLoading(false);
    };
    fetchData();
  }, [id, guestId]);

  // Déclencher la pluie de confettis lors d'une confirmation
  const triggerConfetti = () => {
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    const primary = m.primary_color || '#9e3a55';
    const accent = resolveAccent(m.primary_color, m.accent_color);
    fire(0.25, { spread: 26, startVelocity: 55, colors: [primary, accent, '#ffffff'] });
    fire(0.2, { spread: 60, colors: [accent, primary] });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, colors: [primary, accent] });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const mBase = marriage || {
    partner_1_name: "Sarah", partner_2_name: "Marc",
    primary_color: "#9e3a55", invitation_text: "VOUS ÊTES INVITÉS",
    wedding_date: new Date(), 
    mairie_date: "", mairie_hour: "14:00", mairie_location: "Hôtel de Ville",
    religious_date: "", religious_hour: "", religious_location: "",
    reception_date: "", reception_hour: "19:00", reception_location: "Domaine de la Rose",
    music_url: null
  };
  // En aperçu, la configuration du studio (non publiée) remplace celle enregistrée
  const m: any = { ...mBase, ...previewOverrides };
  const flags = ceremonyFlags(m);

  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'studio-replay') { setReplay((n) => n + 1); return; }
      if (e.data?.type !== 'studio-preview') return;
      setPreviewOverrides(e.data.config ?? {});
    };
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: 'studio-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [isPreview]);

  const music = resolveMusic(m.music_url);
  const template = resolveTemplate(m.invitation_template);
  const introKey = `${template}-${replay}`;
  const showIntro = template !== 'classique' && openedIntro !== introKey;

  const finishIntro = (goToForm = false) => {
    setOpenedIntro(introKey);
    if (goToForm) setTimeout(() => document.getElementById('reponse')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450);
    if (!isPreview) { try { sessionStorage.setItem(`ws-intro-${String(id ?? '')}`, introKey); } catch { /* navigation privée */ } }
  };
  // Le toucher sur le cachet est un geste de l'invité : la musique a le droit de démarrer
  const startMusicFromIntro = () => {
    if (!audioRef.current || isPlaying || isPreview) return;
    audioRef.current.play().catch(() => {});
  };

  // Changement de morceau (aperçu du studio) : on arrête la lecture en cours
  useEffect(() => { audioRef.current?.pause(); }, [music.url]);

  // Toggle Musique
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.log("Audio playback error:", err));
    }
  };

  // Gestion du basculement "Présent à tout"
  const handleToggleAll = (selectAll: boolean) => {
    setAllEventsSelected(selectAll);
    if (selectAll) {
      setForm(prev => ({
        ...prev,
        attending_dot: true,
        attending_civil: true,
        attending_church: true,
        attending_reception: true
      }));
    }
  };

  // Toggle individuel d'un événement
  const handleToggleEvent = (key: 'attending_dot' | 'attending_civil' | 'attending_church' | 'attending_reception') => {
    const newValue = !form[key];
    const updatedForm = { ...form, [key]: newValue };
    setForm(updatedForm);

    // Si tout est coché à nouveau, réactiver le bouton "Tous les événements"
    const isAllChecked = (!flags.dot || updatedForm.attending_dot)
      && (!flags.civil || updatedForm.attending_civil)
      && (!flags.religious || updatedForm.attending_church)
      && (!flags.reception || updatedForm.attending_reception);
    setAllEventsSelected(isAllChecked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.status) return;
    if (isPreview) { setSubmitted(true); return; }
    if (!guestId) return;

    setSending(true);

    const answer = {
      p_marriage_id: id,
      p_guest_id: guestId,
      p_status: form.status,
      p_notes: form.notes,
      p_attending_civil: flags.civil && form.attending_civil,
      p_attending_church: flags.religious && form.attending_church,
      p_attending_reception: flags.reception && form.attending_reception,
    };
    // La présence à la dot n'est envoyée que si la cérémonie figure au programme (migration 12)
    let { data: updated, error } = await supabase.rpc('submit_rsvp', flags.dot ? { ...answer, p_attending_dot: form.attending_dot } : answer);
    if (error && flags.dot && (error.code === 'PGRST202' || /function/i.test(error.message))) {
      ({ data: updated, error } = await supabase.rpc('submit_rsvp', answer));
    }

    if (error || !updated) {
      alert("Erreur lors de l'enregistrement : " + (error?.message ?? "invitation introuvable."));
    } else {
      setSubmitted(true);
      if (form.status === 'confirmé') {
        triggerConfetti();
      }
    }
    setSending(false);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Heart className="w-12 h-12 text-rose-500 animate-pulse fill-rose-500" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Préparation de votre invitation...</p>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-rose-50 flex justify-center relative" style={rsvpThemeStyle(m.primary_color, m.accent_color)}>
      
      {/* LECTEUR AUDIO CACHÉ ET BOUTON DE CONTRÔLE FLOTTANT (absents si le couple a choisi « sans musique ») */}
      {music.url && (
      <>
      <audio 
        ref={audioRef} 
        src={music.url} 
        loop 
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={toggleAudio}
        className="fixed top-4 right-4 z-50 px-3.5 py-2.5 bg-white/85 backdrop-blur-md rounded-full shadow-lg border border-white/60 text-rose-500 active:scale-95 transition-all flex items-center justify-center group"
        title={isPlaying ? "Désactiver la musique" : "Activer la musique d'ambiance"}
      >
        {isPlaying ? (
          <div className="relative flex items-center justify-center">
            <span className="absolute -inset-1 rounded-full bg-rose-400/20 animate-ping" />
            <Volume2 className="w-5 h-5 text-rose-500" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <VolumeX className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />
            <span className="text-[11px] font-semibold tracking-wide text-slate-600 pr-0.5 group-hover:text-rose-500 transition-colors">Musique</span>
          </div>
        )}
      </motion.button>
      </>
      )}

      <AnimatePresence>
        {showIntro && template === 'story' && (
          <StoryIntro
            key={introKey}
            m={m}
            flags={flags}
            infos={sanitizeInfos(m.practical_info)}
            guestName={guestName || undefined}
            canRespond={Boolean(guestId) || isPreview}
            onInteract={startMusicFromIntro}
            onDone={finishIntro}
          />
        )}
        {showIntro && template === 'enveloppe' && (
          <EnvelopeIntro
            key={introKey}
            initials={coupleInitials(m.partner_1_name, m.partner_2_name)}
            couple={[m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & ')}
            guestName={guestName || undefined}
            dateLabel={m.wedding_date ? formatDateFr(typeof m.wedding_date === 'string' ? m.wedding_date : m.wedding_date.toISOString().slice(0, 10)) : undefined}
            onOpen={startMusicFromIntro}
            onDone={() => finishIntro()}
          />
        )}
      </AnimatePresence>

      {isPreview && (
        <div className="fixed top-4 left-4 z-50 rounded-full bg-ink/85 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
          Aperçu · aucune réponse envoyée
        </div>
      )}

      <div className="w-full max-w-[450px] bg-white shadow-2xl relative min-h-screen pb-12 overflow-x-hidden">
        
        {/* BANNIÈRE IMAGE AVEC ZOOM ANIME */}
        <div className="h-[40vh] relative overflow-hidden">
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            src={m.bg_image_url || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80"} 
            className="w-full h-full object-cover" 
            style={{ objectPosition: (m.bg_image_url && m.bg_image_position) || 'center' }}
            alt="Wedding" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-black/40" />
        </div>

        {/* CARTE DATE */}
        <div className="px-6 -mt-20 relative z-10">
          <motion.div 
            initial={{ y: 30, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-[1.75rem] shadow-xl p-6 mb-8 border-b-4 text-center hover:shadow-2xl transition-all"
            style={{ borderBottomColor: m.primary_color }}
          >
            <p className="eyebrow mb-2">Enregistrez la date</p>
            <h3 className="font-display text-2xl text-ink first-letter:uppercase">
              {m.wedding_date ? new Date(m.wedding_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date à venir'}
            </h3>
          </motion.div>

          {/* NOMS DES MARIÉS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-10"
          >
             <div className="flex items-center justify-center gap-3 mb-3">
                <div className="gold-rule w-10" />
                <p className="eyebrow">{m.invitation_text}</p>
                <div className="gold-rule w-10" />
             </div>
             <h1 className="text-5xl font-normal text-ink leading-[1.05]">
               {m.partner_1_name}
               <span className="block my-1 text-4xl font-light italic text-amber-500">&amp;</span>
               {m.partner_2_name}
             </h1>
          </motion.div>

          {/* PROGRAMME */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, staggerChildren: 0.1 }}
            className="space-y-4 mb-10"
          >
            {flags.dot && (
              <ProgramItem 
                  icon={Handshake} 
                  title="La Cérémonie de Dot" 
                  time={[m.dot_date && formatDateFr(m.dot_date, { withYear: false }), formatHourFr(m.dot_hour)].filter(Boolean).join(' · ')} 
                  loc={m.dot_location} 
                  color="emerald"
                  maps={mapsUrl(m.dot_maps_url, m.dot_location)}
              />
            )}

            {flags.civil && (
              <ProgramItem 
                  icon={Landmark} 
                  title="La Cérémonie Civile" 
                  time={[m.mairie_date && formatDateFr(m.mairie_date, { withYear: false }), formatHourFr(m.mairie_hour)].filter(Boolean).join(' · ')} 
                  loc={m.mairie_location} 
                  color="rose"
                  maps={mapsUrl(m.mairie_maps_url, m.mairie_location)}
              />
            )}

            {flags.religious && (
              <ProgramItem 
                  icon={Cross} 
                  title="La Cérémonie Religieuse" 
                  time={[m.religious_date && formatDateFr(m.religious_date, { withYear: false }), formatHourFr(m.religious_hour)].filter(Boolean).join(' · ')} 
                  loc={m.religious_location} 
                  color="amber"
                  maps={mapsUrl(m.religious_maps_url, m.religious_location)}
              />
            )}

            {flags.reception && (
              <ProgramItem 
                  icon={GlassWater} 
                  title="Le Cocktail & Dîner" 
                  time={[m.reception_date && formatDateFr(m.reception_date, { withYear: false }), formatHourFr(m.reception_hour)].filter(Boolean).join(' · ')} 
                  loc={m.reception_location} 
                  color="neutral"
                  maps={mapsUrl(m.reception_maps_url, m.reception_location)}
              />
            )}
          </motion.div>

          {/* INFOS PRATIQUES (dress code, contact, hébergement…) */}
          <PracticalInfoSection infos={sanitizeInfos(m.practical_info)} />

          {/* FORMULAIRE RSVP */}
          <motion.div 
            id="reponse"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-ivory rounded-[1.75rem] p-6 sm:p-8 border border-slate-200/70 relative"
          >
            {!guestId && !isPreview ? (
              // Lien de faire-part partagé (sans invité) : la réponse se fait via le lien personnel
              <div className="text-center">
                <p className="eyebrow mb-2">Votre réponse</p>
                <p className="font-display text-xl text-ink">Répondez depuis votre invitation personnelle</p>
                <p className="mt-2 text-sm text-slate-500">Utilisez le lien reçu par WhatsApp : il vous est réservé et permet d&apos;indiquer votre présence.</p>
              </div>
            ) : !submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <p className="eyebrow mb-1">Réponse de</p>
                  <h2 className="text-2xl font-normal text-slate-800">{guestName || (isPreview ? "Prénom de l'invité" : "Cher invité")}</h2>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setForm({...form, status: 'confirmé'});
                      setUserInteracted(true);
                    }}
                    className={`flex-1 py-4 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                        form.status === 'confirmé' 
                        ? 'bg-ink text-white shadow-lg' 
                        : 'bg-white text-ink border border-slate-200 hover:border-ink'
                    }`}
                  >
                    Je serai là
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setForm({...form, status: 'décliné'});
                      setUserInteracted(true);
                    }}
                    className={`flex-1 py-4 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                        form.status === 'décliné' 
                        ? 'bg-rose-500 text-white shadow-lg' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    Je ne pourrai pas
                  </button>
                </div>

                <AnimatePresence>
                  {form.status === 'confirmé' && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, y: -10 }} 
                        animate={{ opacity: 1, height: 'auto', y: 0 }} 
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="space-y-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      {/* OPTION RAPIDE OU ÉVÉNEMENTS PERSONNALISÉS */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                          À quels moments serez-vous présent(e) ?
                        </label>

                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                          <button
                            type="button"
                            onClick={() => handleToggleAll(true)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                              allEventsSelected 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            Tous les moments
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAll(false)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                              !allEventsSelected 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            Sur-mesure
                          </button>
                        </div>

                        {/* LISTE DES ÉVÉNEMENTS À COCHER */}
                        <div className="space-y-2 pt-1">
                          {/* Dot */}
                          {flags.dot && (
                            <EventCheckbox 
                              icon={Handshake}
                              title="Dot"
                              checked={form.attending_dot}
                              onChange={() => handleToggleEvent('attending_dot')}
                            />
                          )}

                          {/* Mairie */}
                          {flags.civil && (
                            <EventCheckbox 
                              icon={Landmark}
                              title="Mairie"
                              checked={form.attending_civil}
                              onChange={() => handleToggleEvent('attending_civil')}
                            />
                          )}

                          {/* Église (Conditionnelle) */}
                          {flags.religious && (
                            <EventCheckbox 
                              icon={Cross}
                              title="Église"
                              checked={form.attending_church}
                              onChange={() => handleToggleEvent('attending_church')}
                            />
                          )}

                          {/* Réception */}
                          {flags.reception && (
                            <EventCheckbox 
                              icon={GlassWater}
                              title="Réception & Dîner"
                              checked={form.attending_reception}
                              onChange={() => handleToggleEvent('attending_reception')}
                            />
                          )}
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-100 w-full" />

                      {/* NOTES */}
                      <textarea 
                        placeholder="Un petit mot pour nous ? (Allergies, musique...)" 
                        className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-medium outline-none h-24 resize-none focus:ring-2 focus:ring-rose-200 transition-all"
                        value={form.notes}
                        onChange={e => setForm({...form, notes: e.target.value})}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {userInteracted && form.status !== '' && (
                    <motion.button 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      disabled={sending || (!guestId && !isPreview)}
                      className="w-full py-5 rounded-full text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                      style={{ backgroundColor: 'var(--wed-primary)', color: 'var(--wed-on-primary)' }}
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      Valider ma réponse
                    </motion.button>
                  )}
                </AnimatePresence>
              </form>
            ) : (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="text-center py-8 space-y-4"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-md"
                >
                    <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900">C'est noté !</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Merci pour votre réponse, {guestName}.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* FOOTER */}
        <div className="mt-10 text-center px-8">
            <Heart className="w-5 h-5 text-rose-300 mx-auto mb-2 fill-rose-200 animate-pulse" />
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
              Fait avec amour pour le mariage de <br/> {m.partner_1_name} & {m.partner_2_name}
            </p>
            {music.track?.credit && (
              <p className="mt-3 text-[10px] text-slate-400">Musique : {music.track.credit}</p>
            )}
        </div>
      </div>
    </div>
  );
}

// Composant pour les cases à cocher des événements
function EventCheckbox({ icon: Icon, title, checked, onChange }: { icon: any, title: string, checked: boolean, onChange: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onChange}
      className={`w-full p-3.5 rounded-2xl flex items-center justify-between border-2 transition-all ${
        checked 
          ? 'bg-rose-50/50 border-rose-400 text-slate-900 shadow-sm' 
          : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100/60'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={checked ? 'text-rose-500' : 'text-slate-400'} />
        <span className="font-bold text-xs">{title}</span>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
        checked ? 'bg-rose-500 text-white scale-110' : 'border-2 border-slate-200 bg-white'
      }`}>
        {checked && <Check size={14} strokeWidth={3} />}
      </div>
    </motion.button>
  );
}

// Composant Interne pour les items du programme
function ProgramItem({ icon: Icon, title, time, loc, color, maps }: any) {
    const colors: any = {
        rose: "text-rose-500 bg-rose-50",
        blue: "text-blue-600 bg-blue-50",
        neutral: "text-slate-700 bg-slate-100",
        amber: "text-amber-600 bg-amber-50",
        emerald: "text-emerald-700 bg-emerald-50"
    };

    return (
        <motion.div 
            whileHover={{ y: -2 }}
            className="flex items-center justify-between gap-3 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm group transition-all duration-300 hover:border-slate-200 hover:shadow-md"
        >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className={`grid h-11 w-11 place-items-center rounded-full shrink-0 ${colors[color]}`}>
                    <Icon size={19} strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-amber-700">{time || 'Horaire à venir'}</p>
                    <h4 className="mt-0.5 font-display text-[17px] text-ink leading-tight text-balance break-words">{title}</h4>
                    {loc && <p className="mt-0.5 text-xs leading-snug text-slate-500 line-clamp-2 break-words">{loc}</p>}
                </div>
            </div>
            
            {maps && (
                <a 
                  href={maps} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label={`Plan : ${title}`}
                  className="flex min-h-[44px] w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 shadow-sm transition-all duration-300 hover:bg-slate-950 hover:text-white active:scale-95"
                >
                    <MapPin size={15} className="shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Plan</span>
                </a>
            )}
        </motion.div>
    );
}