import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-server';
import { crossSiteRefusal, isSameOrigin } from '../../../../../lib/same-origin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Suppression d'un paiement (enregistré par erreur, en double, test…). Le palier du couple ne change pas.
// Le paiement supprimé est recopié dans le journal pour garder une trace.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { db, email } = auth;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== 'delete' || !UUID.test(id)) return NextResponse.json({ error: 'Demande invalide.' }, { status: 400 });

  const { data: p } = await db.from('payments').select('*').eq('id', id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Paiement introuvable (déjà supprimé ?).' }, { status: 404 });

  const { error } = await db.from('payments').delete().eq('id', id);
  if (error) {
    console.error('Suppression du paiement :', error);
    return NextResponse.json({ error: 'Le paiement n’a pas pu être supprimé.' }, { status: 500 });
  }

  await db.from('admin_actions').insert({
    admin_email: email, marriage_id: p.marriage_id, couple: p.couple ?? null, action: 'paiement_supprime',
    details: { amount: p.amount, provider: p.provider, reference: p.reference, status: p.status, note: p.note ?? null, paid_at: p.completed_at ?? p.created_at },
  }).then(() => undefined, () => undefined);

  return NextResponse.json({ ok: true });
}
