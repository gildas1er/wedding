import { renderOgCard, OG_SIZE } from '../lib/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'WeddingStudio — organisez le mariage de vos rêves';

export default async function Image() {
  return renderOgCard({
    eyebrow: "L'atelier des mariés",
    names: null,
    subtitle: 'Invités, faire-part, plan de table et budget au même endroit',
  });
}
