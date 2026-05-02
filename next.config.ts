import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack root to this project so a stray ~/package-lock.json
  // doesn't get inferred as the workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
