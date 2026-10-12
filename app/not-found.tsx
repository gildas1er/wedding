import type { Metadata } from 'next';
import Link from 'next/link';
import AlliancesMark from '../components/brand/AlliancesMark';

export const metadata: Metadata = { title: 'Page introuvable', robots: { index: false, follow: true } };

// Page 404 : adresse inconnue ou lien incomplet
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-16">
      <div className="w-full max-w-md text-center">
        <AlliancesMark size={64} className="mx-auto" />
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">Erreur 404</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Page <span className="italic text-rose-500">introuvable</span></h1>
        <p className="mt-3 text-slate-600">
          Cette adresse n’existe pas ou plus. Si vous avez reçu un lien d’invitation, vérifiez qu’il a été copié en entier.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/" className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-rose-700">Retour à l’accueil</Link>
          <a href="/guide" className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-ink hover:border-ink">Consulter le guide</a>
        </div>
      </div>
    </main>
  );
}
