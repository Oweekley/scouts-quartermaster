import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    // Avoid Turbopack picking up unrelated lockfiles in parent dirs.
    root: appRoot,
  },
};

export default nextConfig;
