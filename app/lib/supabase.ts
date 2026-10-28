import { createBrowserClient } from '@supabase/ssr';
import posthog from 'posthog-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const posthogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Les variables d'environnement Supabase sont manquantes !");
}

// Session stockée en cookies (et non plus en localStorage) pour que le serveur
// — proxy.ts, routes API — voie aussi l'utilisateur connecté.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// L'identité PostHog suit la session Supabase : elle est restaurée au rechargement,
// établie après login/inscription/OAuth et effacée à la déconnexion.
let identifiedUserId: string | null = null;

if (posthogConfigured) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      posthog.reset();
      identifiedUserId = null;
      return;
    }

    const user = session?.user;
    if (!user || identifiedUserId === user.id) return;

    if (identifiedUserId) posthog.reset();

    posthog.identify(user.id, {
      email: user.email,
      name: typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : undefined,
      role: typeof user.user_metadata.role === 'string' ? user.user_metadata.role : undefined,
    });
    identifiedUserId = user.id;
  });
}
