import { NextResponse } from 'next/server';
import { serviceSupabase } from '../../../../lib/premium-server';
import { deleteSpace } from '../../../../lib/account-server';
import { spaceLifecycle } from '../../../../lib/lifecycle';

export const dynamic = 'force-dynamic';

// Tâche planifiée (vercel.json, chaque nuit) : supprime les espaces 12 mois après le mariage,
// sauf prolongation. Vercel envoie « Authorization: Bearer CRON_SECRET ».
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante.' }, { status: 503 });
  }

  const db = serviceSupabase();
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12);
  // Candidats : mariages d'il y a plus de 12 mois (la prolongation est vérifiée ensuite)
  const { data: candidates, error } = await db
    .from('marriages').select('id, user_id, wedding_date, kept_until')
    .lt('wedding_date', cutoff.toISOString().slice(0, 10))
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const deleted: string[] = [];
  const failed: string[] = [];
  for (const m of candidates ?? []) {
    const { deleteAt } = spaceLifecycle(m, now);
    if (!deleteAt || deleteAt > now) continue;
    try {
      await deleteSpace(db, { marriageId: m.id, userId: m.user_id });
      deleted.push(m.id.slice(0, 8));
    } catch (e) {
      console.error(`Purge ${m.id} :`, e);
      failed.push(m.id.slice(0, 8));
    }
  }
  return NextResponse.json({ deleted, failed });
}
