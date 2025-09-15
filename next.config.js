const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel 배포 오류 해결을 위한 소스맵 비활성화
  productionBrowserSourceMaps: false,
  
  // API Routes를 정적 생성에서 제외
  experimental: {
    // 웹팩 빌드 워커 비활성화
    webpackBuildWorker: false,
  },
  
  // 캐시 비활성화 및 크기 제한 해결
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // 웹팩 설정 통합
  webpack: (config, { isServer }) => {
    // 프로덕션 빌드에서 캐시 비활성화
    config.cache = false;
    
    // source-map 의존성 문제 해결
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'source-map': require.resolve('source-map'),
      };
    }
    
    // 큰 청크 분할 설정
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\\\/]node_modules[\\\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
            maxSize: 20971520, // 20MB
          },
        },
        maxSize: 20971520, // 20MB
      },
    };
    
    // 서버 사이드 Prisma 설정
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

module.exports = withBundleAnalyzer(nextConfig);