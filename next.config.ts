import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Auto-discovers ./src/i18n/request.ts (default location with src/ structure).
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // trail-core is a workspace package shipping raw TypeScript. Next does not
  // compile anything under node_modules by default, so it must be opted in.
  transpilePackages: ["@backpackers/trail-core"],
};

export default withNextIntl(nextConfig);
