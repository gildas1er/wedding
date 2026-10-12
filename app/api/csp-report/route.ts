import { NextResponse } from 'next/server';

// Alertes de la politique de contenu (CSP, next.config.ts) envoyées par les navigateurs.
// Elles apparaissent dans les journaux Vercel (Logs) sous « [CSP] » : une alerte = une ressource
// qui serait bloquée si la politique était activée. Aucune donnée n'est enregistrée ailleurs.
type Report = Record<string, unknown>;

export async function POST(request: Request) {
  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > 20_000) return new NextResponse(null, { status: 204 });
  try {
    const body = JSON.parse(raw) as Report | Report[];
    // Deux formats : « csp-report » (ancien) et Reporting API (liste de rapports)
    const reports = Array.isArray(body) ? body.map((r) => (r.body ?? r) as Report) : [((body as Report)['csp-report'] ?? body) as Report];
    for (const r of reports.slice(0, 10)) {
      const directive = r['effective-directive'] ?? r.effectiveDirective ?? r['violated-directive'] ?? '?';
      const blocked = r['blocked-uri'] ?? r.blockedURL ?? '?';
      const page = String(r['document-uri'] ?? r.documentURL ?? '?').split('?')[0];
      console.warn(`[CSP] ${directive} · bloquerait ${String(blocked).slice(0, 200)} · page ${page.slice(0, 200)}`);
    }
  } catch {
    // rapport illisible : ignoré
  }
  return new NextResponse(null, { status: 204 });
}
