// Administration de la plateforme : accès réservé aux adresses de ADMIN_EMAILS (variable Vercel,
// séparées par des virgules). Toutes les opérations passent par le serveur avec la clé service.
import { NextResponse } from 'next/server';
import { createClient as createSessionClient } from '../utils/supabase/server';
import { serviceSupabase } from './premium-server';

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdmin() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!user || !email) return { error: NextResponse.json({ error: 'Connectez-vous pour accéder à l’administration.' }, { status: 401 }) };
  if (!adminEmails().includes(email)) return { error: NextResponse.json({ error: 'Accès réservé à l’administration.' }, { status: 403 }) };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante sur le serveur : ajoutez-la dans Vercel.' }, { status: 503 }) };
  }
  return { email, db: serviceSupabase() };
}

// Lecture complète d'une table (pagination par 1 000 lignes)
export async function readAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}
