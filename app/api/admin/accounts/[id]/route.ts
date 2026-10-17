import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-server';
import { deleteSpace } from '../../../../../lib/account-server';
import { crossSiteRefusal, isSameOrigin } from '../../../../../lib/same-origin';

type Body = { action: 'create_marriage' | 'delete' | 'delete_profile'; confirm?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Actions de l'administration sur un compte sans mariage (toujours notées dans le journal)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { db, email: adminEmail } = auth;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as Body;

  const log = (action: string, marriageId: string | null, couple: string | null, details: Record<string, unknown>) =>
    db.from('admin_actions').insert({ admin_email: adminEmail, marriage_id: marriageId, couple, action, details }).then(() => undefined, () => undefined);

  try {
    // Ancienne ligne « profiles » dont le compte n'existe plus
    if (body.action === 'delete_profile') {
      const { data: still } = await db.auth.admin.getUserById(id);
      if (still?.user) return NextResponse.json({ error: 'Ce compte existe encore : utilisez « Supprimer le compte ».' }, { status: 400 });
      const { error } = await db.from('profiles').delete().eq('id', id);
      if (error) throw error;
      await log('profil_efface', null, null, { profile_id: id });
      return NextResponse.json({ ok: true });
    }

    const { data: found, error: userError } = await db.auth.admin.getUserById(id);
    const user = found?.user;
    if (userError || !user) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });
    const { data: existing } = await db.from('marriages').select('id').eq('user_id', id).limit(1);
    if (existing?.length) return NextResponse.json({ error: 'Ce compte a déjà une fiche mariage : il apparaît dans « Couples ».' }, { status: 400 });
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

    switch (body.action) {
      case 'create_marriage': {
        // Même fiche qu'à l'inscription (fonction create_marriage_for_new_user), avec ce que le couple a saisi
        const p1 = clean(meta.partner_name_1) || clean(meta.full_name) || 'Partenaire 1';
        const p2 = clean(meta.partner_name_2) || 'Partenaire 2';
        const date = /^\d{4}-\d{2}-\d{2}$/.test(clean(meta.wedding_date)) ? clean(meta.wedding_date)
          : new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
        const { data: created, error } = await db.from('marriages').insert({
          user_id: id, partner_1_name: p1, partner_2_name: p2, wedding_date: date, location_city: 'À définir',
          couple_slug: `${slug(p1)}-${slug(p2)}-${Math.floor(1000 + Math.random() * 9000)}`,
        }).select('id').single();
        if (error) throw error;
        await log('fiche_creee', created.id, `${p1} & ${p2}`, { email: user.email ?? null });
        return NextResponse.json({ ok: true, marriageId: created.id });
      }
      case 'delete': {
        if ((body.confirm ?? '').trim().toUpperCase() !== 'SUPPRIMER') return NextResponse.json({ error: 'Confirmation manquante.' }, { status: 400 });
        // Un compte administrateur ne se supprime pas d'ici (évite de s'enlever l'accès par erreur)
        if (user.app_metadata?.admin === true || (user.email && user.email.toLowerCase() === adminEmail)) {
          return NextResponse.json({ error: 'Un compte administrateur ne peut pas être supprimé depuis l’administration.' }, { status: 400 });
        }
        await deleteSpace(db, { marriageId: null, userId: id });
        await log('compte_supprime', null, null, { email: user.email ?? null });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
    }
  } catch (e) {
    console.error(`Administration, compte (${body.action}) :`, e);
    return NextResponse.json({ error: (e as { message?: string })?.message || 'L’action a échoué.' }, { status: 500 });
  }
}
