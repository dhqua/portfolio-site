import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export served from S3 through CloudFront (D-004).
  output: 'export',
  // The Next image optimizer needs a server; static export can't use it.
  images: { unoptimized: true },
  // Emits /about/index.html so S3 can serve every route as a plain object.
  trailingSlash: true,
};

export default nextConfig;
