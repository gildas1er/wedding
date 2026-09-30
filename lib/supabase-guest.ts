// Client Supabase des pages invités (dépôt de photos, livre d'or…).
// Il n'utilise jamais la session du navigateur : même si un marié est connecté sur le même
// appareil, les envois se font en tant que visiteur, comme pour n'importe quel invité
// (les règles de la base autorisent ces dépôts aux visiteurs anonymes).
import { createClient } from '@supabase/supabase-js';

export const guestSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-guest-no-session',
    },
  }
);
