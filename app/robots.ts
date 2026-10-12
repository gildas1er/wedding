import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/og';

// robots.txt : les moteurs explorent le site public ; l'espace des mariés, l'administration et les routes
// techniques ne leur servent à rien. Les pages privées publiques (invitations, photos, livre d'or, table)
// restent explorables pour que les moteurs y lisent leur consigne « noindex » (ne pas les bloquer ici).
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/api/', '/auth/'] }],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
