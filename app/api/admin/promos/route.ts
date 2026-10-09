import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-server';
import { isValidPromoCode, normalizeCode } from '../../../../lib/promo';

type Body = {
  op: 'save' | 'toggle' | 'delete';
  code?: string;
  label?: string;
  discount_type?: 'percent' | 'amount';
  discount_value?: number;
  valid_until?: string | null; // AAAA-MM-JJ (fin de journée)
  max_uses?: number | null;
  partner_name?: string;
  partner_phone?: string;
  commission_xof?: number;
  active?: boolean;
};

// Codes promo de l'administration (créer, modifier, activer / désactiver, supprimer)
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { db, email } = auth;
  const body = (await request.json().catch(() => ({}))) as Body;
  const code = normalizeCode(body.code ?? '');
  if (!isValidPromoCode(code)) return NextResponse.json({ error: 'Le code doit faire 3 à 24 caractères : lettres, chiffres ou tirets.' }, { status: 400 });

  const log = (action: string, details: Record<string, unknown>) =>
    db.from('admin_actions').insert({ admin_email: email, marriage_id: null, couple: null, action, details: { code, ...details } }).then(() => undefined, () => undefined);

  try {
    if (body.op === 'save') {
      const type = body.discount_type === 'percent' ? 'percent' : 'amount';
      const value = Math.round(Number(body.discount_value) || 0);
      if (value <= 0 || (type === 'percent' && value > 100)) {
        return NextResponse.json({ error: type === 'percent' ? 'La réduction doit être entre 1 et 100 %.' : 'Indiquez le montant de la réduction.' }, { status: 400 });
      }
      // Un code de parrainage existant ne peut pas devenir un code promo
      const { data: clash } = await db.from('marriages').select('id').eq('referral_code', code).maybeSingle();
      if (clash) return NextResponse.json({ error: 'Ce code est déjà le code de parrainage d’un couple. Choisissez-en un autre.' }, { status: 400 });
      const maxUses = body.max_uses ? Math.max(1, Math.round(Number(body.max_uses))) : null;
      const row = {
        code,
        label: body.label?.trim() || null,
        discount_type: type,
        discount_value: value,
        valid_until: body.valid_until ? new Date(`${body.valid_until}T23:59:59`).toISOString() : null,
        max_uses: maxUses,
        partner_name: body.partner_name?.trim() || null,
        partner_phone: body.partner_phone?.trim() || null,
        commission_xof: Math.max(0, Math.round(Number(body.commission_xof) || 0)),
        active: body.active ?? true,
      };
      const { error } = await db.from('promo_codes').upsert(row, { onConflict: 'code' });
      if (error) throw error;
      await log('code_promo', { label: row.label, type, value, until: row.valid_until, max_uses: maxUses, partner: row.partner_name });
    } else if (body.op === 'toggle') {
      const { error } = await db.from('promo_codes').update({ active: Boolean(body.active) }).eq('code', code);
      if (error) throw error;
      await log(body.active ? 'code_active' : 'code_desactive', {});
    } else if (body.op === 'delete') {
      // Un code déjà utilisé reste pour l'historique : on le désactive seulement
      const { count } = await db.from('marriages').select('id', { count: 'exact', head: true }).eq('applied_code', code);
      if (count) {
        await db.from('promo_codes').update({ active: false }).eq('code', code);
        await log('code_desactive', { reason: 'déjà utilisé' });
        return NextResponse.json({ ok: true, kept: true });
      }
      const { error } = await db.from('promo_codes').delete().eq('code', code);
      if (error) throw error;
      await log('code_supprime', {});
    } else {
      return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
    }
  } catch (e) {
    console.error('Codes promo :', e);
    const msg = (e as { message?: string })?.message ?? '';
    return NextResponse.json({ error: /promo_codes/.test(msg) ? 'Lancez la migration « 20261009_19_codes_promo_parrainage.sql » dans Supabase.' : msg || 'L’action a échoué.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
