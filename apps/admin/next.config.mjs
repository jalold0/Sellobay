/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@ecom/core-domain', '@ecom/order-ops', '@ecom/ui', '@ecom/utils', '@ecom/types', '@ecom/i18n', '@ecom/push'],
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/argon2', '@prisma/client', 'prisma'],
  },
};
export default nextConfig;
