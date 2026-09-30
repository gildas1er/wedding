// Accès à la galerie des mariés : vérifié uniquement côté serveur.
// Ne jamais importer ce fichier depuis un composant "use client".
import { createHmac, createHash, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const GALLERY_COOKIE = 'gallery_access';
export const GALLERY_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

function getSecret() {
  const password = process.env.GALLERY_PASSWORD;
  if (!password) return null;
  // Le jeton dépend du mot de passe : le changer invalide tous les accès existants
  return `${process.env.GALLERY_SECRET ?? ''}:${password}`;
}

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isGalleryConfigured() {
  return Boolean(process.env.GALLERY_PASSWORD);
}

export function checkGalleryPassword(input: string) {
  const password = process.env.GALLERY_PASSWORD;
  if (!password) return false;
  return safeEqual(input, password);
}

export function createGalleryToken() {
  const secret = getSecret();
  if (!secret) throw new Error('GALLERY_PASSWORD manquant');
  return createHmac('sha256', secret).update('gallery-access-v1').digest('hex');
}

export function hasGalleryAccess(request: NextRequest) {
  const token = request.cookies.get(GALLERY_COOKIE)?.value;
  if (!token || !isGalleryConfigured()) return false;
  return safeEqual(token, createGalleryToken());
}
