// Les actions sensibles (suppression de compte, administration, paiement) n'acceptent que les demandes
// venues du site lui-même : protection supplémentaire contre un autre site qui tenterait d'agir avec
// la session du couple (en plus des cookies SameSite). Audit de sécurité du 12 octobre 2026, point 10.3.
import { NextResponse } from 'next/server';

export function isSameOrigin(request: Request) {
  // Indication fournie par les navigateurs récents
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  // Origine de la page qui envoie la demande, comparée à l'adresse du site
  const origin = request.headers.get('origin');
  if (!origin) return true; // pas d'origine (outil hors navigateur) : la session reste exigée par la route
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const crossSiteRefusal = () =>
  NextResponse.json({ error: 'Demande refusée : elle ne vient pas du site WeddingStudio.' }, { status: 403 });
