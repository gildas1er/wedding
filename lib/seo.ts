// Référencement : titres, descriptions, adresse officielle (canonical) et indexation de chaque page.
import type { Metadata } from 'next';

export const SITE_NAME = 'WeddingStudio';
export const SITE_DESCRIPTION = "Créez votre faire-part en ligne, envoyez les invitations par WhatsApp, suivez les réponses, faites le plan de table et le budget de votre mariage en Côte d'Ivoire. Gratuit jusqu'à 30 invités.";

// Page publique à référencer : titre, description, adresse officielle et aperçu de lien
export function publicPage({ title, description, path, absoluteTitle = false }: { title: string; description: string; path: string; absoluteTitle?: boolean }): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: SITE_NAME, locale: 'fr_FR', title, description, url: path },
    twitter: { card: 'summary_large_image', title, description },
  };
}

// Page privée ou sans intérêt pour les moteurs : jamais dans les résultats de recherche
// (follow : les liens restent suivis quand la page n'a rien de personnel, ex. connexion)
export function privatePage(title: string, follow = false): Metadata {
  return { title, robots: { index: false, follow, googleBot: { index: false, follow } } };
}
