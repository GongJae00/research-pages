import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import type { PublicResearcherPageData } from "@/lib/public-profile-server-store";

interface PublicResearcherPageProps {
  locale: Locale;
  data: PublicResearcherPageData;
}

function formatMonth(locale: Locale, value?: string) {
  if (!value) {
    return locale === "ko" ? "일정 미정" : "Date pending";
  }

  const date = new Date(value.length === 7 ? `${value}-01` : value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(date);
}

function formatPeriod(locale: Locale, startDate: string, endDate?: string) {
  const start = formatMonth(locale, startDate);
  const end = endDate ? formatMonth(locale, endDate) : locale === "ko" ? "현재" : "Present";
  return `${start} - ${end}`;
}

function joinParts(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" / ");
}

export function PublicResearcherPage({ locale, data }: PublicResearcherPageProps) {
  const isKo = locale === "ko";
  const displayName = data.koreanName || data.englishName || data.displayName;
  const secondaryName =
    data.koreanName && data.englishName && data.koreanName !== data.englishName
      ? data.englishName
      : undefined;
  const initials = (data.englishName || data.displayName || "R")
    .split(/\s+/)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const primaryAffiliation = data.affiliations.find((item) => item.active) ?? data.affiliations[0] ?? null;
  const heroMeta = joinParts([
    primaryAffiliation?.roleTitle,
    primaryAffiliation?.labName,
    primaryAffiliation?.institutionName ?? data.primaryInstitution,
  ]);
  const heroSubmeta = joinParts([data.primaryDiscipline, data.orcid ? `ORCID ${data.orcid}` : undefined]);
  const sectionLinks = [
    { href: "#public-profile-overview", label: isKo ? "기본 정보" : "Overview" },
    { href: "#public-profile-experience", label: isKo ? "소속 이력" : "Experience" },
    { href: "#public-profile-papers", label: isKo ? "논문" : "Papers" },
  ];

  return (
    <div className="page-standard public-researcher-page-shell">
      <div className="page-header public-researcher-page-header">
        <div>
          <p className="page-title">{isKo ? "공개 연구자 페이지" : "Public researcher page"}</p>
          <h1 className="public-researcher-page-title">{displayName}</h1>
          <p className="page-subtitle">
            {isKo
              ? "평소 관리하던 프로필, 소속 이력, 논문 정보를 바탕으로 만들어지는 공개 연구자 페이지입니다."
              : "A public researcher page generated from the profile, affiliation history, and paper metadata maintained in the workspace."}
          </p>
        </div>
        <Link href={`/${locale}/profile`} className="secondary-cta">
          {isKo ? "워크스페이스 열기" : "Open workspace"}
        </Link>
      </div>

      <section className="card document-intro-card document-intro-card-compact profile-homepage-hero public-researcher-hero">
        <div className="profile-hero-grid document-intro-top profile-homepage-hero-top">
          <div className="profile-hero-main">
            <div className="profile-photo-frame profile-photo-frame-view profile-photo-frame-compact">
              {data.photoDataUrl ? (
                <Image
                  src={data.photoDataUrl}
                  alt={displayName}
                  width={320}
                  height={320}
                  className="profile-photo-image"
                  unoptimized
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="profile-hero-copy">
              <div className="profile-identity-stack">
                <strong className="profile-unified-name">{displayName}</strong>
                {secondaryName ? <span className="profile-unified-subname">{secondaryName}</span> : null}
              </div>
              {primaryAffiliation ? (
                <span className="profile-hero-role-badge">{primaryAffiliation.roleTitle}</span>
              ) : null}
              {data.headline ? <p className="profile-hero-meta">{data.headline}</p> : null}
              {heroMeta ? <p className="profile-hero-submeta">{heroMeta}</p> : null}
              {heroSubmeta ? <p className="profile-hero-keywords">{heroSubmeta}</p> : null}
              {data.links.length > 0 ? (
                <div className="profile-hero-link-row">
                  {data.links.map((link) => (
                    <a
                      key={`${link.kind}-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="profile-hero-link-chip"
                    >
                      <span>{link.label ?? link.kind.replace(/_/g, " ")}</span>
                      <ExternalLink size={13} />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="document-filter-row profile-homepage-nav-row" aria-label={isKo ? "공개 섹션" : "Public sections"}>
        {sectionLinks.map((item) => (
          <a key={item.href} href={item.href} className="document-filter-chip profile-homepage-nav-link">
            {item.label}
          </a>
        ))}
      </div>

      <section
        className="card document-library-section profile-section-shell profile-homepage-section"
        id="public-profile-overview"
      >
        <div className="profile-section-rail document-section-header">
          <div className="profile-section-heading">
            <h3>{isKo ? "기본 정보" : "Overview"}</h3>
            <p>
              {isKo
                ? "공개 페이지에서 바로 읽어야 하는 연구자 기본 정보를 압축해서 보여줍니다."
                : "Condensed public researcher information for a quick first pass."}
            </p>
          </div>
        </div>
        <div className="profile-section-content">
          <div className="profile-core-table public-researcher-core-table">
            <div className="profile-core-row">
              <span>{isKo ? "주 소속" : "Primary institution"}</span>
              <strong>{data.primaryInstitution ?? primaryAffiliation?.institutionName ?? (isKo ? "미정" : "Pending")}</strong>
            </div>
            <div className="profile-core-row">
              <span>{isKo ? "연구 분야" : "Research field"}</span>
              <strong>{data.primaryDiscipline ?? (isKo ? "아직 정리되지 않았습니다." : "Not filled in yet.")}</strong>
            </div>
            <div className="profile-core-row">
              <span>ORCID</span>
              <strong>{data.orcid ?? (isKo ? "없음" : "Not provided")}</strong>
            </div>
            <div className="profile-core-row">
              <span>{isKo ? "키워드" : "Keywords"}</span>
              <strong>{data.keywords.length > 0 ? data.keywords.join(" / ") : isKo ? "아직 정리되지 않았습니다." : "Not filled in yet."}</strong>
            </div>
          </div>
        </div>
      </section>

      <section
        className="card document-library-section profile-section-shell profile-homepage-section"
        id="public-profile-experience"
      >
        <div className="profile-section-rail document-section-header">
          <div className="profile-section-heading">
            <h3>{isKo ? "소속 이력" : "Experience"}</h3>
            <p>
              {isKo
                ? "학교, 연구실, 프로젝트 단위 역할을 시간 순서대로 정리합니다."
                : "Roles across institutions, labs, and projects in time order."}
            </p>
          </div>
        </div>
        <div className="profile-section-content">
          {data.affiliations.length > 0 ? (
            <div className="profile-history-list">
              {data.affiliations.map((affiliation) => (
                <article key={affiliation.id} className="profile-history-item-compact">
                  <div className="profile-history-period">
                    <strong>{formatPeriod(locale, affiliation.startDate, affiliation.endDate)}</strong>
                    <span>{affiliation.active ? (isKo ? "진행 중" : "Active") : isKo ? "종료" : "Completed"}</span>
                  </div>
                  <div className="profile-history-body">
                    <strong>{affiliation.roleTitle}</strong>
                    <p>{joinParts([affiliation.labName, affiliation.institutionName, affiliation.department])}</p>
                    {affiliation.notes ? <span>{affiliation.notes}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="public-researcher-empty">{isKo ? "공개된 소속 이력이 아직 없습니다." : "No public affiliation history yet."}</div>
          )}
        </div>
      </section>

      <section
        className="card document-library-section profile-section-shell profile-homepage-section"
        id="public-profile-papers"
      >
        <div className="profile-section-rail document-section-header">
          <div className="profile-section-heading">
            <h3>{isKo ? "논문" : "Papers"}</h3>
            <p>
              {isKo
                ? "논문 제목, 저자, 학술지 정보를 bibliography 형태로 압축해서 보여줍니다."
                : "A bibliography-style list of titles, authors, and publication venues."}
            </p>
          </div>
        </div>
        <div className="profile-section-content">
          {data.publications.length > 0 ? (
            <div className="profile-paper-list">
              {data.publications.map((publication) => (
                <article key={publication.id} className="profile-paper-row">
                  <div className="public-researcher-paper-meta">
                    <span>{formatMonth(locale, publication.publishedOn)}</span>
                    {publication.journalClass ? <span>{publication.journalClass}</span> : null}
                  </div>
                  <div className="public-researcher-paper-main">
                    <strong>{publication.title}</strong>
                    <p>{joinParts([publication.participants, publication.journalName, publication.publisher])}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="public-researcher-empty">{isKo ? "공개된 논문 정보가 아직 없습니다." : "No public papers yet."}</div>
          )}
        </div>
      </section>
    </div>
  );
}
