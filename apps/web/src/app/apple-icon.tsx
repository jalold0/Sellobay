import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Sellobay iOS home-screen ikon (180x180) — bordo gradient + SB monogram
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A0A0F 0%, #5C0015 50%, #8B0020 100%)',
        color: '#fff',
        fontSize: 92,
        fontWeight: 900,
        letterSpacing: -4,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      SB
    </div>,
    { ...size },
  );
}
