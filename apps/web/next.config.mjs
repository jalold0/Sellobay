import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
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
  transpilePackages: ['@ecom/core-domain', '@ecom/ui', '@ecom/i18n', '@ecom/utils', '@ecom/types'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  // Prisma query engine binary'sini serverless bundle'dan tashqarida qoldiradi
  // (NFT tracing to'g'ri ishlashi uchun)
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@node-rs/argon2', 'prisma'],
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

export default withNextIntl(nextConfig);
