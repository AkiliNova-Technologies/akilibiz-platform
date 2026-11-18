import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@akilibiz/config", "@akilibiz/ui"],
  // Next 16.3's CLI path intermittently captures an empty `tsc --showConfig`
  // stream in this workspace. Use the same installed TypeScript compiler API
  // for configuration and type checking, avoiding that process-I/O defect.
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
