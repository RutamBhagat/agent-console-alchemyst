import "@agent-console-alchemyst/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  devIndicators: false,
};

export default nextConfig;
