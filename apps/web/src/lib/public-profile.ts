import type { Locale } from "@/lib/i18n";

function normalizeSlugBase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizePublicProfileSlug(value: string | null | undefined) {
  return normalizeSlugBase(value ?? "");
}

export function buildDefaultPublicProfileSlug(input: {
  englishName?: string | null;
  displayName?: string | null;
  accountId?: string | null;
}) {
  const fromName =
    normalizeSlugBase(input.englishName ?? "") || normalizeSlugBase(input.displayName ?? "");

  if (fromName) {
    return fromName;
  }

  const accountTail = (input.accountId ?? "").replace(/[^a-z0-9]+/gi, "").toLowerCase();
  return accountTail ? `researcher-${accountTail.slice(0, 12)}` : "researcher-page";
}

export function buildPublicResearcherPath(locale: Locale, slug: string) {
  return `/${locale}/researcher/${encodeURIComponent(normalizePublicProfileSlug(slug) || slug)}`;
}
