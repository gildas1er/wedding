// Copie-colle ce bloc dans app/auth/callback/route.ts
import { createClient } from '../../../utils/supabase/server'; // On remonte de 3 niveaux
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // En cas d'erreur, retour au login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}