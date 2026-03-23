import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale } from "@/lib/i18n";
import {
  getPreviewAccessCookieOptions,
  getPreviewAccessKey,
  isPreviewAccessEnabled,
  PREVIEW_ACCESS_COOKIE_NAME,
  sanitizePreviewNextPath,
} from "@/lib/preview-access";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const submittedKey = String(formData.get("accessKey") ?? "").trim();
  const localeValue = String(formData.get("locale") ?? defaultLocale);
  const locale = isLocale(localeValue) ? localeValue : defaultLocale;
  const nextPath = sanitizePreviewNextPath(String(formData.get("next") ?? ""), locale);

  if (!isPreviewAccessEnabled()) {
    return NextResponse.redirect(new URL(nextPath, request.url), 303);
  }

  if (submittedKey !== getPreviewAccessKey()) {
    const accessUrl = new URL(`/${locale}/access`, request.url);
    accessUrl.searchParams.set("next", nextPath);
    accessUrl.searchParams.set("error", "1");
    return NextResponse.redirect(accessUrl, 303);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set(PREVIEW_ACCESS_COOKIE_NAME, submittedKey, getPreviewAccessCookieOptions());
  return response;
}
