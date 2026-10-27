import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export served from S3 through CloudFront (D-004).
  output: 'export',
  // The Next image optimizer needs a server; static export can't use it.
  images: { unoptimized: true },
  // Emits /about/index.html so S3 can serve every route as a plain object.
  trailingSlash: true,
  // @portfolio/shared ships TypeScript source.
  transpilePackages: ['@portfolio/shared'],
};

const withMDX = createMDX({
  options: {
    // Plugin names are strings because Turbopack can't take functions (D-020).
    remarkPlugins: ['remark-frontmatter', ['remark-mdx-frontmatter', { name: 'frontmatter' }]],
  },
});

export default withMDX(nextConfig);
