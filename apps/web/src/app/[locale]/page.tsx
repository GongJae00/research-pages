import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  FileText,
  Globe2,
  ShieldCheck,
  UserCircle2,
  Users,
  Wallet,
} from "lucide-react";

import { HomepageAgentControlSection } from "@/components/homepage-agent-control-section";
import { dashboardSnapshot } from "@/lib/dashboard-snapshot";
import { isDemoPreviewRuntimeEnabled } from "@/lib/demo-preview";
import { getLiveAgentOperationsSnapshot } from "@/lib/agent-ops-runtime";
import { getDictionary, t } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
}

const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const careerDocumentTypes = new Set(["cv", "statement", "bio", "self_introduction"]);

const landingCopy = {
  ko: {
    heroEyebrow: "대학 연구자를 위한 개인·연구실 페이지 플랫폼",
    heroTitle: "연구 데이터를\n개인·연구실 페이지로\n바로 이어줍니다.",
    heroBody:
      "필요할 때 급히 모으는 대신, 프로필·링크·소속·연구비·문서·시간표를 평소에 관리해두고 CV, SOP, 연구자 페이지, 연구실 페이지로 바로 이어지게 합니다.",
    heroPrimaryCta: "워크스페이스 열기",
    heroSecondaryCta: "핵심 화면 보기",
    heroProof: [
      "GitHub, 홈페이지, Google Scholar 같은 대표 링크를 프로필 원본 데이터로 유지합니다.",
      "CV, SOP, Bio 초안을 문서 저장소에서 계속 업데이트하고 필요할 때 바로 다운로드합니다.",
      "연구자 페이지와 연구실 페이지가 같은 데이터 구조를 공유해 다시 정리할 일이 줄어듭니다.",
    ],
    researcherPage: "Researcher page",
    readyTitle: "계속 업데이트되는 연구자 표면",
    readyBody:
      "컨택, 지원, 소개 페이지 작업이 닥쳤을 때 새로 모으지 않도록, 링크와 대표 문서까지 평소 관리하는 구조를 먼저 만듭니다.",
    careerKit: "Career documents",
    careerTitle: "CV · SOP · Bio 초안",
    careerBody:
      "개인 문서함에 대충 넣어둔 초안이 아니라, 계속 고치고 다시 열고 다운로드하는 커리어 문서 흐름을 기본으로 둡니다.",
    labPage: "Lab page",
    labTitle: "연구실 페이지 구조",
    labBody:
      "People, Research, Papers, Documents, Timetable을 한 연구실 범위에서 관리하고 그대로 공개 페이지로 확장합니다.",
    openPage: "열기",
    flowKicker: "운영 흐름",
    flowTitle: "평소 관리한 정보가 다음 결과물로 이어집니다.",
    flowLead:
      "ResearchPages는 기록을 쌓는 도구가 아니라, 다음 컨택 메일, 지원 패키지, 연구자 페이지를 더 빨리 만들기 위한 운영 기반입니다.",
    flow: [
      {
        step: "01",
        title: "연구자 기본 정보 유지",
        body: "이름, 이메일, 소속, GitHub, 홈페이지, 관심 분야를 평소에 갱신해 언제든 자기 소개가 가능한 상태를 유지합니다.",
      },
      {
        step: "02",
        title: "커리어 문서 초안 누적",
        body: "CV, SOP, Bio, 연구계획서 같은 문서를 문서 저장소에서 계속 다듬고, 필요할 때 다시 열고 내보냅니다.",
      },
      {
        step: "03",
        title: "연구실 협업과 공개 페이지 연결",
        body: "People, Research, Papers, Documents, Timetable을 연구실 범위에서 관리하고 공개 페이지까지 같은 구조로 이어갑니다.",
      },
    ],
    surfacesKicker: "핵심 화면",
    surfacesTitle: "내부 페이지와 같은 문법으로 첫 화면을 보여줍니다.",
    surfacesLead:
      "문서 페이지의 밀도와 정렬을 기준으로 프로필, 연구비, 시간표, 연구실 화면이 같은 제품처럼 보이도록 맞춥니다.",
    labHubTitle: "연구실 허브",
    labHubBody: "People, Research, Papers, Documents, Timetable을 한 연구실 범위에서 관리합니다.",
    outputsKicker: "최종 결과",
    outputsTitle: "정리된 데이터보다 바로 쓰는 결과물이 더 중요합니다.",
    outputsLead:
      "ResearchPages는 저장 자체보다도 다음 컨택, 지원, 소개, 공개 페이지 제작에 바로 쓰일 수 있는 결과물을 만드는 쪽에 초점을 둡니다.",
    outputs: [
      {
        title: "연구자 페이지",
        body: "프로필 링크, 소속, 관심 분야, 대표 문서를 바탕으로 개인 연구자 페이지를 만듭니다.",
      },
      {
        title: "연구실 페이지",
        body: "People, Research, Papers, Documents, Timetable 구조를 그대로 연구실 소개 페이지로 확장합니다.",
      },
      {
        title: "CV · SOP 패키지",
        body: "문서 저장소에 쌓아둔 초안 문서를 다시 열고 정리한 뒤 바로 다운로드합니다.",
      },
      {
        title: "공유 자산 관리",
        body: "연구실 범위 자료와 개인 범위 자료를 나누면서도 연결된 운영 흐름을 유지합니다.",
      },
    ],
    securityKicker: "보안 구조",
    securityTitle: "민감한 정보는 기본적으로 닫혀 있어야 합니다.",
    securityLead:
      "개인 공간과 연구실 공간을 먼저 분리하고, 공유와 공개는 명시적으로 열 때만 보이도록 하는 방향으로 설계합니다.",
    security: [
      {
        title: "기본 비공개 저장",
        body: "프로필, 연구비, 문서 파일은 공유나 공개를 켜기 전까지 기본적으로 비공개 상태를 유지합니다.",
      },
      {
        title: "범위 기반 공유",
        body: "개인 공간과 연구실 공간을 분리해 역할과 범위 기준 접근 제어를 자연스럽게 붙일 수 있게 합니다.",
      },
      {
        title: "웹 중심 편집",
        body: "무거운 문서와 페이지 작업은 웹에서 처리하고, 모바일은 조회와 빠른 수정 중심으로 따라갑니다.",
      },
    ],
    labPeople: "People",
    labResearch: "Research",
    labPapers: "Papers",
    labDocuments: "Documents",
    labTimetable: "Timetable",
  },
  en: {
    heroEyebrow: "Personal and lab pages for university researchers",
    heroTitle: "Turn maintained research data\ninto personal and lab pages.",
    heroBody:
      "Instead of rebuilding everything only when needed, keep profile links, affiliations, funding, documents, and timetables current so they can flow into CVs, SOPs, researcher pages, and lab pages immediately.",
    heroPrimaryCta: "Open workspace",
    heroSecondaryCta: "See core screens",
    heroProof: [
      "Keep GitHub, homepage, and Google Scholar links inside the profile source record.",
      "Update CV, SOP, and bio drafts continuously in the document repository and download them when needed.",
      "Use the same data structure for researcher pages and lab pages so publishing does not require reorganization.",
    ],
    researcherPage: "Researcher page",
    readyTitle: "A researcher surface that stays current",
    readyBody:
      "Build a structure where links and representative documents are maintained over time, so outreach, applications, and profile pages start from current source data.",
    careerKit: "Career documents",
    careerTitle: "CV, SOP, and bio drafts",
    careerBody:
      "Treat these as working documents that keep getting refined, reopened, and downloaded from the repository, not files recreated at the last minute.",
    labPage: "Lab page",
    labTitle: "Lab page structure",
    labBody:
      "Manage People, Research, Papers, Documents, and Timetable in one lab scope and extend the same structure into a public lab site.",
    openPage: "Open",
    flowKicker: "Workflow",
    flowTitle: "Routine maintenance should flow into the next deliverable.",
    flowLead:
      "ResearchPages is not built to collect more inputs. It is built to make the next outreach email, application package, and public page much faster to produce.",
    flow: [
      {
        step: "01",
        title: "Maintain the researcher core",
        body: "Keep names, email, affiliations, GitHub, homepage, and research interests current enough that self-introduction is always ready.",
      },
      {
        step: "02",
        title: "Accumulate career document drafts",
        body: "Keep CV, SOP, bio, and research-plan drafts alive inside the document repository, then reopen and export them whenever needed.",
      },
      {
        step: "03",
        title: "Connect lab collaboration and publishing",
        body: "Manage People, Research, Papers, Documents, and Timetable by lab scope and extend them into public pages without rebuilding them.",
      },
    ],
    surfacesKicker: "Core screens",
    surfacesTitle: "Use the same visual grammar as the internal product.",
    surfacesLead:
      "Use the density and alignment of the documents screen as the baseline so profile, funding, timetable, and lab views still feel like one system.",
    labHubTitle: "Lab hub",
    labHubBody: "Manage People, Research, Papers, Documents, and Timetable under one lab scope.",
    outputsKicker: "Outputs",
    outputsTitle: "Usable outputs matter more than stored data.",
    outputsLead:
      "ResearchPages should move directly into outreach materials, application packages, and public pages rather than stopping at storage.",
    outputs: [
      {
        title: "Researcher page",
        body: "Build a personal page from profile links, affiliations, research areas, and representative documents.",
      },
      {
        title: "Lab page",
        body: "Extend the People, Research, Papers, Documents, and Timetable structure into a lab website.",
      },
      {
        title: "CV and SOP package",
        body: "Reopen maintained working drafts from the document repository and export them immediately.",
      },
      {
        title: "Shared asset management",
        body: "Keep personal and lab materials separated by scope while still connected inside one operating flow.",
      },
    ],
    securityKicker: "Security baseline",
    securityTitle: "Sensitive researcher information should stay closed by default.",
    securityLead:
      "Separate personal and lab scopes first, then open sharing and public visibility only when it is explicit.",
    security: [
      {
        title: "Private storage by default",
        body: "Profiles, funding records, and files remain private until sharing or publishing is intentionally enabled.",
      },
      {
        title: "Scope-based sharing",
        body: "Separate personal and lab workspaces so role-based access control can be added cleanly later.",
      },
      {
        title: "Web-first editing",
        body: "Keep heavy document and page work on the web while mobile focuses on lookup and quick edits.",
      },
    ],
    labPeople: "People",
    labResearch: "Research",
    labPapers: "Papers",
    labDocuments: "Documents",
    labTimetable: "Timetable",
  },
} as const;

function formatAmount(amount: number | undefined, currency: string | undefined, locale: string): string {
  if (amount === undefined) {
    return "-";
  }

  const formatterLocale = locale === "ko" ? "ko-KR" : "en-US";
  const code = currency ?? "KRW";

  try {
    return new Intl.NumberFormat(formatterLocale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

function simplifyUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export default async function LocaleRoot({ params }: Props) {
  const { locale } = await params;
  const resolvedLocale = locale === "en" ? "en" : "ko";
  const dict = await getDictionary(resolvedLocale);
  const copy = resolvedLocale === "ko" ? landingCopy.ko : landingCopy.en;
  const opsSnapshot = await getLiveAgentOperationsSnapshot(resolvedLocale);
  const opsEnabled = process.env.NODE_ENV !== "production" || isDemoPreviewRuntimeEnabled();

  const activeAffiliations = dashboardSnapshot.affiliations.filter((entry) => entry.active);
  const activeFunding = dashboardSnapshot.funding.filter((entry) => entry.active);
  const profileLinks = dashboardSnapshot.profile.links.slice(0, 3);
  const careerDocuments = [...dashboardSnapshot.documents]
    .filter((document) => careerDocumentTypes.has(document.documentType))
    .sort((a, b) => b.updatedOn.localeCompare(a.updatedOn))
    .slice(0, 3);
  const schedulePreview = [...dashboardSnapshot.timetable.entries]
    .sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek))
    .slice(0, 3);

  const heroStats = [
    {
      value: activeAffiliations.length.toString().padStart(2, "0"),
      label: t(dict, "home.stats.activeAffiliations"),
    },
    {
      value: activeFunding.length.toString().padStart(2, "0"),
      label: t(dict, "home.stats.activeFunding"),
    },
    {
      value: dashboardSnapshot.documents.length.toString().padStart(2, "0"),
      label: t(dict, "home.stats.documents"),
    },
    {
      value: dashboardSnapshot.timetable.entries.length.toString().padStart(2, "0"),
      label: t(dict, "home.stats.timetable"),
    },
  ];

  const moduleCards = [
    {
      key: "profile",
      href: `/${resolvedLocale}/profile`,
      icon: UserCircle2,
      title: t(dict, "home.modules.profile.title"),
      body: t(dict, "home.modules.profile.body"),
      content: (
        <div className="rp-module-list">
          <div className="rp-module-row">
            <strong>{dashboardSnapshot.profile.displayName}</strong>
            <span>{dashboardSnapshot.profile.primaryInstitution ?? "-"}</span>
          </div>
          {profileLinks.map((link) => (
            <div className="rp-module-row" key={link.url}>
              <strong>{link.label ?? link.kind}</strong>
              <span>{simplifyUrl(link.url)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "funding",
      href: `/${resolvedLocale}/funding`,
      icon: Wallet,
      title: t(dict, "home.modules.funding.title"),
      body: t(dict, "home.modules.funding.body"),
      content: (
        <div className="rp-module-list">
          {activeFunding.slice(0, 3).map((entry) => (
            <div className="rp-module-row" key={entry.id}>
              <strong>{entry.title}</strong>
              <span>{formatAmount(entry.amount, entry.currency, resolvedLocale)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "documents",
      href: `/${resolvedLocale}/documents`,
      icon: FileText,
      title: t(dict, "home.modules.documents.title"),
      body: t(dict, "home.modules.documents.body"),
      content: (
        <div className="rp-module-list">
          {careerDocuments.map((document) => (
            <div className="rp-module-row" key={document.id}>
              <strong>{document.title}</strong>
              <span>{document.updatedOn}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "timetable",
      href: `/${resolvedLocale}/timetable`,
      icon: Calendar,
      title: t(dict, "home.modules.timetable.title"),
      body: t(dict, "home.modules.timetable.body"),
      content: (
        <div className="rp-module-list">
          {schedulePreview.map((entry) => (
            <div className="rp-module-row" key={entry.id}>
              <strong>{entry.courseTitle}</strong>
              <span>
                {t(dict, `timetable.days.${entry.dayOfWeek}`)} / {entry.startTime} - {entry.endTime}
              </span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const labPreviewMetrics = [
    { label: copy.labPeople, value: "03" },
    { label: copy.labResearch, value: "03" },
    { label: copy.labDocuments, value: dashboardSnapshot.documents.length.toString().padStart(2, "0") },
  ];

  const heroRoutes = [
    { href: `/${resolvedLocale}/profile`, label: copy.researcherPage },
    { href: `/${resolvedLocale}/documents`, label: copy.careerKit },
    { href: `/${resolvedLocale}/lab`, label: copy.labPage },
  ];

  return (
    <div className="marketing-shell rp-landing">
      <section className="rp-hero-section" id="overview">
        <article className="card document-intro-card rp-hero-card">
          <div className="rp-hero-grid">
            <div className="rp-hero-copy">
              <span className="eyebrow">{copy.heroEyebrow}</span>
              <h1 className="rp-hero-title">{copy.heroTitle}</h1>
              <p className="rp-hero-body">{copy.heroBody}</p>

              <div className="hero-actions rp-hero-actions">
                <Link href={`/${resolvedLocale}/profile`} className="primary-cta">
                  {copy.heroPrimaryCta}
                  <ArrowRight size={18} />
                </Link>
                <Link href={`/${resolvedLocale}/documents`} className="secondary-cta">
                  {copy.careerKit}
                </Link>
              </div>

              <div className="rp-hero-stats">
                {heroStats.map((item) => (
                  <div className="document-intro-stat rp-hero-stat" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="rp-hero-route-row">
                {heroRoutes.map((item) => (
                  <Link href={item.href} key={item.href} className="rp-hero-route-chip">
                    {item.label}
                    <ArrowRight size={14} />
                  </Link>
                ))}
              </div>
            </div>

            <div className="rp-preview-stack">
              <article className="card rp-preview-card">
                <div className="rp-preview-head">
                  <div>
                    <span className="rp-preview-label">{copy.researcherPage}</span>
                    <strong>{copy.readyTitle}</strong>
                  </div>
                  <Link href={`/${resolvedLocale}/profile`} className="card-link">
                    {copy.openPage} &rarr;
                  </Link>
                </div>

                <div className="rp-profile-panel">
                  <div className="rp-avatar-mark">
                    {(dashboardSnapshot.profile.displayName || "R").slice(0, 1)}
                  </div>
                  <div className="rp-profile-copy">
                    <strong>{dashboardSnapshot.profile.displayName}</strong>
                    <span>{dashboardSnapshot.profile.headline}</span>
                    <span>{dashboardSnapshot.profile.primaryInstitution}</span>
                  </div>
                </div>

                <div className="rp-link-list">
                  {profileLinks.map((link) => (
                    <div className="rp-link-pill" key={link.url}>
                      <Globe2 size={13} />
                      <span>{link.label ?? link.kind}</span>
                    </div>
                  ))}
                </div>
              </article>

              <div className="rp-preview-grid">
                <article className="card rp-preview-card">
                  <div className="rp-preview-head">
                    <div>
                      <span className="rp-preview-label">{copy.careerKit}</span>
                      <strong>{copy.careerTitle}</strong>
                    </div>
                    <Link href={`/${resolvedLocale}/documents`} className="card-link">
                      {copy.openPage} &rarr;
                    </Link>
                  </div>
                  <div className="rp-dense-list">
                    {careerDocuments.map((document) => (
                      <div className="rp-dense-row" key={document.id}>
                        <div className="rp-dense-main">
                          <strong>{document.title}</strong>
                          <span>{document.updatedOn}</span>
                        </div>
                        <span className="pill pill-amber">
                          {t(dict, `documents.types.${document.documentType}`)}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="card rp-preview-card">
                  <div className="rp-preview-head">
                    <div>
                      <span className="rp-preview-label">{copy.labPage}</span>
                      <strong>{copy.labTitle}</strong>
                    </div>
                    <Link href={`/${resolvedLocale}/lab`} className="card-link">
                      {copy.openPage} &rarr;
                    </Link>
                  </div>
                  <div className="rp-lab-metrics">
                    {labPreviewMetrics.map((item) => (
                      <div className="rp-lab-metric" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="rp-chip-row">
                    <span className="rp-chip">{copy.labPeople}</span>
                    <span className="rp-chip">{copy.labResearch}</span>
                    <span className="rp-chip">{copy.labPapers}</span>
                    <span className="rp-chip">{copy.labTimetable}</span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="rp-section" id="agent-control" style={{ gap: "8px" }}>
        <HomepageAgentControlSection
          initialSnapshot={opsSnapshot}
          locale={resolvedLocale}
          opsEnabled={opsEnabled}
        />
      </section>

      <section className="rp-section" id="workflow">
        <div className="section-heading-stack rp-section-head">
          <span className="section-kicker">{copy.flowKicker}</span>
          <h2 className="section-title rp-section-title">{copy.flowTitle}</h2>
        </div>

        <div className="rp-flow-grid">
          {copy.flow.map((item) => (
            <article className="card rp-flow-card" key={item.step}>
              <span className="rp-flow-step">{item.step}</span>
              <div className="rp-flow-copy">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rp-section" id="modules">
        <div className="section-heading-stack rp-section-head">
          <span className="section-kicker">{copy.surfacesKicker}</span>
          <h2 className="section-title rp-section-title">{copy.surfacesTitle}</h2>
        </div>

        <div className="rp-surface-grid">
          {moduleCards.map((item) => {
            const Icon = item.icon;

            return (
              <article className="card rp-surface-card" key={item.key}>
                <div className="rp-surface-head">
                  <div className="ops-card-title-row">
                  <div className="module-card-icon">
                      <Icon size={18} />
                    </div>
                    <div className="ops-card-copy">
                      <h3>{item.title}</h3>
                    </div>
                  </div>
                  <Link href={item.href} className="card-link">
                    {t(dict, "dashboard.viewAll")} &rarr;
                  </Link>
                </div>

                {item.content}
              </article>
            );
          })}

          <article className="card rp-surface-card rp-surface-card-wide">
            <div className="rp-surface-head">
              <div className="ops-card-title-row">
                <div className="module-card-icon">
                  <Users size={18} />
                </div>
                <div className="ops-card-copy">
                  <h3>{copy.labHubTitle}</h3>
                </div>
              </div>
              <Link href={`/${resolvedLocale}/lab`} className="card-link">
                {t(dict, "dashboard.viewAll")} &rarr;
              </Link>
            </div>

            <div className="rp-lab-surface">
              <div className="rp-lab-surface-metrics">
                <div className="rp-lab-surface-metric">
                  <span>{copy.labPeople}</span>
                  <strong>03</strong>
                </div>
                <div className="rp-lab-surface-metric">
                  <span>{copy.labResearch}</span>
                  <strong>03</strong>
                </div>
                <div className="rp-lab-surface-metric">
                  <span>{copy.labPapers}</span>
                  <strong>08</strong>
                </div>
                <div className="rp-lab-surface-metric">
                  <span>{copy.labDocuments}</span>
                  <strong>{dashboardSnapshot.documents.length.toString().padStart(2, "0")}</strong>
                </div>
              </div>

              <div className="rp-module-list">
                <div className="rp-module-row">
                  <strong>{copy.labPeople}</strong>
                  <span>Professor / Members / Alumni</span>
                </div>
                <div className="rp-module-row">
                  <strong>{copy.labResearch}</strong>
                  <span>Ongoing projects first, completed projects below</span>
                </div>
                <div className="rp-module-row">
                  <strong>{copy.labPapers}</strong>
                  <span>Shared paper list and page-ready publication structure</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="rp-section rp-bottom-grid" id="outputs">
        <article className="card rp-detail-card">
          <div className="section-heading-stack rp-section-head rp-detail-head">
            <span className="section-kicker">{copy.outputsKicker}</span>
            <h2 className="section-title rp-section-title">{copy.outputsTitle}</h2>
          </div>

          <div className="rp-detail-list">
            {copy.outputs.map((item, index) => {
              const Icon = [Globe2, Users, FileText, Building2][index];

              return (
                <div className="rp-detail-row" key={item.title}>
                  <div className="module-card-icon rp-detail-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="card rp-detail-card rp-security-card" id="security">
          <div className="section-heading-stack rp-section-head rp-detail-head">
            <span className="section-kicker">{copy.securityKicker}</span>
            <h2 className="section-title rp-section-title">{copy.securityTitle}</h2>
          </div>

          <div className="rp-detail-list">
            {copy.security.map((item) => (
              <div className="rp-detail-row" key={item.title}>
                <div className="module-card-icon rp-detail-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
