import { ImageResponse } from 'next/og';

// Sellobay OG image — Facebook/Twitter/Telegram preview, 1200×630
export const runtime = 'edge';
export const alt = 'Sellobay — O`zbekistondagi eng yirik marketplace';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: 'linear-gradient(135deg, #0A0A0C 0%, #1A0A0F 35%, #5C0015 70%, #8B0020 100%)',
        color: '#fff',
      }}
    >
      {/* Brand bar — yuqori */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 88,
            height: 88,
            background: 'linear-gradient(135deg, #1A0A0F 0%, #5C0015 50%, #8B0020 100%)',
            border: '2px solid #C9A961',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: -3,
            color: '#fff',
          }}
        >
          SB
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -0.5 }}>Sellobay</div>
          <div
            style={{
              fontSize: 14,
              opacity: 0.6,
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginTop: 4,
              color: '#C9A961',
            }}
          >
            Marketplace ekotizimi
          </div>
        </div>
      </div>

      {/* Markazda asosiy slogan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>
          Minglab sotuvchilar.
          <br />
          <span style={{ color: '#C9A961' }}>Yagona platforma.</span>
        </div>
        <div style={{ fontSize: 28, opacity: 0.85, maxWidth: 900 }}>
          Premium brendlar, mahalliy sotuvchilar va tezkor yetkazib berish — bitta joyda.
        </div>
      </div>

      {/* Trust strip — pastki qator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(201, 169, 97, 0.25)',
          paddingTop: 24,
        }}
      >
        <div style={{ display: 'flex', gap: 32, fontSize: 22, opacity: 0.9 }}>
          <span>50,000+ sotuvchi</span>
          <span style={{ color: '#C9A961' }}>·</span>
          <span>2M+ mahsulot</span>
          <span style={{ color: '#C9A961' }}>·</span>
          <span>24/7 yordam</span>
        </div>
        <div style={{ fontSize: 22, opacity: 0.55 }}>sellobay.uz</div>
      </div>
    </div>,
    { ...size },
  );
}
