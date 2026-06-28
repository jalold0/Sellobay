import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Docker uchun — minimal runtime image
  output: 'standalone',
  transpilePackages: ['@ecom/ui', '@ecom/i18n', '@ecom/utils', '@ecom/types'],
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
