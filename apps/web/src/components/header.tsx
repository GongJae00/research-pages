"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import { useState } from "react";

import type { Dictionary } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { useAuth } from "./auth-provider";

import { LanguageSwitcher } from "./language-switcher";

interface HeaderProps {
  locale: string;
  dict: Dictionary;
}

const workspaceNavItems = [
  { key: "profile", href: "/profile" },
  { key: "affiliations", href: "/affiliations" },
  { key: "funding", href: "/funding" },
  { key: "documents", href: "/documents" },
  { key: "timetable", href: "/timetable" },
] as const;

const shellNavItems = [
  { key: "home", href: "" },
  { key: "ops", href: "/ops" },
] as const;

const mobileNavGroupStyle = {
  display: "grid",
  gap: "8px",
} as const;

const mobileNavGroupLabelStyle = {
  color: "#7c6d5d",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  lineHeight: 1,
  textTransform: "uppercase",
} as const;

const mobileShellLinkStyle = {
  display: "grid",
  justifyItems: "stretch",
  minHeight: "auto",
  padding: "10px 12px",
} as const;

const mobileShellLinkBodyStyle = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
} as const;

const mobileShellLinkHeaderStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
  minWidth: 0,
} as const;

const mobileShellScopeBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "18px",
  padding: "0 6px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  lineHeight: 1,
  textTransform: "uppercase",
} as const;

const mobileShellLinkMetaStyle = {
  color: "#7c6d5d",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.2,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  overflowWrap: "anywhere",
} as const;

function getOpsNavigationLabel(locale: string): string {
  return locale === "ko" ? "\uB0B4\uBD80 \uC635\uC2A4 \uBCF4\uB4DC" : "Internal ops board";
}

function getHomepageNavigationLabel(locale: string): string {
  return locale === "ko" ? "\uACF5\uAC1C \uD648\uD398\uC774\uC9C0" : "Public homepage";
}

function getShellSectionLabel(locale: string): string {
  return locale === "ko" ? "\uC250 \uC9C4\uC785\uC810" : "Shell entry points";
}

function getWorkspaceSectionLabel(locale: string): string {
  return locale === "ko" ? "\uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4" : "Workspace";
}

function getShellNavigationMeta(
  key: (typeof shellNavItems)[number]["key"],
  locale: string,
  href: string,
): string {
  if (key === "home") {
    return locale === "ko" ? `\uACF5\uAC1C \uACBD\uB85C | ${href}` : `Shareable route | ${href}`;
  }

  return locale === "ko" ? `\uB0B4\uBD80 \uBCF4\uB4DC \uACBD\uB85C | ${href}` : `Internal board route | ${href}`;
}

function getShellScopeLabel(key: (typeof shellNavItems)[number]["key"], locale: string): string {
  if (key === "home") {
    return locale === "ko" ? "\uACF5\uAC1C" : "Public";
  }

  return locale === "ko" ? "\uB0B4\uBD80" : "Internal";
}

function getNavigationLabel(
  key:
    | (typeof workspaceNavItems)[number]["key"]
    | (typeof shellNavItems)[number]["key"],
  locale: string,
  dict: Dictionary,
): string {
  if (key === "home") {
    return getHomepageNavigationLabel(locale);
  }

  if (key === "ops") {
    return getOpsNavigationLabel(locale);
  }

  return t(dict, `nav.${key}`);
}

function getPageTitle(pathname: string, locale: string, dict: Dictionary): string {
  const segment = pathname.replace(`/${locale}`, "").split("/").filter(Boolean)[0] ?? "profile";
  if (segment === "ops") {
    return getOpsNavigationLabel(locale);
  }
  return t(dict, `nav.${segment}`);
}

export function Header({ locale, dict }: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname, locale, dict);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentAccount } = useAuth();
  const shellSectionLabel = getShellSectionLabel(locale);
  const workspaceSectionLabel = getWorkspaceSectionLabel(locale);

  return (
    <header className="app-header">
      <div className="app-header-main">
        <div className="header-left">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="header-title">{pageTitle}</h1>
        </div>
        <div className="header-right">
          <div className="header-account-chip">
            <span>{currentAccount?.koreanName || currentAccount?.englishName || "Researcher"}</span>
          </div>
          <LanguageSwitcher locale={locale} />
          <button type="button" className="header-icon-btn" aria-label="Notifications">
            <Bell size={18} />
          </button>
        </div>
      </div>
      {mobileOpen ? (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <div style={mobileNavGroupStyle}>
            <span style={mobileNavGroupLabelStyle}>{shellSectionLabel}</span>
            {shellNavItems.map((item) => {
              const href = item.href ? `/${locale}${item.href}` : `/${locale}`;
              const active = item.href ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href || pathname === `${href}/`;

              return (
                <Link
                  key={item.key}
                  href={href}
                  className={`mobile-nav-link${active ? " mobile-nav-link-active" : ""}`}
                  style={mobileShellLinkStyle}
                  onClick={() => setMobileOpen(false)}
                >
                  <span style={mobileShellLinkBodyStyle}>
                    <span style={mobileShellLinkHeaderStyle}>
                      <span>{getNavigationLabel(item.key, locale, dict)}</span>
                      <span
                        style={{
                          ...mobileShellScopeBadgeStyle,
                          border: active ? "1px solid rgba(62, 48, 35, 0.16)" : "1px solid rgba(62, 48, 35, 0.12)",
                          background: active ? "rgba(62, 48, 35, 0.08)" : "rgba(255, 255, 255, 0.72)",
                          color: active ? "#1e1a16" : "#5d5349",
                        }}
                      >
                        {getShellScopeLabel(item.key, locale)}
                      </span>
                    </span>
                    <span style={mobileShellLinkMetaStyle}>{getShellNavigationMeta(item.key, locale, href)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
          <div style={mobileNavGroupStyle}>
            <span style={mobileNavGroupLabelStyle}>{workspaceSectionLabel}</span>
            {workspaceNavItems.map((item) => {
              const href = `/${locale}${item.href}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={item.key}
                  href={href}
                  className={`mobile-nav-link${active ? " mobile-nav-link-active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {getNavigationLabel(item.key, locale, dict)}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
