import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { confirmAndActivate, paymentsConfigured, serviceSupabase } from '../../../../lib/premium-server';

// Au retour de la page de paiement : vérifie le paiement (utile si la notification tarde)
export async function POST(request: NextRequest) {
  if (!paymentsConfigured()) return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'unauthorized' }, { status: 401 });

  const reference = request.cookies.get('premium_ref')?.value;
  const { data: marriage } = await supabase.from('marriages').select('id').eq('user_id', user.id).maybeSingle();
  if (!marriage) return NextResponse.json({ status: 'failed' }, { status: 404 });

  // Référence récente de ce mariage (cookie, sinon dernier paiement en attente)
  const db = serviceSupabase();
  const query = db.from('payments').select('reference').eq('marriage_id', marriage.id).order('created_at', { ascending: false }).limit(1);
  const { data: rows } = reference ? await query.eq('reference', reference) : await query.eq('status', 'pending');
  const ref = rows?.[0]?.reference;
  if (!ref) return NextResponse.json({ status: 'failed' });

  try {
    const status = await confirmAndActivate(ref);
    return NextResponse.json({ status });
  } catch (e) {
    console.error('Vérification du paiement :', e);
    return NextResponse.json({ status: 'pending' });
  }
}
