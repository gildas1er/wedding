// Administration de la plateforme. Un compte est administrateur s'il a le marqueur « admin »
// dans ses métadonnées « app » (app_metadata) : seul le serveur peut les écrire, jamais l'utilisateur.
// Le marqueur se donne dans Supabase avec : select public.set_admin('adresse@exemple.com');  (migration 22)
// ADMIN_EMAILS (variable Vercel, adresses séparées par des virgules) reste une liste d'autorisation
// supplémentaire : si elle est remplie, l'adresse doit aussi y figurer.
// L'e-mail seul ne suffit pas : la confirmation des e-mails étant facultative dans Supabase,
// n'importe qui pourrait créer un compte avec une adresse d'administrateur pas encore inscrite.
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient as createSessionClient } from '../utils/supabase/server';
import { serviceSupabase } from './premium-server';

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export const hasAdminFlag = (user: Pick<User, 'app_metadata'> | null | undefined) => user?.app_metadata?.admin === true;

export async function requireAdmin() {
  const session = await createSessionClient();
  // getUser() relit le compte auprès de Supabase : le marqueur est toujours à jour
  const { data: { user } } = await session.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!user || !email) return { error: NextResponse.json({ error: 'Connectez-vous pour accéder à l’administration.' }, { status: 401 }) };
  const listed = adminEmails();
  if (listed.length && !listed.includes(email)) return { error: NextResponse.json({ error: 'Accès réservé à l’administration.' }, { status: 403 }) };
  if (!hasAdminFlag(user)) {
    return { error: NextResponse.json({ error: listed.length
      ? 'L’accès administrateur n’est pas encore activé pour ce compte. Dans Supabase (SQL Editor), lancez : select public.set_admin(\'votre adresse\');'
      : 'Accès réservé à l’administration.' }, { status: 403 }) };
  }
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
