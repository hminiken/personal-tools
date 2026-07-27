import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Increases the limit to 5 megabytes
    },
  },
  logging: {
    incomingRequests: false,
    browserToTerminal: 'error',
  },
};

export default nextConfig;
