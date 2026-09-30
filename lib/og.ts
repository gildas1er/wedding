// Aperçus de liens (WhatsApp, Facebook…) : utilitaires côté serveur uniquement.
import { createClient } from '@supabase/supabase-js';

// Adresse publique du site, pour les URL absolues exigées par les aperçus
export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export type OgMarriage = {
  partner_1_name?: string | null;
  partner_2_name?: string | null;
  wedding_date?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  invitation_text?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mêmes informations publiques que la page RSVP (fonction get_rsvp_invitation)
export async function fetchOgMarriage(id: string): Promise<OgMarriage | null> {
  if (!UUID_RE.test(id)) return null;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase.rpc('get_rsvp_invitation', { p_marriage_id: id });
    return (data?.marriage as OgMarriage) ?? null;
  } catch {
    return null;
  }
}

export function coupleName(m: OgMarriage | null) {
  return [m?.partner_1_name, m?.partner_2_name].filter(Boolean).join(' & ');
}

// Police Google au format TTF (seul format lu par le moteur d'images), limitée aux caractères utiles
export async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}
