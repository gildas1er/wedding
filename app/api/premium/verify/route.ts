import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { confirmAndActivate, paymentsConfigured, serviceSupabase } from '../../../../lib/premium-server';
import { crossSiteRefusal, isSameOrigin } from '../../../../lib/same-origin';

// Au retour de la page de paiement : vérifie le paiement auprès de SasPay (utile si la notification tarde)
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return crossSiteRefusal();
  if (!paymentsConfigured()) return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });

  const { data: marriages } = await supabase.from('marriages').select('id').eq('user_id', user.id);
  const ids = (marriages ?? []).map((m) => m.id);
  if (!ids.length) return NextResponse.json({ status: 'failed' }, { status: 404 });

  // Paiement récent de ce couple : celui du cookie, sinon le dernier en attente
  const cookieRef = request.cookies.get('premium_ref')?.value;
  const query = serviceSupabase().from('payments').select('reference, status').eq('provider', 'saspay').in('marriage_id', ids)
    .order('created_at', { ascending: false }).limit(1);
  const { data: rows } = cookieRef ? await query.eq('reference', cookieRef) : await query.eq('status', 'pending');
  const row = rows?.[0];
  if (!row) return NextResponse.json({ status: 'none' });
  if (row.status === 'completed') return NextResponse.json({ status: 'already' });

  try {
    return NextResponse.json({ status: await confirmAndActivate(row.reference) });
  } catch (e) {
    console.error('Vérification du paiement SasPay :', e);
    return NextResponse.json({ status: 'pending' });
  }
}
