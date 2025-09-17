/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages 정적 내보내기 설정
  output: 'export',
  trailingSlash: true,

  // 이미지 최적화 비활성화 (정적 내보내기 필수)
  images: {
    unoptimized: true,
  },

  // 폰트 최적화 설정
  optimizeFonts: false,
};

module.exports = nextConfig;