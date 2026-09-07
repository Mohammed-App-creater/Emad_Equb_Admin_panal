import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Point the plugin at our request config (no locale-in-URL routing; locale is
// read from a cookie so the admin URLs stay clean).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // Multiple lockfiles exist above this folder; pin the workspace root so
  // Next infers this project (not a parent) as the root.
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "https", hostname: "emadssl.com", pathname: "/**" },
    ],
  },
};

export default withNextIntl(nextConfig);
