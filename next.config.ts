import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // 캐시 설정
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  outputFileTracingExcludes: {
    '*': ['.next/cache/**', '.next/cache', 'node_modules/**'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
      });
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
  // 이미지 최적화 설정
  images: {
    domains: [],
    unoptimized: true, // Cloudflare Pages에서 필수
  },
};

export default withBundleAnalyzer(nextConfig);
