import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
