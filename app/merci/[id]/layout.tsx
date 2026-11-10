import type { Metadata } from 'next';
import { coupleName, fetchOgMarriage } from '../../../lib/og';

// Aperçu du lien envoyé sur WhatsApp : « Aya & Konan vous remercient »
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = await fetchOgMarriage(id);
  const couple = coupleName(m);
  const title = couple ? `${couple} vous remercient` : 'Merci d’avoir été là';
  const description = 'Ouvrez votre carte de remerciements.';
  return {
    title: { absolute: title },
    description,
    // Carte personnelle : jamais dans les moteurs de recherche
    robots: { index: false, follow: false },
    openGraph: { type: 'website', title, description, siteName: 'WeddingStudio', locale: 'fr_FR' },
    twitter: { card: 'summary', title, description },
  };
}

export default function MerciLayout({ children }: { children: React.ReactNode }) {
  return children;
}
