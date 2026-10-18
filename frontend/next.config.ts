import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    // Only proxy to an external backend if BACKEND_URL is explicitly configured
    if (backendUrl && !backendUrl.includes("127.0.0.1:8000") && !backendUrl.includes("localhost:8000")) {
      return [
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
