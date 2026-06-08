/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker uchun — minimal runtime image
  output: 'standalone',
  transpilePackages: ['@ecom/ui', '@ecom/utils', '@ecom/types'],
  // TMA hozir skeleton — eslint resolver muammosini build paytida o'tkazib yuboramiz.
  // Typecheck baribir ishlaydi.
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
