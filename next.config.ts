import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Vercel Node.js 20.x 호환성 설정
  productionBrowserSourceMaps: false,
  generateBuildId: () => 'no-source-maps',
  
  // source-map 외부 패키지로 설정
  serverExternalPackages: ['source-map', 'ws', 'bufferutil', 'utf-8-validate'],
  
  // API Routes를 정적 생성에서 제외
  experimental: {
    // 웹팩 빌드 워커 비활성화
    webpackBuildWorker: false,
  },
  
  // 웹팩 설정 통합
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // 프로덕션 빌드에서 캐시 비활성화
    config.cache = false;
    
    // source-map 의존성 문제 완전 해결
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'source-map': require.resolve('source-map'),
      'ws': require.resolve('ws'),
    };
    
    // Node.js 모듈 완전 비활성화 (Vercel 호환성)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        'source-map': require.resolve('source-map'),
        'ws': require.resolve('ws'),
      };
    }
    
    // source map 생성 완전 비활성화
    config.devtool = false;
    
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
        'ws': 'commonjs ws',
        'bufferutil': 'commonjs bufferutil',
        'utf-8-validate': 'commonjs utf-8-validate',
      });
    }
    
    return config;
  },
  
  outputFileTracingExcludes: {
    '*': ['.next/cache/**', '.next/cache', 'node_modules/**', 'cache/**'],
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