// Numéros de téléphone au format international attendu par WhatsApp (chiffres uniquement, avec indicatif).
// Pays par défaut : Côte d'Ivoire (+225). Depuis 2021, les numéros ivoiriens ont 10 chiffres
// et le 0 initial fait partie du numéro : 07 00 00 00 00 -> 2250700000000.

const DEFAULT_COUNTRY_CODE = '225';

export function toInternationalDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (trimmed.startsWith('+')) {
    // déjà international : +225…, +33…
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2); // 00225… -> 225…
  } else if (digits.length === 10 && digits.startsWith('0')) {
    digits = DEFAULT_COUNTRY_CODE + digits; // numéro ivoirien local
  }

  // Norme E.164 : 8 à 15 chiffres, indicatif compris
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

// Forme enregistrée en base : +2250700000000
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = toInternationalDigits(raw);
  return digits ? `+${digits}` : null;
}

// Lien direct vers api.whatsapp.com (et non wa.me) : la redirection de wa.me abîme
// les emojis du message, qui s'affichent alors en « � ».
export function whatsappLink(raw: string | null | undefined, message: string): string | null {
  const digits = toInternationalDigits(raw);
  return digits ? `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}` : null;
}
