"use client";
// Pages invités (table, photos, livre d'or) : prénoms et palette du mariage, lus via la fonction publique.
import { useEffect, useState, type CSSProperties } from 'react';
import { supabase } from '../app/lib/supabase';
import { rsvpThemeStyle } from './palettes';

export type PublicMarriage = {
  id: string;
  partner_1_name?: string | null;
  partner_2_name?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  wedding_date?: string | null;
  space_phase?: string | null; // 'souvenir' : le mariage a eu lieu, les envois sont clos (migration 13)
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_WAIT_MS = 2500;

// marriageId : undefined = pas encore connu (lu dans l'URL côté navigateur), null = absent
export function usePublicMarriage(marriageId: string | null | undefined) {
  const [marriage, setMarriage] = useState<PublicMarriage | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Pas d'identifiant valide : rien à charger, la page s'affiche avec la palette par défaut
  const nothingToLoad = marriageId !== undefined && (!marriageId || !UUID_RE.test(marriageId));

  useEffect(() => {
    if (marriageId === undefined || nothingToLoad) return;
    let cancelled = false;
    const finish = (m: PublicMarriage | null) => { if (!cancelled) { setMarriage(m); setLoaded(true); } };

    // Ne bloque jamais l'affichage si le réseau est lent
    const timer = setTimeout(() => { if (!cancelled) setLoaded(true); }, MAX_WAIT_MS);
    supabase.rpc('get_rsvp_invitation', { p_marriage_id: marriageId })
      .then(({ data }) => finish(data?.marriage ?? null), () => finish(null));
    return () => { cancelled = true; clearTimeout(timer); };
  }, [marriageId, nothingToLoad]);

  const coupleNames = [marriage?.partner_1_name, marriage?.partner_2_name].filter(Boolean).join(' & ');
  const themeStyle: CSSProperties = rsvpThemeStyle(marriage?.primary_color, marriage?.accent_color);

  return {
    marriage,
    coupleNames,
    themeStyle,
    // Fondu d'apparition une fois la palette connue (évite un flash aux couleurs par défaut)
    revealClass: loaded || nothingToLoad ? 'opacity-100 transition-opacity duration-500' : 'opacity-0',
  };
}
