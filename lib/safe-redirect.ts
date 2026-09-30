// N'accepte qu'un chemin interne ("/dashboard/budget"), jamais une URL externe
// ("https://…", "//site.com", "@site.com") : évite les redirections ouvertes.
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
