import type { Locale } from "@/lib/i18n";

export const PREVIEW_ACCESS_COOKIE_NAME = "researchpages-preview-access";

export function getPreviewAccessKey() {
  return process.env.RESEARCH_PAGES_PREVIEW_ACCESS_KEY?.trim() ?? "";
}

export function isPreviewAccessEnabled() {
  return getPreviewAccessKey().length > 0;
}

export function hasPreviewAccess(cookieValue?: string | null) {
  const accessKey = getPreviewAccessKey();
  return accessKey.length === 0 || cookieValue === accessKey;
}

export function getPreviewAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function sanitizePreviewNextPath(candidate: string | undefined, locale: Locale) {
  if (!candidate) {
    return `/${locale}`;
  }

  try {
    const decoded = decodeURIComponent(candidate);
    if (decoded.startsWith(`/${locale}`)) {
      return decoded;
    }
  } catch {
    return `/${locale}`;
  }

  return `/${locale}`;
}
