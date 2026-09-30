import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Les variables d'environnement Supabase sont manquantes !");
}

// Session stockée en cookies (et non plus en localStorage) pour que le serveur
// — proxy.ts, routes API — voie aussi l'utilisateur connecté.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
