import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Handle Chesapeake City website API requests
      {
        source: "/ImageRepository/Document",
        destination: "/api/ImageRepository/Document",
      },
      {
        source: "/ImageRepository/Document/:documentID*",
        destination: "/api/ImageRepository/Document/:documentID*",
      },
      {
        source: "/Toggle",
        destination: "/api/Toggle",
      },
      {
        source: "/Assets/:path*",
        destination: "/api/Assets/:path*",
      },
      {
        source: "/Pages/:path*",
        destination: "/api/Pages/:path*",
      },
      {
        source: "/api/v1/:path*",
        destination: "/api/api/v1/:path*",
      },
      {
        source: "/Content/Load",
        destination: "/api/Content/Load",
      },
      {
        source: "/antiforgery",
        destination: "/api/antiforgery",
      },
    ];
  },
};

export default nextConfig;
