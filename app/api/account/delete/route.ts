import { NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { serviceSupabase } from '../../../../lib/premium-server';
import { deleteSpace } from '../../../../lib/account-server';

// Suppression définitive du compte du couple connecté (espace, invités, fichiers, compte de connexion)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== 'SUPPRIMER') {
    return NextResponse.json({ error: 'Tapez SUPPRIMER pour confirmer.' }, { status: 400 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "La suppression n'est pas encore disponible. Contactez-nous pour supprimer votre compte." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Connectez-vous pour continuer.' }, { status: 401 });

  const db = serviceSupabase();
  const { data: marriage } = await db.from('marriages').select('id').eq('user_id', user.id).maybeSingle();
  try {
    await deleteSpace(db, { marriageId: marriage?.id ?? null, userId: user.id });
  } catch (e) {
    console.error('Suppression du compte impossible :', e);
    return NextResponse.json({ error: 'La suppression a échoué. Réessayez ou contactez-nous.' }, { status: 500 });
  }
  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ deleted: true });
}
