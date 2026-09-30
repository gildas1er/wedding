import { NextRequest, NextResponse } from 'next/server';
import {
  GALLERY_COOKIE, GALLERY_COOKIE_MAX_AGE,
  checkGalleryPassword, createGalleryToken, isGalleryConfigured,
} from '@/lib/gallery-auth';

export async function POST(request: NextRequest) {
  if (!isGalleryConfigured()) {
    return NextResponse.json({ error: "La galerie n'est pas encore configurée." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!checkGalleryPassword(password)) {
    // Ralentit les essais de mots de passe en série
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(GALLERY_COOKIE, createGalleryToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: GALLERY_COOKIE_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(GALLERY_COOKIE);
  return response;
}
