/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@ecom/core-domain', '@ecom/i18n', '@ecom/ui', '@ecom/utils', '@ecom/types', '@ecom/storage'],
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/argon2', '@prisma/client', 'prisma'],
  },
};
export default nextConfig;
