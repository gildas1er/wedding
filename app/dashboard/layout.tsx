"use client";

import { usePathname } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Le RSVP est ouvert par les invités : pas de menu des mariés
  if (pathname?.startsWith('/dashboard/rsvp')) return <>{children}</>;

  return <DashboardShell>{children}</DashboardShell>;
}
