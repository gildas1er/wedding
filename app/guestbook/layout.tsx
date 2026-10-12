import type { Metadata } from 'next';
import { privatePage } from '../../lib/seo';

// Page personnelle ou technique : jamais dans les moteurs de recherche
export const metadata: Metadata = privatePage("Livre d'or");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
