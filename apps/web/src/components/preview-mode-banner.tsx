import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { getDemoPreviewLinks, isDemoPreviewRuntimeEnabled } from "@/lib/demo-preview";

interface PreviewModeBannerProps {
  locale: Locale;
}

export function PreviewModeBanner({ locale }: PreviewModeBannerProps) {
  if (!isDemoPreviewRuntimeEnabled()) {
    return null;
  }

  const links = getDemoPreviewLinks();
  const copy =
    locale === "ko"
      ? {
          label: "내부 데모 프리뷰",
          body: "이 배포에서는 데모 워크스페이스, 퍼블릭 페이지, 내부 에이전트 관제실 화면을 함께 검토할 수 있습니다.",
          workspace: "워크스페이스",
          ops: "에이전트 관제실",
          researcher: "연구자 페이지",
          lab: "랩 페이지",
          health: "헬스",
        }
      : {
          label: "Internal demo preview",
          body: "This deployment exposes the demo workspace, public pages, and internal agent ops surfaces for review.",
          workspace: "Workspace",
          ops: "Agent ops",
          researcher: "Public researcher page",
          lab: "Public lab page",
          health: "Health",
        };

  return (
    <div className="preview-mode-banner-shell">
      <div className="preview-mode-banner">
        <span className="preview-mode-banner-label">{copy.label}</span>
        <div className="preview-mode-banner-links">
          <Link href={`/${locale}/profile`} className="preview-mode-banner-link">
            {copy.workspace}
          </Link>
          <Link href={`/${locale}/ops`} className="preview-mode-banner-link">
            {copy.ops}
          </Link>
          <Link href={links.researcher[locale]} className="preview-mode-banner-link">
            {copy.researcher}
          </Link>
          <Link href={links.lab[locale]} className="preview-mode-banner-link">
            {copy.lab}
          </Link>
          <Link href="/api/health" className="preview-mode-banner-link preview-mode-banner-link-subtle">
            {copy.health}
          </Link>
        </div>
      </div>
    </div>
  );
}
