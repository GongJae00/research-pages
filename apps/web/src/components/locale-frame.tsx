"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import type { Dictionary, Locale } from "@/lib/i18n";

interface LocaleFrameProps {
  children: React.ReactNode;
  locale: Locale;
  dict: Dictionary;
}

const MarketingLocaleFrame = dynamic(() =>
  import("./locale-frame-marketing").then((module) => module.MarketingLocaleFrame),
);
const WorkspaceLocaleFrame = dynamic(() =>
  import("./locale-frame-workspace").then((module) => module.WorkspaceLocaleFrame),
);

export function LocaleFrame({ children, locale, dict }: LocaleFrameProps) {
  const pathname = usePathname();
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const isAccessPage = pathname === `/${locale}/access`;
  const isPublicResearcherPage = pathname.startsWith(`/${locale}/researcher/`);
  const isPublicLabPage = pathname.startsWith(`/${locale}/labs/`);
  const isMarketingRoute = isHome || isPublicResearcherPage || isPublicLabPage || isAccessPage;

  if (isMarketingRoute) {
    return (
      <MarketingLocaleFrame isAccessPage={isAccessPage} isHome={isHome} locale={locale} dict={dict}>
        {children}
      </MarketingLocaleFrame>
    );
  }

  return (
    <WorkspaceLocaleFrame locale={locale} dict={dict}>
      {children}
    </WorkspaceLocaleFrame>
  );
}
