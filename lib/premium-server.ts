// Paiement des paliers via SasPay — côté serveur uniquement (clés secrètes).
// Documentation : https://docs.saspay.me
// Parcours : le serveur calcule le prix (palier, montée de palier, offre de lancement ou code), crée une page de
// paiement SasPay (checkout session), puis active le palier quand SasPay confirme. Le statut et le montant sont
// toujours revérifiés auprès de SasPay avant l'activation : une notification seule ne suffit jamais.
// Variables Vercel : SASPAY_SECRET_KEY, SASPAY_API_URL, SASPAY_WEBHOOK_SECRET (+ SUPABASE_SERVICE_ROLE_KEY).
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { PREMIUM_ACCESS_MONTHS_AFTER_WEDDING, TIERS, tierById, upgradePrice, isPremium, type TierId } from './plan';
import { bestReduction, isFirstPurchase, launchOfferActive } from './launch-offer';
import { activeCode, type AppliedCode } from './promo';

const API_BASE = (process.env.SASPAY_API_URL || 'https://api.saspay.me/api/v1').replace(/\/+$/, '');

export function paymentsConfigured() {
  return Boolean(process.env.SASPAY_SECRET_KEY && process.env.SASPAY_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Mode test : l'adresse de l'API (et non la clé) décide de l'environnement, d'après la documentation SasPay
export const saspayEnvironment = () => (/sandbox/i.test(API_BASE) ? 'sandbox' : 'live');

// Client « service » : seul autorisé à enregistrer les paiements et à activer un palier
export function serviceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function saspay<T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Bearer ${process.env.SASPAY_SECRET_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const msg = json?.error?.message ?? json?.message ?? `HTTP ${res.status}`;
    throw new Error(`SasPay ${path} : ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  // Réponses enveloppées ({ success, data }) ou directes
  return (json?.data ?? json) as T;
}

/* ─────────── Prix ─────────── */

type MarriageForPrice = { plan?: string | null; premium_until?: string | null; tier?: string | null; guest_limit?: number | null };

// Prix à payer pour un palier, recalculé ici (jamais repris du navigateur)
export function priceFor(m: MarriageForPrice, target: TierId, code: AppliedCode | null) {
  const t = tierById(target);
  if (!t) return { error: 'Palier inconnu.' } as const;
  const premium = isPremium(m);
  if (premium && (m.guest_limit === null || m.guest_limit === undefined)) return { error: 'Votre formule est déjà illimitée.' } as const;
  const current = premium ? tierById(m.tier) : undefined;
  if (premium && !current) return { error: 'Votre formule actuelle ne se paie pas en ligne : contactez-nous.' } as const;
  if (current && t.max <= current.max) return { error: 'Choisissez un palier supérieur au vôtre.' } as const;
  const base = current ? upgradePrice(current.id, t.id) : t.price;
  const launch = launchOfferActive() && isFirstPurchase(m);
  const best = bestReduction(base, { launch, code: activeCode(code) });
  const amount = base - (best?.discount ?? 0);
  if (amount <= 0) return { error: 'Ce palier ne se paie pas en ligne : contactez-nous.' } as const;
  return {
    tier: t, base, amount,
    launch: best?.kind === 'launch',
    promoCode: best?.kind === 'code' ? best.code : null,
    upgradeFrom: current?.id ?? null,
  } as const;
}

/* ─────────── Page de paiement ─────────── */

type CheckoutSession = { id: string; checkout_url: string; status: string };

export async function createCheckout(input: {
  amount: number; description: string; customerName: string; customerEmail: string; customerPhone?: string | null;
  returnUrl: string; metadata: Record<string, string>;
}) {
  return saspay<CheckoutSession>('/checkout-sessions/', {
    method: 'POST',
    body: {
      amount: input.amount.toFixed(2),
      currency: 'XOF',
      description: input.description,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      ...(input.customerPhone ? { customer_phone: input.customerPhone } : {}),
      return_url: input.returnUrl,
      metadata: input.metadata,
      // Frais à la charge de WeddingStudio : le couple paie le prix affiché
      fee_charge_mode: 'DEDUCTED',
      expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    },
  });
}

type SessionStatus = { id: string; status: string; transaction_id?: string | null; transaction_status?: string | null; transaction_reference?: string | null };
type Transaction = {
  id: string; status: string; requested_amount?: string; net_amount?: string; currency?: string;
  client_fee?: string; gateway_fee?: string; platform_fee?: string; debited_amount?: string; fee_charge_mode?: string;
};

const sessionStatus = (id: string) => saspay<SessionStatus>(`/checkout-sessions/${encodeURIComponent(id)}/status/`);
const verifyTransaction = (id: string) => saspay<Transaction>(`/payments/${encodeURIComponent(id)}/verify/`);

// Signature des notifications : HMAC-SHA256 hexadécimal de « timestamp.corps brut », refusée au-delà de 5 minutes
export function verifyWebhookSignature(rawBody: string, timestamp: string | null, signature: string | null) {
  const secret = process.env.SASPAY_WEBHOOK_SECRET;
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim().replace(/^sha256=/, '').toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ─────────── Activation ─────────── */

type PaymentRow = { id: string; marriage_id: string; reference: string; status: string; amount: number; tier: string | null; promo_code: string | null; environment: string | null };

// Vérifie une page de paiement auprès de SasPay et active le palier si elle est payée (sans effet si déjà fait)
export async function confirmAndActivate(sessionId: string, hint?: { network?: string | null; transactionId?: string | null }): Promise<'activated' | 'already' | 'pending' | 'failed'> {
  const db = serviceSupabase();
  const { data: row } = await db.from('payments')
    .select('id, marriage_id, reference, status, amount, tier, promo_code, environment')
    .eq('provider', 'saspay').eq('reference', sessionId).maybeSingle<PaymentRow>();
  if (!row) return 'failed'; // inconnu : seules nos propres pages de paiement comptent
  if (row.status === 'completed') return 'already';
  // Une page créée en mode test n'est jamais validée par le mode réel (et inversement)
  if (row.environment && row.environment !== saspayEnvironment()) return 'failed';

  const session = await sessionStatus(sessionId);
  const sStatus = String(session.status ?? '').toUpperCase();
  if (sStatus === 'EXPIRED' || sStatus === 'CANCELLED') {
    await db.from('payments').update({ status: sStatus.toLowerCase(), raw: session }).eq('id', row.id).neq('status', 'completed');
    return 'failed';
  }
  if (sStatus !== 'PAID' || !session.transaction_id) return 'pending';

  const tx = await verifyTransaction(session.transaction_id);
  if (String(tx.status).toUpperCase() !== 'SUCCESS') return String(tx.status).toUpperCase() === 'FAILED' ? 'failed' : 'pending';
  // Contrôles : montant demandé et devise identiques à ce que notre serveur a fixé
  if (Number(tx.requested_amount) < row.amount || (tx.currency && tx.currency !== 'XOF')) {
    await db.from('payments').update({ status: 'mismatch', raw: { session, tx } }).eq('id', row.id);
    return 'failed';
  }

  const net = Number(tx.net_amount);
  const fee = Number.isFinite(net) ? Math.max(0, Math.round(Number(tx.requested_amount) - net)) : null;
  // Réservation du paiement : un seul appel (notification ou retour du couple) peut activer
  const { data: claimed } = await db.from('payments').update({
    status: 'completed', completed_at: new Date().toISOString(), fee,
    method: hint?.network && hint.transactionId === session.transaction_id ? hint.network : null, raw: { session, tx },
  }).eq('id', row.id).neq('status', 'completed').select('id');
  if (!claimed?.length) return 'already';

  await activateTier(db, row);
  return 'activated';
}

async function activateTier(db: ReturnType<typeof serviceSupabase>, row: PaymentRow) {
  const paid = tierById(row.tier) ?? [...TIERS].reverse().find((t) => row.amount >= t.price) ?? TIERS[0];
  const { data: m } = await db.from('marriages')
    .select('wedding_date, plan, tier, guest_limit, premium_until, applied_code, applied_code_used_at').eq('id', row.marriage_id).single();
  const base = m?.wedding_date ? new Date(m.wedding_date) : new Date();
  const until = new Date(Math.max(base.getTime(), Date.now()));
  until.setMonth(until.getMonth() + PREMIUM_ACCESS_MONTHS_AFTER_WEDDING);
  const currentUntil = m?.premium_until ? new Date(m.premium_until) : null;
  const premiumUntil = currentUntil && currentUntil > until ? currentUntil : until; // l'accès n'est jamais raccourci
  // Jamais de rétrogradation : une formule plus grande (ou illimitée) est gardée
  const stillActive = m?.plan === 'premium' && (!currentUntil || currentUntil > new Date());
  const currentMax = m?.guest_limit === null || m?.guest_limit === undefined ? Infinity : (tierById(m.tier)?.max ?? m.guest_limit);
  const keep = stillActive && paid.max <= currentMax;
  const codeUsed = row.promo_code && m?.applied_code === row.promo_code && !m?.applied_code_used_at;
  const { error } = await db.from('marriages').update({
    ...(keep ? { premium_until: currentUntil ? premiumUntil.toISOString() : null } : { plan: 'premium', tier: paid.id, guest_limit: paid.max, premium_until: premiumUntil.toISOString() }),
    ...(codeUsed ? { applied_code_used_at: new Date().toISOString() } : {}),
  }).eq('id', row.marriage_id);
  if (error) throw new Error(`Activation du palier impossible : ${error.message}`);
  await db.from('admin_actions').insert({
    admin_email: 'saspay', marriage_id: row.marriage_id, action: 'paiement_en_ligne',
    details: { tier: paid.id, amount: row.amount, reference: row.reference, code: row.promo_code, environment: row.environment },
  }).then(() => undefined, () => undefined);
}

// Notification SasPay : elle ne contient pas l'identifiant de notre page de paiement.
// On revérifie donc nos pages en attente récentes (peu nombreuses) auprès de SasPay.
export async function confirmPendingSessions(hint?: { network?: string | null; transactionId?: string | null }) {
  const db = serviceSupabase();
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data: rows } = await db.from('payments').select('reference')
    .eq('provider', 'saspay').eq('status', 'pending').gte('created_at', since)
    .order('created_at', { ascending: false }).limit(25);
  const results: string[] = [];
  for (const r of rows ?? []) {
    try { results.push(await confirmAndActivate(r.reference, hint)); } catch (e) { console.error('Vérification SasPay :', e); }
  }
  return results;
}
