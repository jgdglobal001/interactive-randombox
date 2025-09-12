import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    '*': ['.next/cache/**'],
  },
  webpack: (config, { isServer }) => {
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
