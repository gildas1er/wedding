// N'accepte qu'un chemin interne ("/dashboard/budget"), jamais une adresse externe : évite les redirections ouvertes.
// Le chemin est interprété comme le ferait le navigateur, puis on vérifie qu'il reste sur le site.
// Refuse donc aussi les contournements : "//site.com", "/\site.com", "/<tabulation>/site.com"
// (les navigateurs retirent tabulations et retours à la ligne, ce qui donnait "//site.com").
const BASE = 'https://site.invalid';

export function safeNextPath(next: string | null | undefined, fallback = '/dashboard') {
  if (!next || !next.startsWith('/')) return fallback;
  // Caractères de contrôle (tabulation, retour à la ligne…) et barres obliques inversées : jamais dans un chemin légitime
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return fallback;
    // Chemin normalisé (sans « //» initial possible) avec ses paramètres et son ancre
    const path = url.pathname + url.search + url.hash;
    return path.startsWith('//') ? fallback : path;
  } catch {
    return fallback;
  }
}
