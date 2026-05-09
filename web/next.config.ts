import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
