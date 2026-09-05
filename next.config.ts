import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Safety net for any remaining large form posts (uploads themselves now
    // go directly browser → Supabase and bypass Next entirely).
    proxyClientMaxBodySize: "100mb",
    // Admin uploads (covers + PDFs) go through Server Actions —
    // raise the default 1 MB body limit.
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
