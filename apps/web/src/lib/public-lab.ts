import type { Locale } from "@/lib/i18n";

function normalizeSlugBase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizePublicLabSlug(value: string | null | undefined) {
  return normalizeSlugBase(value ?? "");
}

export function buildPublicLabPath(locale: Locale, slug: string) {
  return `/${locale}/labs/${encodeURIComponent(normalizePublicLabSlug(slug) || slug)}`;
}
