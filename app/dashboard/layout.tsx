import type { Metadata } from 'next';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { privatePage } from '../../lib/seo';

// Espace des mariés : jamais dans les moteurs de recherche
export const metadata: Metadata = privatePage('Espace des mariés');

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
