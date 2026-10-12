import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/og';

// Plan du site : seulement les pages publiques à référencer
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const now = new Date();
  return [
    { url: `${site}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${site}/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site}/conditions`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${site}/confidentialite`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
