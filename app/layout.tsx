import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "../lib/og";

// Titres : serif éditoriale (avec italique pour le « & » des couples)
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// Interface : sans-serif lisible et moderne
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Adresse absolue des images d'aperçu (WhatsApp, Facebook…)
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "WeddingStudio",
    template: "%s | WeddingStudio",
  },
  description: "Invités, faire-part, plan de table et budget : organisez le mariage de vos rêves en Côte d'Ivoire.",
  openGraph: {
    type: "website",
    siteName: "WeddingStudio",
    locale: "fr_FR",
    title: "WeddingStudio",
    description: "Invités, faire-part, plan de table et budget : organisez le mariage de vos rêves en Côte d'Ivoire.",
  },
  twitter: { card: "summary_large_image" },
  // Preuve de propriété pour Google Search Console et Bing Webmaster Tools (balise HTML) :
  // copier le code « content » fourni par l'outil dans la variable Vercel correspondante, puis redéployer
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
