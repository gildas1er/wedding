// Icône de l'écran d'accueil (iPhone) : les alliances sur fond bordeaux.
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#9e3a55' }}>
        <svg width="132" height="97" viewBox="0 0 150 110">
          <circle cx="58" cy="62" r="34" fill="none" stroke="#faf7f2" strokeWidth="9" />
          <circle cx="92" cy="62" r="34" fill="none" stroke="#dcc28a" strokeWidth="9" />
          <path d="M 71.8 30.9 A 34 34 0 0 1 89.1 48.2" fill="none" stroke="#faf7f2" strokeWidth="9" />
          <path d="M92 6 L99.5 16.5 L92 25 L84.5 16.5 Z" fill="#dcc28a" />
        </svg>
      </div>
    ),
    size
  );
}
