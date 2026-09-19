import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Nested .git in this app makes Next treat it as the workspace root,
  // so Turbopack cannot follow the pnpm symlink to the monorepo `next` package.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

// The plugin provides the request configuration used by next-intl.
// https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing#next-config
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);