import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-server';
import { deleteSpace } from '../../../../../lib/account-server';
import { TIERS, tierById } from '../../../../../lib/plan';
import { EXTENSION_MONTHS } from '../../../../../lib/lifecycle';

type Body = {
  action: 'tier' | 'free' | 'extend' | 'payment' | 'disable' | 'enable' | 'delete';
  tier?: string;
  limit?: number;
  amount?: number;
  note?: string;
  confirm?: string;
};

const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

// Actions de l'administration sur un couple (toujours notées dans le journal)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { db, email } = auth;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;

  const { data: m } = await db.from('marriages').select('*').eq('id', id).maybeSingle();
  if (!m) return NextResponse.json({ error: 'Couple introuvable.' }, { status: 404 });
  const couple = [m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & ');
  const amount = Math.max(0, Math.round(Number(body.amount) || 0));

  const log = (action: string, details: Record<string, unknown>) =>
    db.from('admin_actions').insert({ admin_email: email, marriage_id: id, couple, action, details }).then(() => undefined, () => undefined);
  const recordPayment = async (label: string) => {
    if (!amount) return;
    await db.from('payments').insert({
      marriage_id: id, couple, provider: 'manuel', reference: `MANUEL-${Date.now()}-${id.slice(0, 4)}`, amount, currency: 'XOF',
      status: 'completed', completed_at: new Date().toISOString(), note: [label, body.note?.trim()].filter(Boolean).join(' · '),
    });
  };
  const wedding = m.wedding_date ? new Date(`${String(m.wedding_date).slice(0, 10)}T00:00:00Z`) : new Date();

  try {
    switch (body.action) {
      case 'tier': {
        const t = tierById(body.tier);
        const custom = body.tier === 'sur_mesure';
        const unlimited = body.tier === 'illimite';
        if (!t && !custom && !unlimited) return NextResponse.json({ error: 'Palier inconnu.' }, { status: 400 });
        const limit = t ? t.max : custom ? Math.round(Number(body.limit) || 0) : null;
        if (custom && (!limit || limit <= TIERS.at(-1)!.max)) return NextResponse.json({ error: `Indiquez une limite de plus de ${TIERS.at(-1)!.max} invités.` }, { status: 400 });
        const until = new Date(Math.max(addMonths(wedding, 1).getTime(), addMonths(new Date(), 1).getTime()));
        const { error } = await db.from('marriages').update({ plan: 'premium', tier: body.tier, guest_limit: limit, premium_until: until.toISOString() }).eq('id', id);
        if (error) throw error;
        await recordPayment(`Palier ${t?.label ?? (custom ? 'Sur mesure' : 'Illimité')}`);
        await log('palier', { tier: body.tier, limit, amount, note: body.note ?? null, until: until.toISOString() });
        break;
      }
      case 'free': {
        const { error } = await db.from('marriages').update({ plan: 'free', tier: null, guest_limit: null, premium_until: null }).eq('id', id);
        if (error) throw error;
        await log('gratuit', { previous: m.tier ?? m.plan, note: body.note ?? null });
        break;
      }
      case 'extend': {
        const base = Math.max(Date.now(), addMonths(wedding, 1).getTime(), m.kept_until ? new Date(m.kept_until).getTime() : 0);
        const keptUntil = addMonths(new Date(base), EXTENSION_MONTHS);
        const { error } = await db.from('marriages').update({ kept_until: keptUntil.toISOString() }).eq('id', id);
        if (error) throw error;
        await recordPayment(`Prolongation ${EXTENSION_MONTHS} mois`);
        await log('prolongation', { until: keptUntil.toISOString(), amount, note: body.note ?? null });
        break;
      }
      case 'payment': {
        if (!amount) return NextResponse.json({ error: 'Indiquez le montant encaissé.' }, { status: 400 });
        await recordPayment('Paiement');
        await log('paiement', { amount, note: body.note ?? null });
        break;
      }
      case 'disable':
      case 'enable': {
        if (!m.user_id) return NextResponse.json({ error: 'Ce couple n’a pas de compte de connexion.' }, { status: 400 });
        // Désactivation : le couple ne peut plus se connecter (les pages de ses invités restent visibles)
        const { error } = await db.auth.admin.updateUserById(m.user_id, { ban_duration: body.action === 'disable' ? '876000h' : 'none' });
        if (error) throw error;
        await log(body.action === 'disable' ? 'desactivation' : 'reactivation', { note: body.note ?? null });
        break;
      }
      case 'delete': {
        if ((body.confirm ?? '').trim().toUpperCase() !== 'SUPPRIMER') return NextResponse.json({ error: 'Tapez SUPPRIMER pour confirmer.' }, { status: 400 });
        await deleteSpace(db, { marriageId: id, userId: m.user_id });
        await log('suppression', { email: null, wedding_date: m.wedding_date, note: body.note ?? null });
        break;
      }
      default:
        return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
    }
  } catch (e) {
    console.error(`Administration (${body.action}) :`, e);
    return NextResponse.json({ error: (e as { message?: string })?.message || 'L’action a échoué.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
