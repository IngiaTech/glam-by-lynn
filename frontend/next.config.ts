import type { NextConfig } from "next";

/**
 * Hosts allowed through the next/image optimizer.
 *
 * `hostname: '**'` turns the deployment into an open image proxy: any HTTPS URL
 * on the internet can be fetched and cached at our expense, and served from our
 * domain. Only the hosts that actually serve our media belong here:
 *   - the API host itself (locally-stored uploads under /uploads)
 *   - Cloudinary and S3, the two configurable storage providers
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const apiImageHost = (() => {
  if (!apiUrl) return [];
  try {
    const { protocol, hostname, port } = new URL(apiUrl);
    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        ...(port ? { port } : {}),
        pathname: "/uploads/**",
      },
    ];
  } catch {
    // A malformed NEXT_PUBLIC_API_URL shouldn't break the build; the host is
    // simply not allowlisted and the image request 400s visibly.
    return [];
  }
})();

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      ...apiImageHost,
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  // Enable compression
  compress: true,
  // Enable React strict mode for better development practices
  reactStrictMode: true,
  // The vision section moved from /vision-2026 to /vision — keep old links and
  // search-engine results working.
  async redirects() {
    return [
      {
        source: "/vision-2026",
        destination: "/vision",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
