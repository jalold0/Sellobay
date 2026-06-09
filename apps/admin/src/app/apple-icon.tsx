import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Sellobay Admin Panel — qora bg + oltin SB
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0A0A0C 0%, #16161A 100%)',
        color: '#C9A961',
        fontSize: 84,
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
