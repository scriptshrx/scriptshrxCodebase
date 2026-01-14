import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Buster: 2025-12-13-CACHE-BUST-001
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
