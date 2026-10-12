import type { Metadata } from 'next';
import { publicPage } from '../../lib/seo';

export const metadata: Metadata = publicPage({
  title: 'Créez votre espace mariage gratuit',
  description: "Inscrivez-vous gratuitement : liste d'invités, faire-part en ligne envoyé par WhatsApp, réponses des invités, plan de table, budget et déroulé du Jour J.",
  path: '/register',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
