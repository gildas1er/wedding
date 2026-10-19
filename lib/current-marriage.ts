// Espace des mariés : compte connecté et fiche du mariage, lus vite.
// - Le compte vient de la session gardée par le navigateur (aucun aller-retour réseau).
//   La sécurité ne change pas : proxy.ts vérifie le compte auprès de Supabase avant d'ouvrir
//   /dashboard, et la base (RLS) ne renvoie que les données du couple.
// - La fiche du mariage est demandée au même moment par le menu (DashboardShell) et par la page :
//   une seule lecture est faite et partagée pendant 2 secondes.
import { supabase } from '../app/lib/supabase';

export async function getSessionUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return { data: { user: session?.user ?? null } };
}

const selectMarriage = (userId: string) =>
  supabase.from('marriages').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle();

// Couple connecté sans fiche (création à l'inscription échouée) : la base la crée aussitôt
// (fonction ensure_my_marriage, migration 30). Sans la migration, on garde le résultat vide.
async function readMarriage(userId: string) {
  const res = await selectMarriage(userId);
  if (res.data || res.error) return res;
  const { data: created, error } = await supabase.rpc('ensure_my_marriage');
  if (error || !Array.isArray(created) || !created[0]) return res;
  return { ...res, data: created[0] as typeof res.data };
}

type MarriageResult = Awaited<ReturnType<typeof readMarriage>>;
let shared: { userId: string; at: number; promise: Promise<MarriageResult> } | null = null;
const SHARE_MS = 2000;

export function loadMarriage(userId: string): Promise<MarriageResult> {
  const now = Date.now();
  if (shared && shared.userId === userId && now - shared.at < SHARE_MS) return shared.promise;
  const promise = Promise.resolve(readMarriage(userId));
  shared = { userId, at: now, promise };
  promise.then((r) => { if (r.error && shared?.promise === promise) shared = null; }, () => { if (shared?.promise === promise) shared = null; });
  return promise;
}

// Après une modification de la fiche : la prochaine lecture repart de la base
export function forgetMarriage() {
  shared = null;
}
