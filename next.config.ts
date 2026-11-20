import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Point the plugin at our request config (no locale-in-URL routing; locale is
// read from a cookie so the admin URLs stay clean).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // A second dev server (e.g. one pointed at a local backend) needs its own
  // build folder: Next locks the one a running server uses.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Multiple lockfiles exist above this folder; pin the workspace root so
  // Next infers this project (not a parent) as the root.
  turbopack: { root: __dirname },
  // Old bookmarks: the group-scoped pages were folded into the Equb detail
  // page and the vocabulary changed (Cycles → Equbs, Schemes/Tiers → Categories).
  async redirects() {
    return [
      { source: "/dashboard/cycles", destination: "/dashboard/equbs", permanent: true },
      { source: "/dashboard/tiers", destination: "/dashboard/categories", permanent: true },
      { source: "/dashboard/members", destination: "/dashboard/equbs", permanent: true },
      { source: "/dashboard/draws", destination: "/dashboard/equbs", permanent: true },
      { source: "/dashboard/draws/:id", destination: "/dashboard/equbs", permanent: true },
      { source: "/dashboard/payouts", destination: "/dashboard/equbs", permanent: true },
      { source: "/dashboard/penalties", destination: "/dashboard/equbs", permanent: true },
    ];
  },
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
