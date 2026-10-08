// Paiement du Premium via GeniusPay — côté serveur uniquement (clés secrètes).
// Documentation : https://geniuspay.ci/docs/api
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { PREMIUM_ACCESS_MONTHS_AFTER_WEDDING, PREMIUM_PRICE_XOF } from './plan';

// Adresse de l'API (modifiable pour les tests ; par défaut, l'API officielle)
const API_BASE = process.env.GENIUSPAY_API_BASE || 'https://geniuspay.ci/api/v1/merchant';

export function paymentsConfigured() {
  return Boolean(
    process.env.GENIUSPAY_API_KEY && process.env.GENIUSPAY_API_SECRET &&
    process.env.GENIUSPAY_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Client « service » : seul autorisé à enregistrer les paiements et à activer le Premium
export function serviceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function headers() {
  return {
    'X-API-Key': process.env.GENIUSPAY_API_KEY!,
    'X-API-Secret': process.env.GENIUSPAY_API_SECRET!,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export type GeniusPayment = {
  reference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'expired';
  amount: number;
  currency?: string;
  environment?: string;
  checkout_url?: string;
  payment_url?: string;
  metadata?: Record<string, string>;
};

export async function createCheckout(input: {
  marriageId: string; userId: string; email?: string | null; name?: string; phone?: string | null;
  successUrl: string; errorUrl: string;
}): Promise<GeniusPayment> {
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      amount: PREMIUM_PRICE_XOF,
      currency: 'XOF',
      description: 'WeddingStudio Premium — invités illimités',
      customer: { name: input.name, email: input.email ?? undefined, phone: input.phone ?? undefined, country: 'CI' },
      success_url: input.successUrl,
      error_url: input.errorUrl,
      metadata: { marriage_id: input.marriageId, user_id: input.userId, product: 'premium' },
    }),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success || !json.data?.reference) {
    throw new Error(json?.error?.message || `GeniusPay a refusé la création du paiement (HTTP ${res.status})`);
  }
  return json.data as GeniusPayment;
}

export async function fetchPayment(reference: string): Promise<GeniusPayment | null> {
  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(reference)}`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.success ? (json.data as GeniusPayment) : null;
}

// Signature des notifications : HMAC-SHA256(timestamp + "." + corps JSON, secret du webhook)
export function verifyWebhookSignature(rawBody: string, timestamp: string | null, signature: string | null) {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false; // rejeu > 5 min refusé
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.replace(/^sha256=/, ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Active le Premium après avoir revérifié le paiement auprès de GeniusPay (idempotent)
export async function confirmAndActivate(reference: string): Promise<'activated' | 'already' | 'pending' | 'failed'> {
  const payment = await fetchPayment(reference);
  if (!payment) return 'failed';

  const db = serviceSupabase();
  const { data: row } = await db.from('payments').select('id, marriage_id, status, amount').eq('reference', reference).maybeSingle();
  if (!row) return 'failed'; // paiement inconnu : il doit avoir été créé par notre route checkout

  if (payment.status !== 'completed') {
    if (['failed', 'cancelled', 'expired', 'refunded'].includes(payment.status)) {
      await db.from('payments').update({ status: payment.status, raw: payment as unknown as Record<string, unknown> }).eq('id', row.id);
      return 'failed';
    }
    return 'pending';
  }

  // Paiement de test (sandbox) : accepté seulement si explicitement autorisé (période d'essai)
  if (payment.environment === 'sandbox' && process.env.GENIUSPAY_ALLOW_SANDBOX !== 'true') {
    await db.from('payments').update({ status: 'sandbox_rejected', raw: payment as unknown as Record<string, unknown> }).eq('id', row.id);
    return 'failed';
  }

  // Contrôles : montant, devise et mariage identiques à ce que nous avons demandé
  const marriageMatches = !payment.metadata?.marriage_id || payment.metadata.marriage_id === row.marriage_id;
  if (Number(payment.amount) < row.amount || (payment.currency && payment.currency !== 'XOF') || !marriageMatches) {
    await db.from('payments').update({ status: 'mismatch', raw: payment as unknown as Record<string, unknown> }).eq('id', row.id);
    return 'failed';
  }

  if (row.status === 'completed') return 'already';

  const { data: marriage } = await db.from('marriages').select('wedding_date').eq('id', row.marriage_id).single();
  const base = marriage?.wedding_date ? new Date(marriage.wedding_date) : new Date();
  const until = new Date(Math.max(base.getTime(), Date.now()));
  until.setMonth(until.getMonth() + PREMIUM_ACCESS_MONTHS_AFTER_WEDDING);

  await db.from('payments').update({ status: 'completed', completed_at: new Date().toISOString(), environment: payment.environment ?? null, raw: payment as unknown as Record<string, unknown> }).eq('id', row.id);
  // Paiement en ligne : premier palier (Intime). Les autres paliers s'activent pour l'instant par contact.
  const { error } = await db.from('marriages').update({ plan: 'premium', tier: 'intime', guest_limit: 100, premium_until: until.toISOString() }).eq('id', row.marriage_id);
  if (error) throw new Error(`Activation du Premium impossible : ${error.message}`);
  return 'activated';
}
