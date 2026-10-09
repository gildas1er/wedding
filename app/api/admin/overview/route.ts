import { NextResponse } from 'next/server';
import { readAll, requireAdmin } from '../../../../lib/admin-server';
import { guestQuota, countPersons } from '../../../../lib/plan';
import { spaceLifecycle } from '../../../../lib/lifecycle';
import { REFERRAL_DISCOUNT_XOF, REFERRAL_REWARD_XOF, type PromoCode } from '../../../../lib/promo';

export const dynamic = 'force-dynamic';

type Marriage = {
  id: string; user_id: string | null; created_at?: string | null;
  partner_1_name?: string | null; partner_2_name?: string | null; wedding_date?: string | null; location_city?: string | null;
  plan?: string | null; premium_until?: string | null; tier?: string | null; guest_limit?: number | null;
  legacy_free_fiches?: boolean | null; kept_until?: string | null; invitation_template?: string | null;
  referral_code?: string | null; referred_by?: string | null; applied_code?: string | null;
  applied_code_used_at?: string | null; referral_reward_paid_at?: string | null;
};
type Payment = { marriage_id: string; amount: number | null; status: string | null; [key: string]: unknown };
type AuthUser = { email?: string; phone?: string; created_at?: string; last_sign_in_at?: string; banned_until?: string; user_metadata?: { phone?: string }; app_metadata?: { provider?: string } };
type Guest = { marriage_id: string; guests_count: number | null; status: string | null };

// Vue d'ensemble de la plateforme : couples, invités, formules, paiements, journal
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { db } = auth;

  try {
    const [marriages, guests, payments] = await Promise.all([
      readAll<Marriage>((a, b) => db.from('marriages').select('*').order('created_at', { ascending: false }).range(a, b)),
      readAll<Guest>((a, b) => db.from('invite').select('marriage_id, guests_count, status').range(a, b)),
      readAll<Payment>((a, b) => db.from('payments').select('*').order('created_at', { ascending: false }).range(a, b)).catch(() => []),
    ]);

    // Comptes de connexion : e-mail, téléphone, dernière connexion, désactivation
    const users = new Map<string, AuthUser>();
    for (let page = 1; page < 50; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      data.users.forEach((u) => users.set(u.id, u as AuthUser));
      if (data.users.length < 1000) break;
    }

    // Codes promo (migration 19) : utilisations payées, en attente, commissions
    const { data: promoRows, error: promoError } = await db.from('promo_codes').select('*').order('created_at', { ascending: false });
    const promoList = (promoRows ?? []) as PromoCode[];
    const promoByCode = new Map(promoList.map((p) => [p.code, p]));
    const promos = promoList.map((p) => {
      const users = marriages.filter((m) => m.applied_code === p.code);
      const used = users.filter((m) => m.applied_code_used_at).length;
      return { ...p, used, pending: users.length - used, commissionDue: used * (p.commission_xof || 0) };
    });
    const names = new Map(marriages.map((m) => [m.id, [m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & ') || 'Sans nom']));
    const referrals = marriages.filter((m) => m.referred_by).map((m) => ({
      id: m.id,
      couple: names.get(m.id),
      parrainId: m.referred_by!,
      parrain: names.get(m.referred_by!) ?? 'Couple supprimé',
      createdAt: m.created_at ?? null,
      paid: Boolean(m.tier) && m.plan === 'premium',
      rewardPaidAt: m.referral_reward_paid_at ?? null,
      reward: REFERRAL_REWARD_XOF,
    }));

    const byMarriage = new Map<string, Guest[]>();
    for (const g of guests) byMarriage.set(g.marriage_id, [...(byMarriage.get(g.marriage_id) ?? []), g]);
    const paidBy = new Map<string, number>();
    for (const p of payments) if (p.status === 'completed') paidBy.set(p.marriage_id, (paidBy.get(p.marriage_id) ?? 0) + (Number(p.amount) || 0));

    const now = new Date();
    const couples = marriages.map((m) => {
      const list = byMarriage.get(m.id) ?? [];
      const quota = guestQuota(m, list);
      const life = spaceLifecycle(m, now);
      const u = m.user_id ? users.get(m.user_id) : null;
      const banned = Boolean(u?.banned_until && new Date(u.banned_until) > now);
      return {
        id: m.id,
        ref: m.id.slice(0, 8),
        userId: m.user_id,
        couple: [m.partner_1_name, m.partner_2_name].filter(Boolean).join(' & ') || 'Sans nom',
        email: u?.email ?? null,
        phone: u?.user_metadata?.phone || u?.phone || null,
        provider: u?.app_metadata?.provider ?? null,
        createdAt: m.created_at ?? u?.created_at ?? null,
        lastSignIn: u?.last_sign_in_at ?? null,
        banned,
        weddingDate: m.wedding_date ?? null,
        city: m.location_city ?? null,
        phase: life.phase,
        deleteAt: life.deleteAt?.toISOString() ?? null,
        plan: m.plan ?? 'free',
        premium: quota.premium,
        tier: m.tier ?? null,
        premiumUntil: m.premium_until ?? null,
        keptUntil: m.kept_until ?? null,
        limit: quota.limit,
        byPersons: quota.byPersons,
        used: quota.used,
        fiches: list.length,
        persons: countPersons(list),
        confirmed: list.filter((g) => g.status === 'confirmé').length,
        declined: list.filter((g) => g.status === 'décliné').length,
        pending: list.filter((g) => !g.status || g.status === 'en_attente').length,
        paid: paidBy.get(m.id) ?? 0,
        template: m.invitation_template ?? 'classique',
        referralCode: m.referral_code ?? null,
        referredBy: m.referred_by ?? null,
        referredByName: m.referred_by ? names.get(m.referred_by) ?? 'Couple supprimé' : null,
        rewardPaidAt: m.referral_reward_paid_at ?? null,
        code: m.applied_code ? (() => {
          const p = promoByCode.get(m.applied_code);
          return {
            code: m.applied_code,
            kind: p ? 'promo' : 'parrainage',
            label: p ? p.label : `Parrainage${m.referred_by ? ` · ${names.get(m.referred_by) ?? ''}` : ''}`,
            discount_type: p ? p.discount_type : 'amount',
            discount_value: p ? p.discount_value : REFERRAL_DISCOUNT_XOF,
            used: Boolean(m.applied_code_used_at),
            valid: p ? p.active && (!p.valid_until || new Date(p.valid_until) >= now) : Boolean(m.referred_by),
          };
        })() : null,
      };
    });

    const { data: actions } = await db.from('admin_actions').select('*').order('created_at', { ascending: false }).limit(60);

    return NextResponse.json({
      generatedAt: now.toISOString(),
      couples,
      payments: payments.slice(0, 100),
      actions: actions ?? [],
      journalReady: actions !== null,
      promos,
      referrals,
      promosReady: !promoError,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Administration :', e);
    return NextResponse.json({ error: 'Impossible de charger les données. Vérifiez les migrations et la clé service.' }, { status: 500 });
  }
}
