import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // The customer booking page is the static HTML file in /public.
      beforeFiles: [{ source: "/", destination: "/booking.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
