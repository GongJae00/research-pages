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

const navItems = [
  { key: "profile", href: "/profile" },
  { key: "affiliations", href: "/affiliations" },
  { key: "funding", href: "/funding" },
  { key: "documents", href: "/documents" },
  { key: "timetable", href: "/timetable" },
  { key: "ops", href: "/ops" },
] as const;

function getPageTitle(pathname: string, locale: string, dict: Dictionary): string {
  const segment = pathname.replace(`/${locale}`, "").split("/").filter(Boolean)[0] ?? "profile";
  if (segment === "ops") {
    return locale === "ko" ? "에이전트 관제실" : "Agent Ops";
  }
  return t(dict, `nav.${segment}`);
}

export function Header({ locale, dict }: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname, locale, dict);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentAccount } = useAuth();

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
          {navItems.map((item) => {
            const href = `/${locale}${item.href}`;
            const active = pathname.startsWith(href);

            return (
              <Link
                key={item.key}
                href={href}
                className={`mobile-nav-link${active ? " mobile-nav-link-active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                {t(dict, `nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
