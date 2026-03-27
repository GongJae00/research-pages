import type { NextConfig } from "next";

const shouldNoIndexPreview =
  process.env.NEXT_PUBLIC_RESEARCH_PAGES_DEMO_MODE?.trim().toLowerCase() === "true" ||
  Boolean(process.env.RESEARCH_PAGES_PREVIEW_ACCESS_KEY?.trim());

const publicShellCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@research-os/types"],
  async headers() {
    const headers = [
      {
        source: "/",
        headers: publicShellCacheHeaders,
      },
      {
        source: "/:locale(ko|en)",
        headers: publicShellCacheHeaders,
      },
      {
        source: "/:locale(ko|en)/researcher/:slug",
        headers: publicShellCacheHeaders,
      },
      {
        source: "/:locale(ko|en)/labs/:slug",
        headers: publicShellCacheHeaders,
      },
    ];

    if (shouldNoIndexPreview) {
      headers.push({
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      });
    }

    return headers;
  },
};

export default nextConfig;
