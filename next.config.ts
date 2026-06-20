import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Auto-discovers ./src/i18n/request.ts (default location with src/ structure).
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
