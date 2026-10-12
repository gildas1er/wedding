// Protection des exports CSV contre l'injection de formules (Excel, LibreOffice, Google Sheets).
// Une cellule qui commence par = + - @ (ou tabulation / retour chariot) est exécutée comme une formule
// à l'ouverture du fichier : un invité pourrait glisser =HYPERLINK(…) dans sa note de réponse.
// On neutralise ces cellules avec une apostrophe en tête, sauf les vrais nombres et numéros de téléphone
// (+225 07 00 00 00 00, -5000, 12,5) qui restent utilisables tels quels.
const DANGEROUS_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[+-]?[\d\s.,()]+$/;

export function safeCsvCell(value: unknown): unknown {
  if (typeof value !== 'string' || !DANGEROUS_START.test(value)) return value;
  if (PLAIN_NUMBER.test(value) && /\d/.test(value)) return value;
  return `'${value}`;
}

export function safeCsvRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, safeCsvCell(v)])) as T);
}
