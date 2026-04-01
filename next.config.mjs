/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Serve WebP/AVIF instead of raw JPGs — ~60-80% smaller files
    formats: ['image/avif', 'image/webp'],
    // Cache optimised images on CDN for 24 hours
    minimumCacheTTL: 86400,
    // Device breakpoints for responsive image srcsets
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      // Allow any HTTPS image source (covers Supabase, CDNs, etc.)
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  }
};

export default nextConfig;

