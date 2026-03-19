"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary, Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { AuthProvider, WorkspaceAuthGate } from "./auth-provider";
import { Header } from "./header";
import { LanguageSwitcher } from "./language-switcher";
import { Sidebar } from "./sidebar";

interface LocaleFrameProps {
  children: React.ReactNode;
  locale: Locale;
  dict: Dictionary;
}

export function LocaleFrame({ children, locale, dict }: LocaleFrameProps) {
  const pathname = usePathname();
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const isPublicResearcherPage = pathname.startsWith(`/${locale}/researcher/`);
  const isPublicLabPage = pathname.startsWith(`/${locale}/labs/`);

  if (isHome || isPublicResearcherPage || isPublicLabPage) {
    const headerLinks = [
      { href: "#overview", label: t(dict, "header.overview") },
      { href: "#workflow", label: t(dict, "header.workflow") },
      { href: "#modules", label: t(dict, "header.modules") },
      { href: "#outputs", label: t(dict, "header.outputs") },
      { href: "#security", label: t(dict, "header.security") },
    ];

    return (
      <>
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
            <Link href={`/${locale}/profile`} className="marketing-header-cta">
              {t(dict, "common.openWorkspace")}
            </Link>
            <LanguageSwitcher locale={locale} />
          </div>
        </header>
        <main>{children}</main>
      </>
    );
  }

  return (
    <AuthProvider>
      <WorkspaceAuthGate locale={locale}>
        <div className="app-layout">
          <Sidebar locale={locale} dict={dict} />
          <div className="app-main">
            <Header locale={locale} dict={dict} />
            <main className="app-content">{children}</main>
          </div>
        </div>
      </WorkspaceAuthGate>
    </AuthProvider>
  );
}
