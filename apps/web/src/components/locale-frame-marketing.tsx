"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import type { Dictionary, Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

import { AuthProvider } from "./auth-provider";
import { LanguageSwitcher } from "./language-switcher";
import { PreviewModeBanner } from "./preview-mode-banner";

interface MarketingLocaleFrameProps {
  children: React.ReactNode;
  locale: Locale;
  dict: Dictionary;
  isHome: boolean;
  isAccessPage: boolean;
}

const RBotDock = dynamic(() => import("./r-bot-dock").then((module) => module.RBotDock), {
  ssr: false,
});

export function MarketingLocaleFrame({
  children,
  locale,
  dict,
  isHome,
  isAccessPage,
}: MarketingLocaleFrameProps) {
  const headerLinks = [
    { href: "#overview", label: t(dict, "header.overview") },
    { href: "#workflow", label: t(dict, "header.workflow") },
    { href: "#modules", label: t(dict, "header.modules") },
    { href: "#outputs", label: t(dict, "header.outputs") },
    { href: "#security", label: t(dict, "header.security") },
  ];

  return (
    <AuthProvider>
      <header className="marketing-header">
        <Link href={`/${locale}`} className="marketing-brand">
          <span className="marketing-brand-mark">R</span>
          <span className="marketing-brand-text">ResearchPages</span>
        </Link>
        {isHome ? (
          <nav className="marketing-nav" aria-label="Primary">
            {headerLinks.map((item) => (
              <a key={item.href} href={item.href} className="marketing-nav-link">
                {item.label}
              </a>
            ))}
          </nav>
        ) : (
          <div className="marketing-nav marketing-nav-public-spacer" aria-hidden="true" />
        )}
        <div className="marketing-header-right">
          {!isAccessPage ? (
            <Link href={`/${locale}/profile`} className="marketing-header-cta">
              {t(dict, "common.openWorkspace")}
            </Link>
          ) : null}
          <LanguageSwitcher locale={locale} />
        </div>
      </header>
      {!isAccessPage ? <PreviewModeBanner locale={locale} /> : null}
      <main>{children}</main>
      <RBotDock locale={locale} />
    </AuthProvider>
  );
}
