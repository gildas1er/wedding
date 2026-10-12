import { NextResponse } from 'next/server';
import { serviceSupabase } from '../../../../lib/premium-server';
import { deleteSpace } from '../../../../lib/account-server';
import { DELETE_MONTHS_AFTER_WEDDING, spaceLifecycle } from '../../../../lib/lifecycle';

export const dynamic = 'force-dynamic';
// Durée maximale accordée par Vercel à la tâche ; on s'arrête avant pour finir proprement
export const maxDuration = 60;
const TIME_BUDGET_MS = 45_000;
const BATCH = 50;

// Tâche planifiée (vercel.json, chaque nuit) : supprime les espaces 12 mois après le mariage,
// sauf prolongation en cours. Vercel envoie « Authorization: Bearer CRON_SECRET ».
// Seuls les espaces réellement arrivés au terme sont demandés à la base (les prolongés en sont exclus),
// les plus anciens d'abord, lot après lot jusqu'à épuisement : un espace prolongé ne peut plus en bloquer d'autres.
// Le bilan est noté dans le journal de l'administration dès qu'un espace est supprimé ou qu'une suppression échoue.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante.' }, { status: 503 });
  }

  const db = serviceSupabase();
  const started = Date.now();
  const now = new Date();
  // Mariage au plus tard ce jour-là, il y a 12 mois (même règle que spaceLifecycle)
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cutoff.setUTCMonth(cutoff.getUTCMonth() - DELETE_MONTHS_AFTER_WEDDING);

  const deleted: string[] = [];
  const failed: string[] = [];
  const skip = new Set<string>(); // échecs et cas limites : jamais redemandés pendant cette exécution
  let remaining = false;

  while (true) {
    if (Date.now() - started > TIME_BUDGET_MS) { remaining = true; break; }
    let query = db
      .from('marriages').select('id, user_id, wedding_date, kept_until')
      .lte('wedding_date', cutoff.toISOString().slice(0, 10))
      .or(`kept_until.is.null,kept_until.lte.${now.toISOString()}`)
      .order('wedding_date', { ascending: true })
      .order('id', { ascending: true })
      .limit(BATCH);
    if (skip.size) query = query.not('id', 'in', `(${[...skip].join(',')})`);
    const { data: candidates, error } = await query;
    if (error) {
      console.error('Purge :', error);
      await journal(db, { deleted, failed, error: error.message });
      return NextResponse.json({ error: error.message, deleted, failed }, { status: 500 });
    }
    if (!candidates?.length) break;

    for (const m of candidates) {
      if (Date.now() - started > TIME_BUDGET_MS) { remaining = true; break; }
      // Double vérification avec la règle de l'application avant toute suppression
      const { deleteAt } = spaceLifecycle(m, now);
      if (!deleteAt || deleteAt > now) { skip.add(m.id); continue; }
      try {
        await deleteSpace(db, { marriageId: m.id, userId: m.user_id });
        deleted.push(m.id.slice(0, 8));
      } catch (e) {
        console.error(`Purge ${m.id} :`, e);
        failed.push(m.id.slice(0, 8));
        skip.add(m.id);
      }
    }
    if (remaining) break;
  }

  if (deleted.length || failed.length || remaining) await journal(db, { deleted, failed, remaining });
  return NextResponse.json({ deleted, failed, remaining });
}

// Trace dans le journal de l'administration (onglet Journal)
async function journal(db: ReturnType<typeof serviceSupabase>, details: Record<string, unknown>) {
  const d = details as { deleted?: string[]; failed?: string[] };
  await db.from('admin_actions').insert({
    admin_email: 'tâche automatique',
    marriage_id: null,
    couple: null,
    action: 'purge',
    details: { ...details, deleted_count: d.deleted?.length ?? 0, failed_count: d.failed?.length ?? 0 },
  }).then(() => undefined, () => undefined);
}
