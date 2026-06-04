import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.189", "localhost:3000"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nng-phinf.pstatic.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
