import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    '*': ['.next/cache/**'],
  },
  webpack: (config, { isServer }) => {
    return config;
  },
};

export default nextConfig;
