import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "./lib/i18n";
import {
  getPreviewAccessKey,
  hasPreviewAccess,
  PREVIEW_ACCESS_COOKIE_NAME,
} from "./lib/preview-access";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!hasLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  if (!getPreviewAccessKey()) {
    return;
  }

  const granted = hasPreviewAccess(request.cookies.get(PREVIEW_ACCESS_COOKIE_NAME)?.value);
  const isAccessPage = locales.some((locale) => pathname === `/${locale}/access`);

  if (!granted && !isAccessPage) {
    const locale = locales.find(
      (value) => pathname.startsWith(`/${value}/`) || pathname === `/${value}`,
    );

    if (locale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/access`;
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
  }
}

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico|.*\\..*).*)"],
};
