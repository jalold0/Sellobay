/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker uchun — minimal runtime image
  output: 'standalone',
  transpilePackages: ['@ecom/ui', '@ecom/utils', '@ecom/types'],
};
export default nextConfig;
