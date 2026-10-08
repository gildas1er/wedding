import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '../../../utils/supabase/server';
import { safeNextPath } from '../../../lib/safe-redirect';

// Lien des e-mails Supabase au format « token_hash » (modèle d'e-mail personnalisé) :
//   /auth/confirm?token_hash=…&type=recovery&next=/nouveau-mot-de-passe
// Contrairement au lien « code », il fonctionne même ouvert sur un autre appareil que celui de la demande.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const recovery = type === 'recovery';
  const next = safeNextPath(searchParams.get('next'), recovery ? '/nouveau-mot-de-passe' : '/dashboard');

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(recovery ? `${origin}/mot-de-passe-oublie?lien=expire` : `${origin}/login?error=auth_failed`);
}
