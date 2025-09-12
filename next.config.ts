import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    '*': ['.next/cache/**'],
  },
  webpack: (config, { isServer }) => {
  },
};

export default nextConfig;
