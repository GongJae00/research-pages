import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { buildPublicResearcherPath } from "@/lib/public-profile";
import type { PublicLabPageData } from "@/lib/public-lab-server-store";

interface PublicLabPageProps {
  locale: Locale;
  data: PublicLabPageData;
}

function isLeadRole(roleTitle: string) {
  const normalized = roleTitle.trim().toLowerCase();
  return (
    normalized.includes("professor") ||
    normalized.includes("principal investigator") ||
    normalized.includes("pi") ||
    normalized.includes("lab lead") ||
    normalized.includes("director") ||
    normalized.includes("교수") ||
    normalized.includes("랩장") ||
    normalized.includes("책임")
  );
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

function formatResearchPeriod(
  locale: Locale,
  startDate: string,
  endDate: string | undefined,
  status: "ongoing" | "completed",
) {
  return `${startDate} - ${endDate ?? (locale === "ko" ? "진행중" : "Ongoing")} (${status === "ongoing" ? (locale === "ko" ? "진행중" : "Ongoing") : (locale === "ko" ? "종료" : "Completed")})`;
}

function joinParts(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" / ");
}

export function PublicLabPage({ locale, data }: PublicLabPageProps) {
  const isKo = locale === "ko";
  const professorRoster = data.people.filter((person) => isLeadRole(person.roleTitle));
  const memberRoster = data.people.filter((person) => !isLeadRole(person.roleTitle));
  const sectionLinks = [
    { href: "#public-lab-overview", label: isKo ? "개요" : "Overview" },
    { href: "#public-lab-people", label: "People" },
    { href: "#public-lab-research", label: "Research" },
    { href: "#public-lab-papers", label: "Papers" },
  ];

  const renderPersonCard = (person: PublicLabPageData["people"][number]) => {
    const displayName = person.koreanName || person.englishName || person.displayName;
    const secondaryName =
      person.koreanName && person.englishName && person.koreanName !== person.englishName
        ? person.englishName
        : undefined;
    const initials = (person.englishName || person.displayName || "R")
      .split(/\s+/)
      .map((chunk) => chunk[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const href = person.publicProfileSlug
      ? buildPublicResearcherPath(locale, person.publicProfileSlug)
      : null;
    const supportingText = joinParts([person.primaryInstitution, person.primaryDiscipline]);

    const body = (
      <>
        <div className="lab-person-avatar">
          {person.photoDataUrl ? (
            <Image
              src={person.photoDataUrl}
              alt={displayName}
              width={96}
              height={96}
              className="profile-photo-image"
              unoptimized
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="lab-person-meta">
          <div className="lab-person-name-stack">
            <strong>{displayName}</strong>
            {secondaryName ? <span>{secondaryName}</span> : null}
          </div>
          <p>{person.roleTitle}</p>
          {supportingText ? <p>{supportingText}</p> : null}
          {person.headline ? <p>{person.headline}</p> : null}
        </div>
        {href ? (
          <span className="public-lab-person-link">
            {isKo ? "연구자 페이지" : "Researcher page"}
            <ExternalLink size={13} />
          </span>
        ) : null}
      </>
    );

    if (!href) {
      return (
        <article className="lab-person-card public-lab-person-card" key={person.id}>
          {body}
        </article>
      );
    }

    return (
      <Link
        className="lab-person-card lab-person-card-link public-lab-person-card"
        href={href}
        key={person.id}
      >
        {body}
      </Link>
    );
  };

  return (
    <div className="page-standard public-lab-page-shell">
      <div className="page-header public-lab-page-header">
        <div>
          <p className="page-title">{isKo ? "공개 연구실 페이지" : "Public lab page"}</p>
          <h1 className="public-lab-page-title">{data.homepageTitle ?? data.name}</h1>
          <p className="page-subtitle">
            {data.homepageDescription ??
              data.summary ??
              (isKo
                ? "연구실 소개, People, 공개 논문을 구조화된 연구실 데이터에서 읽어오는 공개 페이지입니다."
                : "A public lab page generated from the structured lab profile, people, and shared paper data.")}
          </p>
        </div>
        <Link href={`/${locale}/lab`} className="secondary-cta">
          {isKo ? "워크스페이스 열기" : "Open workspace"}
        </Link>
      </div>

      <section className="card document-intro-card document-intro-card-compact lab-hub-hero public-lab-hero">
        <div className="lab-hub-hero-head">
          <div className="lab-hub-hero-copy">
            <span className="lab-section-eyebrow">{isKo ? "연구실 페이지" : "Lab page"}</span>
            <h2>{data.name}</h2>
            <p>
              {data.summary ??
                data.homepageDescription ??
                (isKo
                  ? "연구실의 공개 소개와 사람 구조를 이 페이지에서 먼저 보여줍니다."
                  : "This page leads with the public lab introduction and roster.")}
            </p>
          </div>
        </div>
      </section>

      <div
        className="document-filter-row profile-homepage-nav-row"
        aria-label={isKo ? "공개 연구실 섹션" : "Public lab sections"}
      >
        {sectionLinks.map((item) => (
          <a key={item.href} href={item.href} className="document-filter-chip profile-homepage-nav-link">
            {item.label}
          </a>
        ))}
      </div>

      <section
        className="card document-library-section lab-homepage-section public-lab-section"
        id="public-lab-overview"
      >
        <div className="card-header">
          <div>
            <h3>{isKo ? "개요" : "Overview"}</h3>
            <p className="card-support-text">
              {isKo
                ? "공개 연구실 페이지의 제목과 설명을 먼저 보여줍니다."
                : "Start with the public lab title and description."}
            </p>
          </div>
        </div>
        <div className="lab-note-body public-lab-overview-body">
          <strong>{data.homepageTitle ?? data.name}</strong>
          <p>
            {data.homepageDescription ??
              data.summary ??
              (isKo ? "아직 공개 설명이 없습니다." : "No public description yet.")}
          </p>
        </div>
      </section>

      <section
        className="card document-library-section lab-homepage-section public-lab-section"
        id="public-lab-people"
      >
        <div className="card-header">
          <div>
            <h3>People</h3>
            <p className="card-support-text">
              {isKo
                ? "공개 가능한 사람 정보만 추려 연구실 People 구조로 보여줍니다."
                : "Show the lab roster using public-safe profile fragments only."}
            </p>
          </div>
        </div>
        <div className="lab-people-stack">
          <div className="lab-people-group">
            <div className="lab-people-group-head">
              <div className="lab-people-group-title">
                <h4>Professor</h4>
                <span>{professorRoster.length}</span>
              </div>
            </div>
            <div className="lab-people-grid">
              {professorRoster.length ? (
                professorRoster.map(renderPersonCard)
              ) : (
                <div className="lab-empty-card">
                  {isKo ? "대표 연구자 정보가 아직 없습니다." : "No lead profile listed yet."}
                </div>
              )}
            </div>
          </div>

          <div className="lab-people-group">
            <div className="lab-people-group-head">
              <div className="lab-people-group-title">
                <h4>Members</h4>
                <span>{memberRoster.length}</span>
              </div>
            </div>
            <div className="lab-people-grid">
              {memberRoster.length ? (
                memberRoster.map(renderPersonCard)
              ) : (
                <div className="lab-empty-card">
                  {isKo ? "표시할 멤버가 아직 없습니다." : "No members to display yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        className="card document-library-section lab-homepage-section public-lab-section"
        id="public-lab-research"
      >
        <div className="card-header">
          <div>
            <h3>Research</h3>
            <p className="card-support-text">
              {isKo
                ? "진행 중 연구를 위에 두고, 종료된 연구는 아래에 정리한 공개 연구 목록입니다."
                : "A public project timeline with active work first and completed work below."}
            </p>
          </div>
        </div>
        <div className="lab-publication-list lab-research-list">
          {data.researchProjects.length ? (
            data.researchProjects.map((project) => (
              <article className="lab-publication-row lab-research-row public-lab-publication-row" key={project.id}>
                <div className="lab-research-period">
                  <span className={`pill ${project.status === "ongoing" ? "pill-green" : "pill-gray"}`}>
                    {project.status === "ongoing"
                      ? isKo
                        ? "진행중"
                        : "Ongoing"
                      : isKo
                        ? "종료"
                        : "Completed"}
                  </span>
                  <strong>
                    {formatResearchPeriod(
                      locale,
                      project.startDate,
                      project.endDate,
                      project.status,
                    )}
                  </strong>
                </div>
                <div className="lab-publication-main">
                  <div className="lab-publication-head">
                    <strong>{project.title}</strong>
                  </div>
                  {project.summary ? <p className="card-support-text">{project.summary}</p> : null}
                  <div className="lab-publication-meta public-lab-publication-meta">
                    <span>{isKo ? "과제명" : "Program"}: {project.program}</span>
                    <span>{isKo ? "사업/출처" : "Sponsor"}: {project.sponsor}</span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="lab-empty-card">
              {isKo ? "공개된 연구 프로젝트가 아직 없습니다." : "No public research projects yet."}
            </div>
          )}
        </div>
      </section>

      <section
        className="card document-library-section lab-homepage-section public-lab-section"
        id="public-lab-papers"
      >
        <div className="card-header">
          <div>
            <h3>Papers</h3>
            <p className="card-support-text">
              {isKo
                ? "연구실에서 공개로 전환한 논문만 모아 보여줍니다."
                : "Only papers intentionally shared by the lab appear here."}
            </p>
          </div>
        </div>
        <div className="lab-publication-list">
          {data.papers.length ? (
            data.papers.map((paper) => (
              <article className="lab-publication-row public-lab-publication-row" key={paper.id}>
                <div className="lab-publication-main">
                  <div className="lab-publication-head">
                    <strong>{paper.title}</strong>
                    <div className="lab-publication-pill-row">
                      {paper.journalClass ? <span className="pill pill-gray">{paper.journalClass}</span> : null}
                      {paper.authorRole ? <span className="pill pill-blue">{paper.authorRole}</span> : null}
                    </div>
                  </div>
                  <div className="lab-publication-meta public-lab-publication-meta">
                    {paper.journalName ? <span>{paper.journalName}</span> : null}
                    {paper.publisher ? <span>{paper.publisher}</span> : null}
                    <span>{formatMonth(locale, paper.publishedOn)}</span>
                    {paper.participants ? <span>{paper.participants}</span> : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="lab-empty-card">
              {isKo ? "공개된 논문이 아직 없습니다." : "No public papers yet."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
