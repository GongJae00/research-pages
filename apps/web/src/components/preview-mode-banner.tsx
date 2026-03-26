import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { getDemoPreviewLinks, isDemoPreviewRuntimeEnabled } from "@/lib/demo-preview";

interface PreviewModeBannerProps {
  locale: Locale;
}

function getPreviewRoutePath(href: string) {
  const normalizedHref = href.replace(/^https?:\/\/[^/]+/i, "");
  const [pathname] = normalizedHref.split(/[?#]/);

  return pathname || href;
}

function formatPreviewLinkLabel(scopeLabel: string, label: string, href: string) {
  return `${scopeLabel}: ${label} ${getPreviewRoutePath(href)}`;
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
          body: "\uC774 \uBC30\uD3EC\uC5D0\uC11C\uB294 \uB0B4\uBD80 \uBBF8\uB9AC\uBCF4\uAE30 \uACBD\uB85C\uC640 \uACF5\uAC1C \uC250 \uACBD\uB85C\uB97C \uB098\uB220\uC11C \uBCF4\uB4DC\uC640 \uACF5\uAC1C \uC9C4\uC785\uC810\uC744 \uD55C \uBC88\uC5D0 \uBE44\uAD50\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
          homepage: "\uD648\uD398\uC774\uC9C0 \uC250",
          workspace: "\uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4 \uC250",
          ops: "\uC5D0\uC774\uC804\uD2B8 \uC635\uC2A4 \uBCF4\uB4DC",
          researcher: "\uC5F0\uAD6C\uC790 \uD398\uC774\uC9C0",
          lab: "\uC5F0\uAD6C\uC2E4 \uD398\uC774\uC9C0",
          health: "\uB7F0\uD0C0\uC784 \uD5EC\uC2A4",
          internalRoutes: "\uB0B4\uBD80 \uBBF8\uB9AC\uBCF4\uAE30 \uACBD\uB85C",
          publicRoutes: "\uACF5\uAC1C \uC250 \uACBD\uB85C",
          internalTag: "\uB0B4\uBD80",
          publicTag: "\uACF5\uAC1C",
          apiTag: "API",
        }
      : {
          label: "Internal demo preview",
          body: "This deployment separates internal preview routes from public shell routes so the control room and shareable entry points scan apart faster.",
          homepage: "Homepage shell",
          workspace: "Workspace shell",
          ops: "Agent ops board",
          researcher: "Researcher page",
          lab: "Lab page",
          health: "Runtime health",
          internalRoutes: "Internal preview routes",
          publicRoutes: "Public shell routes",
          internalTag: "Internal",
          publicTag: "Public",
          apiTag: "API",
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
      href: `/${locale}`,
      label: copy.homepage,
    },
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
              {formatPreviewLinkLabel(copy.internalTag, link.label, link.href)}
            </Link>
          ))}
          <span className="preview-mode-banner-link preview-mode-banner-link-subtle">{copy.publicRoutes}</span>
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} className="preview-mode-banner-link">
              {formatPreviewLinkLabel(copy.publicTag, link.label, link.href)}
            </Link>
          ))}
          <Link href="/api/health" className="preview-mode-banner-link preview-mode-banner-link-subtle">
            {formatPreviewLinkLabel(copy.apiTag, copy.health, "/api/health")}
          </Link>
        </div>
      </div>
    </div>
  );
}
