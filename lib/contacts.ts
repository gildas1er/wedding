// Contacts du téléphone : sélecteur natif (Android / Chrome) ou fichier vCard (.vcf, iPhone et ordinateur).

export type PickedContact = { id: string; name: string; phones: string[] };

type NativeContact = { name?: string[]; tel?: string[] };
type ContactsManager = { select: (props: string[], opts?: { multiple?: boolean }) => Promise<NativeContact[]> };

// Sélecteur de contacts du navigateur (Contact Picker API) : Chrome sur Android uniquement
// (certains navigateurs d'ordinateur exposent l'API sans pouvoir ouvrir de répertoire)
export function contactPickerSupported() {
  return typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window && /android/i.test(navigator.userAgent);
}

const uid = () => Math.random().toString(36).slice(2, 10);
const cleanPhones = (list: string[]) => [...new Set(list.map((p) => p.trim()).filter((p) => p.replace(/\D/g, '').length >= 8))];

// À appeler directement dans le gestionnaire du clic (le navigateur l'exige)
export async function pickPhoneContacts(multiple = true): Promise<PickedContact[]> {
  const manager = (navigator as unknown as { contacts: ContactsManager }).contacts;
  const picked = await manager.select(['name', 'tel'], { multiple });
  return picked
    .map((c) => ({ id: uid(), name: (c.name?.[0] ?? '').trim(), phones: cleanPhones(c.tel ?? []) }))
    .filter((c) => c.name || c.phones.length);
}

// Décodage « quoted-printable » (anciens vCard Android) : =C3=A9 -> é
function decodeQuotedPrintable(value: string) {
  const bytes: number[] = [];
  const raw = value.replace(/=\r?\n/g, '');
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '=' && /^[0-9A-F]{2}$/i.test(raw.slice(i + 1, i + 3))) { bytes.push(parseInt(raw.slice(i + 1, i + 3), 16)); i += 2; }
    else bytes.push(raw.charCodeAt(i));
  }
  try { return new TextDecoder('utf-8').decode(new Uint8Array(bytes)); } catch { return value; }
}

const unescapeValue = (v: string) => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

// Lecture d'un fichier .vcf (un ou plusieurs contacts)
export function parseVCard(text: string): PickedContact[] {
  // Lignes repliées : une ligne qui commence par un espace continue la précédente
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const contacts: PickedContact[] = [];
  let current: { fn: string; n: string; phones: string[] } | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith('BEGIN:VCARD')) { current = { fn: '', n: '', phones: [] }; continue; }
    if (upper.startsWith('END:VCARD')) {
      if (current) {
        const name = current.fn || current.n;
        const phones = cleanPhones(current.phones);
        if (name || phones.length) contacts.push({ id: uid(), name, phones });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const sep = line.indexOf(':');
    if (sep < 0) continue;
    // « item1.TEL;type=CELL » -> propriété TEL, paramètres CELL
    const head = line.slice(0, sep);
    const prop = head.split(';')[0].split('.').pop()!.toUpperCase();
    let value = line.slice(sep + 1);
    if (/ENCODING=QUOTED-PRINTABLE/i.test(head)) value = decodeQuotedPrintable(value);

    if (prop === 'FN') current.fn = unescapeValue(value);
    else if (prop === 'N' && !current.n) {
      const [family = '', given = ''] = value.split(';').map(unescapeValue);
      current.n = [given, family].filter(Boolean).join(' ');
    } else if (prop === 'TEL') current.phones.push(value.replace(/^tel:/i, ''));
  }
  return contacts;
}
