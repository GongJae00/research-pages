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

const previewLinkGroupStyle = {
  display: "grid",
  gap: "8px",
  flex: "1 1 260px",
  minWidth: "min(100%, 260px)",
  padding: "10px 12px",
  borderRadius: "16px",
  border: "1px solid rgba(19, 57, 48, 0.08)",
  background: "rgba(255, 255, 255, 0.52)",
} as const;

const previewLinkGroupHeaderStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
} as const;

const previewLinkGroupLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "22px",
  padding: "0 8px",
  borderRadius: "999px",
  background: "rgba(15, 71, 57, 0.08)",
  color: "#0f4739",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.06em",
  lineHeight: 1,
  textTransform: "uppercase",
} as const;

const previewLinkGroupHintStyle = {
  color: "#53645d",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.2,
} as const;

const previewLinkGroupItemsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
} as const;

const previewLinkStyle = {
  justifyContent: "flex-start",
  gap: "10px",
  minWidth: 0,
  padding: "8px 12px",
  flex: "1 1 180px",
} as const;

const previewLinkCopyStyle = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
} as const;

const previewLinkTitleStyle = {
  color: "#143930",
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1.15,
} as const;

const previewLinkRouteStyle = {
  color: "#53645d",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.1,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  overflowWrap: "anywhere",
} as const;

const previewHealthLinkStyle = {
  ...previewLinkStyle,
  flex: "1 1 220px",
} as const;

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
          internalRoutes: "\uB0B4\uBD80 \uBBF8\uB9AC\uBCF4\uAE30",
          publicRoutes: "\uACF5\uAC1C \uC250",
          internalScopeHint: "\uB0B4\uBD80 \uC804\uC6A9",
          publicScopeHint: "\uACF5\uAC1C \uC9C4\uC785",
          apiTag: "API \uD5EC\uC2A4",
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
          internalRoutes: "Internal preview",
          publicRoutes: "Public shell",
          internalScopeHint: "Preview only",
          publicScopeHint: "Shareable",
          apiTag: "API health",
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
  const routeGroups = [
    {
      id: "internal",
      label: copy.internalRoutes,
      hint: copy.internalScopeHint,
      links: internalLinks,
    },
    {
      id: "public",
      label: copy.publicRoutes,
      hint: copy.publicScopeHint,
      links: publicLinks,
    },
  ] as const;

  return (
    <div className="preview-mode-banner-shell">
      <div className="preview-mode-banner">
        <div className="preview-mode-banner-copy">
          <span className="preview-mode-banner-label">{copy.label}</span>
          <p>{copy.body}</p>
        </div>
        <div className="preview-mode-banner-links">
          {routeGroups.map((group) => (
            <div key={group.id} style={previewLinkGroupStyle}>
              <div style={previewLinkGroupHeaderStyle}>
                <span style={previewLinkGroupLabelStyle}>{group.label}</span>
                <span style={previewLinkGroupHintStyle}>{group.hint}</span>
              </div>
              <div style={previewLinkGroupItemsStyle}>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="preview-mode-banner-link" style={previewLinkStyle}>
                    <span style={previewLinkCopyStyle}>
                      <span style={previewLinkTitleStyle}>{link.label}</span>
                      <span style={previewLinkRouteStyle}>{getPreviewRoutePath(link.href)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link
            href="/api/health"
            className="preview-mode-banner-link preview-mode-banner-link-subtle"
            style={previewHealthLinkStyle}
          >
            <span style={previewLinkCopyStyle}>
              <span style={previewLinkTitleStyle}>{copy.health}</span>
              <span style={previewLinkRouteStyle}>{getPreviewRoutePath("/api/health")}</span>
            </span>
            <span style={{ ...previewLinkGroupLabelStyle, background: "rgba(91, 103, 95, 0.08)", color: "#5b675f" }}>
              {copy.apiTag}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
