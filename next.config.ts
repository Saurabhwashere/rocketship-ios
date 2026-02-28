import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent bundling — these must run in the Node.js runtime, not the edge
  serverExternalPackages: ["@anthropic-ai/sdk", "socket.io"],

  async headers() {
    return [
      {
        // Apply CORS to all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          // Required for Appetize iframe to load cross-origin content
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
