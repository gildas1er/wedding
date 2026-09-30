import type { Metadata } from 'next';
import { coupleName, fetchOgMarriage } from '../../../lib/og';
import { formatDateFr } from '../../../lib/event-datetime';

// Titre et description de l'aperçu du lien (WhatsApp, Facebook, SMS…)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = await fetchOgMarriage(id);
  const couple = coupleName(m);
  const title = couple ? `${couple} vous invitent` : 'Vous êtes invités';
  const date = m?.wedding_date ? formatDateFr(m.wedding_date) : null;
  const description = [date, 'Découvrez le programme et confirmez votre présence.'].filter(Boolean).join(' · ');
  return {
    title: { absolute: title },
    description,
    // Invitation privée : jamais dans les moteurs de recherche
    robots: { index: false, follow: false },
    openGraph: { type: 'website', title, description, siteName: 'WeddingStudio', locale: 'fr_FR' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function RsvpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
