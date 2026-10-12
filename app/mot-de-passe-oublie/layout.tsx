import type { Metadata } from 'next';
import { privatePage } from '../../lib/seo';

// Page personnelle ou technique : jamais dans les moteurs de recherche
export const metadata: Metadata = privatePage("Mot de passe oublié", true);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
