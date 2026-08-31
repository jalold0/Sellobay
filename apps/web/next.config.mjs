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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
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
