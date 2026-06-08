import { ImageResponse } from 'next/og';

// OG image (Facebook, Twitter, Telegram preview) — 1200x630 standart
export const runtime = 'edge';
export const alt = 'E-Commerce — O`zbekistondagi eng yirik onlayn savdo platformasi';
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
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #831843 100%)',
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(135deg, #fff, #fda4af)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            fontWeight: 900,
            color: '#0f172a',
          }}
        >
          E
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>E-Commerce</div>
          <div style={{ fontSize: 18, opacity: 0.7 }}>Ekosistema</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.1 }}>
          O&apos;zbekistondagi
          <br />
          eng katta onlayn bozor
        </div>
        <div style={{ fontSize: 28, opacity: 0.8, maxWidth: 800 }}>
          Kiyim-kechak, poyabzal, atirlar, kosmetika va aksessuarlar
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 24, fontSize: 22, opacity: 0.85 }}>
          <span>🚚 24 soat yetkazib berish</span>
          <span>↩️ 14 kun qaytarish</span>
          <span>✅ Asl mahsulot</span>
        </div>
        <div style={{ fontSize: 22, opacity: 0.6 }}>example.uz</div>
      </div>
    </div>,
    { ...size },
  );
}
