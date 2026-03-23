import type { NextConfig } from "next";

const shouldNoIndexPreview =
  process.env.NEXT_PUBLIC_RESEARCH_PAGES_DEMO_MODE?.trim().toLowerCase() === "true" ||
  Boolean(process.env.RESEARCH_PAGES_PREVIEW_ACCESS_KEY?.trim());

const nextConfig: NextConfig = {
  transpilePackages: ["@research-os/types"],
  async headers() {
    if (!shouldNoIndexPreview) {
      return [];
    }

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
