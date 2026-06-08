import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS home-screen ikon (180x180)
export default function AppleIcon() {
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
        fontSize: 128,
        fontWeight: 900,
      }}
    >
      E
    </div>,
    { ...size },
  );
}
