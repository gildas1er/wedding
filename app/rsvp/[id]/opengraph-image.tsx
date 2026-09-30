import { renderOgCard, OG_SIZE } from '../../../lib/og-card';
import { coupleName, fetchOgMarriage } from '../../../lib/og';
import { formatDateFr } from '../../../lib/event-datetime';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Faire-part de mariage';
// L'image suit les modifications du studio (couleurs, date) avec un léger cache
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await fetchOgMarriage(id);
  const p1 = m?.partner_1_name?.trim();
  const p2 = m?.partner_2_name?.trim();
  return renderOgCard({
    eyebrow: m?.invitation_text?.trim() || 'Vous êtes invités',
    names: p1 && p2 ? [p1, p2] : null,
    title: coupleName(m) || undefined,
    subtitle: m?.wedding_date ? formatDateFr(m.wedding_date) : 'Découvrez notre faire-part',
    primary: m?.primary_color,
    accent: m?.accent_color,
  });
}
