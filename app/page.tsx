import type { Metadata } from 'next';
import LandingPage from '../components/landing/LandingPage';
import { getSiteUrl } from '../lib/og';
import { SITE_DESCRIPTION, SITE_NAME, publicPage } from '../lib/seo';
import { PREMIUM_CONTACT, TIERS } from '../lib/plan';

export const metadata: Metadata = publicPage({
  title: "Faire-part en ligne et organisation de mariage en Côte d'Ivoire | WeddingStudio",
  description: SITE_DESCRIPTION,
  path: '/',
  absoluteTitle: true,
});

// Données structurées (schema.org) : la marque, le site et l'application, lues par Google
function structuredData() {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site}/#organisation`,
        name: SITE_NAME,
        url: site,
        logo: `${site}/apple-icon`,
        areaServed: { '@type': 'Country', name: "Côte d'Ivoire" },
        contactPoint: { '@type': 'ContactPoint', telephone: PREMIUM_CONTACT.phone, contactType: 'customer service', availableLanguage: 'French', areaServed: 'CI' },
      },
      { '@type': 'WebSite', '@id': `${site}/#site`, url: site, name: SITE_NAME, inLanguage: 'fr', publisher: { '@id': `${site}/#organisation` } },
      {
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: site,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web, Android, iOS',
        inLanguage: 'fr',
        description: SITE_DESCRIPTION,
        offers: { '@type': 'AggregateOffer', priceCurrency: 'XOF', lowPrice: 0, highPrice: Math.max(...TIERS.map((t) => t.price)), offerCount: TIERS.length + 1 },
        publisher: { '@id': `${site}/#organisation` },
      },
    ],
  };
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()).replace(/</g, '\\u003c') }} />
      <LandingPage />
    </>
  );
}
