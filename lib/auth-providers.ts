// Services de connexion activés dans Supabase (Authentication → Providers), lus depuis l'API publique.
// Évite d'envoyer l'utilisateur vers une erreur brute (« provider is not enabled ») quand un service n'est pas configuré.
export type SocialProvider = 'google' | 'facebook';

export const PROVIDER_LABELS: Record<SocialProvider, string> = { google: 'Google', facebook: 'Facebook' };

export async function fetchEnabledProviders(): Promise<Partial<Record<SocialProvider, boolean>> | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return { google: Boolean(json?.external?.google), facebook: Boolean(json?.external?.facebook) };
  } catch {
    return null; // en cas de doute, on laisse essayer
  }
}
