import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Increases the limit to 5 megabytes
    },
    // Recently-visited dynamic routes (e.g. board pages) are reused from the
    // client router cache for this long before Next re-fetches from the
    // server — lets switching back to a board you just left feel instant.
    staleTimes: {
      dynamic: 30,
    },
  },
  logging: {
    incomingRequests: false,
    browserToTerminal: 'error',
  },
};

export default nextConfig;
