import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { getDemoPreviewLinks, isDemoPreviewRuntimeEnabled } from "@/lib/demo-preview";

interface PreviewModeBannerProps {
  locale: Locale;
}

export function PreviewModeBanner({ locale }: PreviewModeBannerProps) {
  if (!isDemoPreviewRuntimeEnabled()) {
    return null;
  }

  const links = getDemoPreviewLinks();
  const copy =
    locale === "ko"
      ? {
          label: "\uB0B4\uBD80 \uB370\uBAA8 \uBBF8\uB9AC\uBCF4\uAE30",
          body: "\uC774 \uBC30\uD3EC\uC5D0\uC11C\uB294 \uB370\uBAA8 \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4, \uACF5\uAC1C \uD398\uC774\uC9C0, \uB0B4\uBD80 \uC5D0\uC774\uC804\uD2B8 \uC635\uC2A4 \uD654\uBA74\uC744 \uD55C \uBC88\uC5D0 \uAC80\uD1A0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
          workspace: "\uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4",
          ops: "\uC5D0\uC774\uC804\uD2B8 \uC635\uC2A4",
          researcher: "\uC5F0\uAD6C\uC790 \uD398\uC774\uC9C0",
          lab: "\uC5F0\uAD6C\uC2E4 \uD398\uC774\uC9C0",
          health: "\uD5EC\uC2A4",
          internalRoutes: "\uB0B4\uBD80 \uACBD\uB85C",
          publicRoutes: "\uACF5\uAC1C \uACBD\uB85C",
        }
      : {
          label: "Internal demo preview",
          body: "This deployment exposes the demo workspace, public pages, and internal agent ops surfaces for review.",
          workspace: "Workspace",
          ops: "Agent ops",
          researcher: "Researcher page",
          lab: "Lab page",
          health: "Health",
          internalRoutes: "Internal routes",
          publicRoutes: "Public routes",
        };

  const internalLinks = [
    {
      href: `/${locale}/profile`,
      label: copy.workspace,
    },
    {
      href: `/${locale}/ops`,
      label: copy.ops,
    },
  ];

  const publicLinks = [
    {
      href: links.researcher[locale],
      label: copy.researcher,
    },
    {
      href: links.lab[locale],
      label: copy.lab,
    },
  ];

  return (
    <div className="preview-mode-banner-shell">
      <div className="preview-mode-banner">
        <div className="preview-mode-banner-copy">
          <span className="preview-mode-banner-label">{copy.label}</span>
          <p>{copy.body}</p>
        </div>
        <div className="preview-mode-banner-links">
          <span className="preview-mode-banner-link preview-mode-banner-link-subtle">{copy.internalRoutes}</span>
          {internalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="preview-mode-banner-link">
              {link.label}
            </Link>
          ))}
          <span className="preview-mode-banner-link preview-mode-banner-link-subtle">{copy.publicRoutes}</span>
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} className="preview-mode-banner-link">
              {link.label}
            </Link>
          ))}
          <Link href="/api/health" className="preview-mode-banner-link preview-mode-banner-link-subtle">
            {copy.health}
          </Link>
        </div>
      </div>
    </div>
  );
}
