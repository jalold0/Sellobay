import { ImageResponse } from 'next/og';

// Image metadata
export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// Favicon (32x32) — gradient bilan "E" harfi
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #e11d48 100%)',
        color: '#fff',
        fontSize: 22,
        fontWeight: 900,
        borderRadius: 6,
      }}
    >
      E
    </div>,
    { ...size },
  );
}
