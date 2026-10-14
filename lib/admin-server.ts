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

// Lecture complète d'une table, par pages de 1 000 lignes. La première page donne le total
// (count: 'exact' dans la requête) : les suivantes partent alors en parallèle, 6 à la fois,
// au lieu de s'enchaîner. La requête doit avoir un ordre stable (order) pour que les pages ne se chevauchent pas.
const PAGE = 1000;
export async function readAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null; count?: number | null }>) {
  const first = await fetchPage(0, PAGE - 1);
  if (first.error) throw new Error(first.error.message);
  const rows: T[] = [...(first.data ?? [])];
  if (rows.length < PAGE) return rows;

  if (typeof first.count !== 'number') {
    // Total inconnu : pages l'une après l'autre
    for (let from = PAGE; ; from += PAGE) {
      const { data, error } = await fetchPage(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) return rows;
    }
  }

  const starts: number[] = [];
  for (let from = PAGE; from < first.count; from += PAGE) starts.push(from);
  for (let i = 0; i < starts.length; i += 6) {
    const pages = await Promise.all(starts.slice(i, i + 6).map((from) => fetchPage(from, from + PAGE - 1)));
    for (const { data, error } of pages) {
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []));
    }
  }
  return rows;
}
