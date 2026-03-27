"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Calendar,
  FileText,
  FlaskConical,
  Globe2,
  LayoutGrid,
  LogOut,
  Plus,
  User,
  Users,
  Wallet,
} from "lucide-react";

import type { Dictionary } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { useAuth } from "./auth-provider";

interface SidebarProps {
  locale: string;
  dict: Dictionary;
}

const personalNavItems = [
  { key: "profile", icon: User, href: "/profile" },
  { key: "affiliations", icon: FlaskConical, href: "/affiliations" },
  { key: "funding", icon: Wallet, href: "/funding" },
  { key: "documents", icon: FileText, href: "/documents" },
  { key: "timetable", icon: Calendar, href: "/timetable" },
] as const;

const shellNavItems = [
  { key: "home", icon: Globe2, href: "" },
  { key: "ops", icon: LayoutGrid, href: "/ops" },
] as const;

const shellNavLabelStyle = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
} as const;

const shellNavTitleRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
  minWidth: 0,
} as const;

const shellNavHintStyle = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.01em",
  lineHeight: 1.2,
  overflowWrap: "anywhere",
} as const;

const shellNavScopeBadgeStyle = {
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

function getOpsNavigationLabel(locale: string): string {
  return locale === "ko" ? "내부 옵스 보드" : "Internal ops board";
}

function getHomepageNavigationLabel(locale: string): string {
  if (locale === "ko") {
    return "\uACF5\uAC1C \uD648\uD398\uC774\uC9C0";
  }

  if (locale === "en") {
    return "Public homepage";
  }

  return locale === "ko" ? "홈페이지 셸" : "Homepage shell";
}

function getNavigationLabel(
  key: (typeof personalNavItems)[number]["key"] | Exclude<(typeof shellNavItems)[number]["key"], "home">,
  locale: string,
  dict: Dictionary,
): string {
  if (key === "ops") {
    return getOpsNavigationLabel(locale);
  }

  return t(dict, `nav.${key}`);
}

function getShellNavigationHint(
  key: (typeof shellNavItems)[number]["key"],
  href: string,
  locale: string,
) {
  if (key === "home") {
    return locale === "ko" ? `\uACF5\uAC1C \uC9C4\uC785 \uACBD\uB85C: ${href}` : `Shareable route: ${href}`;
  }

  return locale === "ko" ? `\uB0B4\uBD80 \uBCF4\uB4DC \uACBD\uB85C: ${href}` : `Internal board route: ${href}`;
}

function getShellNavigationScopeLabel(
  key: (typeof shellNavItems)[number]["key"],
  locale: string,
) {
  if (key === "home") {
    return locale === "ko" ? "\uACF5\uAC1C" : "Public";
  }

  return locale === "ko" ? "\uB0B4\uBD80" : "Internal";
}

function getShellNavigationScopeBadgeStyle(
  key: (typeof shellNavItems)[number]["key"],
  active: boolean,
) {
  if (key === "home") {
    return active
      ? {
          border: "1px solid rgba(252, 231, 168, 0.34)",
          background: "rgba(252, 231, 168, 0.16)",
          color: "#fff2c6",
        }
      : {
          border: "1px solid rgba(252, 231, 168, 0.24)",
          background: "rgba(252, 231, 168, 0.08)",
          color: "#f7e7b7",
        };
  }

  return active
    ? {
        border: "1px solid rgba(167, 243, 208, 0.34)",
        background: "rgba(16, 185, 129, 0.18)",
        color: "#d1fae5",
      }
    : {
        border: "1px solid rgba(167, 243, 208, 0.24)",
        background: "rgba(16, 185, 129, 0.12)",
        color: "#b7f0d3",
      };
}

export function Sidebar({ locale, dict }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentAccount, labs, signOut } = useAuth();
  const activeLabSlug = searchParams.get("lab");
  const copy =
    locale === "ko"
      ? {
          personal: "내 공간",
          shell: "진입 경로",
          labs: "연구실",
          labHub: "연구실 허브",
          openLab: "연구실 열기",
          members: "명",
          emptyLabs: "아직 참여한 연구실이 없습니다",
        }
      : {
          personal: "Personal",
          shell: "Entry points",
          labs: "Labs",
          labHub: "Lab hub",
          openLab: "Open labs",
          members: "members",
          emptyLabs: "No labs joined yet",
        };
  const shellSectionTitle =
    locale === "ko" ? "\uACF5\uAC1C \uC250 / \uB0B4\uBD80 \uBCF4\uB4DC" : "Public shell / internal board";

  const isActive = (href: string) => {
    const full = `/${locale}${href}`;

    if (!href) {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }

    return pathname === full || pathname.startsWith(`${full}/`);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <FlaskConical size={24} className="sidebar-logo-icon" />
        <span className="sidebar-logo-text">ResearchPages</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-group">
          <div className="sidebar-group-header">
            <span className="sidebar-group-title">{copy.personal}</span>
          </div>
          {personalNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                href={`/${locale}${item.href}`}
                className={`sidebar-link${active ? " sidebar-link-active" : ""}`}
              >
                <Icon size={18} />
                <span>{getNavigationLabel(item.key, locale, dict)}</span>
              </Link>
            );
          })}
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-header">
            <span className="sidebar-group-title">{shellSectionTitle}</span>
          </div>
          {shellNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const href = item.href ? `/${locale}${item.href}` : `/${locale}`;
            const label =
              item.key === "home"
                ? getHomepageNavigationLabel(locale)
                : getNavigationLabel(item.key, locale, dict);
            const hint = getShellNavigationHint(item.key, href, locale);
            const scopeLabel = getShellNavigationScopeLabel(item.key, locale);
            const scopeBadgeStyle = getShellNavigationScopeBadgeStyle(item.key, active);

            return (
              <Link key={item.key} href={href} className={`sidebar-link${active ? " sidebar-link-active" : ""}`}>
                <Icon size={18} />
                <span style={shellNavLabelStyle}>
                  <span style={shellNavTitleRowStyle}>
                    <span>{label}</span>
                    <span
                      style={{
                        ...shellNavScopeBadgeStyle,
                        ...scopeBadgeStyle,
                      }}
                    >
                      {scopeLabel}
                    </span>
                  </span>
                  <span
                    style={{
                      ...shellNavHintStyle,
                      opacity: active ? 0.92 : 0.72,
                    }}
                  >
                    {hint}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="sidebar-group sidebar-group-labs">
          <div className="sidebar-group-header">
            <span className="sidebar-group-title">{copy.labs}</span>
            <Link href={`/${locale}/lab`} className="sidebar-group-action" aria-label={copy.openLab}>
              <Plus size={14} />
            </Link>
          </div>

          <Link
            href={`/${locale}/lab`}
            className={`sidebar-link sidebar-link-lab-hub${isActive("/lab") && !activeLabSlug ? " sidebar-link-active" : ""}`}
          >
            <Users size={18} />
            <span>{copy.labHub}</span>
          </Link>

          {labs.length === 0 ? (
            <div className="sidebar-lab-empty">{copy.emptyLabs}</div>
          ) : (
            <div className="sidebar-lab-list">
              {labs.map((lab) => {
                const active = pathname.startsWith(`/${locale}/lab`) && activeLabSlug === lab.slug;

                return (
                  <Link
                    key={lab.id}
                    href={`/${locale}/lab?lab=${lab.slug}`}
                    className={`sidebar-lab-link${active ? " sidebar-lab-link-active" : ""}`}
                  >
                    <div className="sidebar-lab-link-copy">
                      <strong>{lab.name}</strong>
                      <span>
                        {lab.members.length} {copy.members}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile-mini">
          <div className="sidebar-avatar">
            {(currentAccount?.koreanName || currentAccount?.englishName || "R").slice(0, 1)}
          </div>
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">
              {currentAccount?.koreanName || currentAccount?.englishName || "ResearchPages"}
            </span>
            <span className="sidebar-profile-role">
              {currentAccount?.primaryEmail || "Researcher"}
            </span>
          </div>
        </div>
        <button type="button" className="sidebar-signout-btn" onClick={signOut}>
          <LogOut size={15} />
          <span>{locale === "ko" ? "로그아웃" : "Sign out"}</span>
        </button>
      </div>
    </aside>
  );
}
