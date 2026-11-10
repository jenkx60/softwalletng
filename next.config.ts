import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL ? [
      new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-photos/**`),
    ] : [],
  },
  turbopack: {
    root: process.cwd(),
  },
  agentRules: false,
};

export default nextConfig;
