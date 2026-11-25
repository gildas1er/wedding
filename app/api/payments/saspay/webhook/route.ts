import { NextRequest, NextResponse } from 'next/server';
import { confirmPendingSessions, paymentsConfigured, verifyWebhookSignature } from '../../../../../lib/premium-server';

// Notifications SasPay (déclarées dans le tableau de bord SasPay : https://<site>/api/payments/saspay/webhook).
// La signature est vérifiée, puis chaque paiement en attente est revérifié auprès de SasPay avant toute activation.
export async function POST(request: NextRequest) {
  if (!paymentsConfigured()) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const raw = await request.text();
  const ok = verifyWebhookSignature(raw, request.headers.get('x-webhook-timestamp'), request.headers.get('x-webhook-signature'));
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let body: { event?: string; data?: { id?: string; network?: string; country?: string } };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const event = request.headers.get('x-webhook-event') || body.event;
  if (event === 'webhook.test') return NextResponse.json({ received: true });
  if (!['transaction.success', 'transaction.failed', 'transaction.cancelled'].includes(event ?? '')) return NextResponse.json({ received: true });

  try {
    const results = await confirmPendingSessions({ network: body.data?.network ?? null, transactionId: body.data?.id ?? null });
    return NextResponse.json({ received: true, results });
  } catch (e) {
    console.error('Webhook SasPay :', e);
    // 500 : SasPay renverra la notification plus tard
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}
