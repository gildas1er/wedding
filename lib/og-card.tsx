// Image d'aperçu 1200×630 (rendue par next/og) : faire-part typographique aux couleurs du couple.
import { ImageResponse } from 'next/og';
import { DEFAULT_PALETTE, isHexColor, resolveAccent } from './palettes';
import { loadGoogleFont } from './og';

export const OG_SIZE = { width: 1200, height: 630 };

// Mélange de deux couleurs hexadécimales (le moteur d'images ne connaît pas color-mix)
function mix(a: string, b: string, weightOfA: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v * weightOfA + pb[i] * (1 - weightOfA)).toString(16).padStart(2, '0')).join('')}`;
}

function RingsMark({ width }: { width: number }) {
  return (
    <svg width={width} height={(width * 110) / 150} viewBox="0 0 150 110">
      <circle cx="58" cy="62" r="34" fill="none" stroke="#9e3a55" strokeWidth="7" />
      <circle cx="92" cy="62" r="34" fill="none" stroke="#b38c4a" strokeWidth="7" />
      <path d="M 71.8 30.9 A 34 34 0 0 1 89.1 48.2" fill="none" stroke="#9e3a55" strokeWidth="7" />
      <path d="M92 6 L99.5 16.5 L92 25 L84.5 16.5 Z" fill="#dcc28a" stroke="#b38c4a" strokeWidth="2" />
    </svg>
  );
}

type CardProps = {
  eyebrow: string;
  names: [string, string] | null; // null = carte générique du site
  title?: string;
  subtitle: string;
  primary?: string | null;
  accent?: string | null;
};

export async function renderOgCard({ eyebrow, names, title, subtitle, primary, accent }: CardProps) {
  const p = isHexColor(primary) ? primary : DEFAULT_PALETTE.primary;
  const a = resolveAccent(p, accent);
  const ink = '#1f1b18';
  const bg = mix(p, '#fdfbf8', 0.05);

  const display = names ? `${names[0]} ${names[1]}` : title ?? 'WeddingStudio';
  const longest = Math.max(...(names ?? [display]).map((n) => n.length));
  const nameSize = longest > 14 ? 78 : longest > 10 ? 96 : 116;

  const [serif, serifItalic, sans] = await Promise.all([
    loadGoogleFont('Fraunces', `${display}WeddingStudio`),
    loadGoogleFont('Fraunces:ital@1', '&Studio'),
    loadGoogleFont('Manrope:wght@600', `${eyebrow}${subtitle}WeddingStudio`.toUpperCase() + `${eyebrow}${subtitle}`),
  ]);
  const fonts = [
    serif && { name: 'Fraunces', data: serif, style: 'normal' as const, weight: 400 as const },
    serifItalic && { name: 'FrauncesItalic', data: serifItalic, style: 'italic' as const, weight: 400 as const },
    sans && { name: 'Manrope', data: sans, style: 'normal' as const, weight: 600 as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; style: 'normal' | 'italic'; weight: 400 | 600 }[];

  const serifFamily = serif ? 'Fraunces' : 'serif';
  const italicFamily = serifItalic ? 'FrauncesItalic' : serifFamily;
  const sansFamily = sans ? 'Manrope' : 'sans-serif';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: bg, padding: 28 }}>
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${mix(a, bg, 0.7)}`, borderRadius: 28, position: 'relative',
          }}
        >
          {/* Coins décoratifs à la couleur principale */}
          <div style={{ position: 'absolute', top: -2, left: -2, width: 90, height: 90, borderTop: `6px solid ${p}`, borderLeft: `6px solid ${p}`, borderTopLeftRadius: 28 }} />
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 90, height: 90, borderBottom: `6px solid ${p}`, borderRight: `6px solid ${p}`, borderBottomRightRadius: 28 }} />

          <div style={{ display: 'flex', fontFamily: sansFamily, fontSize: 22, letterSpacing: 6, color: mix(a, ink, 0.8), textTransform: 'uppercase' }}>
            {eyebrow}
          </div>

          {names ? (
            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 26, fontFamily: serifFamily, fontSize: nameSize, color: ink, letterSpacing: -1 }}>
              <span>{names[0]}</span>
              <span style={{ fontFamily: italicFamily, fontStyle: 'italic', color: a, margin: '0 28px', fontSize: nameSize * 0.85 }}>&amp;</span>
              <span>{names[1]}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 26, fontFamily: serifFamily, fontSize: 110, color: ink }}>
              <div style={{ display: 'flex', marginRight: 26 }}><RingsMark width={150} /></div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span>Wedding</span>
                <span style={{ fontFamily: italicFamily, fontStyle: 'italic', color: p }}>Studio</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', width: 140, height: 2, marginTop: 34, background: `linear-gradient(90deg, ${bg}, ${a}, ${bg})` }} />

          <div style={{ display: 'flex', marginTop: 30, fontFamily: sansFamily, fontSize: 30, color: mix(ink, bg, 0.75) }}>
            {subtitle}
          </div>

          {names && (
            <div style={{ position: 'absolute', bottom: 34, display: 'flex', alignItems: 'center', fontFamily: serifFamily, fontSize: 22, color: mix(ink, bg, 0.45) }}>
              <div style={{ display: 'flex', marginRight: 8 }}><RingsMark width={34} /></div>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span>Wedding</span>
                <span style={{ fontFamily: italicFamily, fontStyle: 'italic' }}>Studio</span>
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined }
  );
}
