import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Security headers — barcha javoblarga qo'shiladi (clickjacking/MIME-sniff himoyasi).
// CSP ataylab qo'shilmagan: Next inline skriptlari bilan ehtiyotkor sozlash kerak
// (keyingi bosqich — report-only rejimda kiritiladi).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Geolocation o'zimizga kerak (xarita location-picker), kamera/mikrofon yo'q
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Docker uchun — minimal runtime image
  output: 'standalone',
  transpilePackages: ['@ecom/core-domain', '@ecom/ui', '@ecom/i18n', '@ecom/utils', '@ecom/types', '@ecom/storage'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  // Prisma query engine binary'sini serverless bundle'dan tashqarida qoldiradi
  // (NFT tracing to'g'ri ishlashi uchun)
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@node-rs/argon2', 'prisma'],
    // Next 14 da instrumentation.ts SHU FLAGSIZ umuman yuklanmaydi (Next 15 da stabil).
    // Usiz server va edge tomonidagi xato kuzatuvi jim turadi.
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pnpm monorepo'da Prisma engine'ni (.so.node) function bundle'iga ko'chiradi
      // https://pris.ly/d/engine-not-found-nextjs
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  // Rasm optimizatsiyasi uchun ruxsat etilgan manbalar.
  //
  // Avval bu yerda { protocol: 'https', hostname: '**' } turardi va bu
  // /_next/image ni OCHIQ RASM PROKSISIGA aylantirgan edi: begona odam
  // ?url= ga istalgan saytning rasmini berib, Vercel image-optimization
  // kvotasini bizning hisobimizdan sarflay olardi.
  //
  // Ro'yxat ataylab qisqa. Yangi host qo'shishdan oldin savol bering:
  // rasmni o'zimizning Blob do'konimizga yuklab bo'lmaydimi? (@ecom/storage)
  images: {
    remotePatterns: [
      // --- Yangi yuklamalar: @ecom/storage -> Vercel Blob ---
      // Do'kon identifikatori subdomen bo'lib keladi va muhitga qarab
      // o'zgaradi (preview/production), shuning uchun bir bosqichli `*`.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },

      // --- Legacy: bazadagi ProductImage.url hostlari (2026-09-01 holati) ---
      // SELECT split_part(split_part(url,'//',2),'/',1), count(*) FROM "ProductImage"
      { protocol: 'https', hostname: 'picsum.photos' }, // seed/demo rasmlar - 10 qator
      { protocol: 'https', hostname: 'storage.kun.uz' }, // qo'lda kiritilgan - 2 qator
      { protocol: 'https', hostname: 'avatars.mds.yandex.net' }, // qo'lda kiritilgan - 1 qator

      // --- Dizaynga qat'iy yozilgan rasmlar ---
      // featured-collection, seller-banner, testimonials
      { protocol: 'https', hostname: 'images.unsplash.com' },

      // --- Global sourcing importi (admin -> "Rasm havolalari") ---
      // Taobao/Tmall/1688 rasmlari shu CDN'da yotadi va operator havolani
      // to'g'ridan-to'g'ri ProductImage.url ga yozadi (global-catalog-server.ts).
      // Import paytida rasmlar Blob'ga ko'chiriladigan bo'lsa - SHU QATORNI O'CHIRING.
      { protocol: 'https', hostname: '**.alicdn.com' },

      // Lokal dev: public/ dan tashqaridagi manbalar
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

const config = withNextIntl(nextConfig);

// Sentry plugin HAR DOIM ulanadi.
//
// Avval u faqat SENTRY_AUTH_TOKEN bo'lganda ulanardi va bu XATO edi: aynan shu
// plugin sentry.client.config.ts ni brauzer bundle'iga qo'shadi. Tokensiz plugin
// ulanmasa, brauzerda Sentry umuman ishga tushmaydi.
//
// Token faqat source map yuklashga ta'sir qiladi. U yo'q bo'lsa plugin yuklashni
// jim o'tkazib yuboradi va build muvaffaqiyatli tugaydi.
export default withSentryConfig(config, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  webpack: {
    // Sentry'ning o'z debug log'larini production bundle'dan olib tashlaydi
    treeshake: { removeDebugLogging: true },
  },
});
