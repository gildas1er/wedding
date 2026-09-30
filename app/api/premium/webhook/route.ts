import { NextRequest, NextResponse } from 'next/server';
import { confirmAndActivate, paymentsConfigured, serviceSupabase, verifyWebhookSignature } from '../../../../lib/premium-server';

// Notifications de GeniusPay (à déclarer dans le tableau de bord GeniusPay : https://<site>/api/premium/webhook)
export async function POST(request: NextRequest) {
  if (!paymentsConfigured()) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const raw = await request.text();
  const ok = verifyWebhookSignature(raw, request.headers.get('x-webhook-timestamp'), request.headers.get('x-webhook-signature'));
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let body: { event?: string; data?: { reference?: string; status?: string } };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const event = request.headers.get('x-webhook-event') || body.event;
  const reference = body.data?.reference;
  if (!reference) return NextResponse.json({ received: true });

  try {
    if (event === 'payment.success') {
      // Le statut est revérifié directement auprès de GeniusPay avant toute activation
      const result = await confirmAndActivate(reference);
      return NextResponse.json({ received: true, result });
    }
    if (['payment.failed', 'payment.cancelled', 'payment.expired', 'payment.refunded'].includes(event ?? '')) {
      await serviceSupabase().from('payments').update({ status: event!.replace('payment.', '') }).eq('reference', reference).neq('status', 'completed');
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Webhook GeniusPay :', e);
    // 500 : GeniusPay renverra la notification plus tard
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}
