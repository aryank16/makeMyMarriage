import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; a stray package-lock.json in the home directory
  // otherwise makes Next infer the wrong one.
  turbopack: { root: __dirname },
  /* config options here */
};

export default nextConfig;
