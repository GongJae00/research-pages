import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import {
  hasPreviewAccess,
  isPreviewAccessEnabled,
  PREVIEW_ACCESS_COOKIE_NAME,
  sanitizePreviewNextPath,
} from "@/lib/preview-access";

interface AccessPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function PreviewAccessPage({
  params,
  searchParams,
}: AccessPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const nextPath = sanitizePreviewNextPath(query.next, locale);
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(PREVIEW_ACCESS_COOKIE_NAME)?.value;

  if (!isPreviewAccessEnabled() || hasPreviewAccess(existingCookie)) {
    redirect(nextPath);
  }

  const copy =
    locale === "ko"
      ? {
          eyebrow: "내부 미리보기 접근",
          title: "이 링크는 내부 확인용입니다. 접근 키를 입력하고 계속 진행하세요.",
          body: "팀 내부 검토 링크를 보호하는 가벼운 접근 레이어입니다. 공유받은 접근 키를 입력하면 현재 배포를 바로 확인할 수 있습니다.",
          label: "접근 키",
          placeholder: "공유받은 접근 키를 입력하세요",
          button: "계속 보기",
          error: "접근 키가 올바르지 않습니다.",
          returnLabel: "홈으로 이동",
        }
      : {
          eyebrow: "Internal preview access",
          title: "This link is for internal review. Enter the access key to continue.",
          body: "This lightweight gate protects internal preview links. Enter the shared access key to open the current deployment.",
          label: "Access key",
          placeholder: "Enter the shared access key",
          button: "Continue",
          error: "The access key is incorrect.",
          returnLabel: "Back to home",
        };

  return (
    <section className="preview-access-shell">
      <div className="preview-access-card">
        <div className="preview-access-copy">
          <span className="preview-access-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
        </div>
        <form action="/api/preview-access" method="post" className="preview-access-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={nextPath} />
          <label className="preview-access-field">
            <span>{copy.label}</span>
            <input
              type="password"
              name="accessKey"
              placeholder={copy.placeholder}
              autoComplete="current-password"
              required
            />
          </label>
          {query.error === "1" ? (
            <p className="preview-access-error" role="alert">
              {copy.error}
            </p>
          ) : null}
          <div className="preview-access-actions">
            <button type="submit" className="preview-access-submit">
              {copy.button}
            </button>
            <Link href={`/${locale}`} className="preview-access-link">
              {copy.returnLabel}
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
