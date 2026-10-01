// Cérémonies du mariage : lesquelles sont prévues, et lien Google Maps de chacune.

type MarriageLike = {
  show_dot?: boolean | null;
  show_civil?: boolean | null;
  show_religious?: boolean | null;
  show_reception?: boolean | null;
  religious_date?: string | null;
  religious_hour?: string | null;
};

// Sans choix explicite (anciennes données, ou migration 3 pas encore lancée) :
// mairie et réception sont prévues, l'église seulement si une date ou une heure est renseignée.
// La dot n'apparaît que si le couple l'a activée (migration 12).
export function ceremonyFlags(m: MarriageLike | null | undefined) {
  return {
    dot: m?.show_dot ?? false,
    civil: m?.show_civil ?? true,
    religious: m?.show_religious ?? Boolean(m?.religious_date || m?.religious_hour),
    reception: m?.show_reception ?? true,
  };
}

export function isHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// Lien saisi par le couple s'il est valide, sinon recherche Google Maps sur le nom du lieu.
export function mapsUrl(customUrl: string | null | undefined, location: string | null | undefined): string | null {
  if (isHttpUrl(customUrl)) return customUrl!.trim();
  if (location?.trim()) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
  return null;
}
