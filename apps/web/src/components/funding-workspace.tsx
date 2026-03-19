"use client";

import type {
  AffiliationTimelineEntry,
  DocumentRecord,
  FundingRecord,
} from "@research-os/types";
import {
  compensationKinds,
  fundingCadences,
  fundingSourceTypes,
} from "@research-os/types";
import { PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { DocumentEvidencePicker } from "@/components/document-evidence-picker";
import { loadBrowserAffiliationsForAccount } from "@/lib/affiliation-browser-store";
import { syncAffiliationsForAccount } from "@/lib/affiliation-server-store";
import { loadBrowserDocuments } from "@/lib/document-browser-store";
import { syncDocumentsForAccount } from "@/lib/document-server-store";
import { loadBrowserFundingForAccount } from "@/lib/funding-browser-store";
import {
  replaceFundingForAccount,
  syncFundingForAccount,
} from "@/lib/funding-server-store";
import type { Locale } from "@/lib/i18n";

interface FundingWorkspaceProps {
  locale: Locale;
  funding: FundingRecord[];
  documents: DocumentRecord[];
  affiliations: AffiliationTimelineEntry[];
}

const copy = {
  ko: {
    title: "연구비",
    subtitle: "장학금, 급여, 과제 지원, 제한 조건을 관련 문서와 함께 계속 관리합니다.",
    provider: "지급처",
    project: "프로젝트",
    period: "기간",
    restrictions: "제한 사항",
    present: "현재",
    amount: "금액",
    active: "진행 중",
    inactive: "종료/비활성",
    evidence: "관련 문서",
    edit: "연구비 편집",
    save: "저장",
    cancel: "취소",
    add: "항목 추가",
    empty: "등록된 연구비 항목이 아직 없습니다.",
    emptyEditing: "아직 항목이 없습니다. 장학금, 급여, 프로젝트 지원부터 추가해보세요.",
    item: "연구비 항목",
    sourceType: "지원 유형",
    compensationKind: "지급 성격",
    cadence: "지급 주기",
    notes: "메모",
    linkedAffiliation: "연결 소속",
    noAffiliation: "연결 없음",
    remove: "삭제",
    currency: "통화",
    sourceTypeLabels: {
      scholarship: "장학금",
      assistantship: "조교/연구보조",
      payroll: "급여",
      internal_grant: "교내 과제",
      external_grant: "외부 과제",
      industry: "산학",
      fellowship: "펠로우십",
      other: "기타",
    },
    compensationLabels: {
      scholarship: "장학금",
      payroll: "급여",
      grant: "과제비",
      stipend: "생활비",
      other: "기타",
    },
    cadenceLabels: {
      one_time: "1회",
      monthly: "월별",
      quarterly: "분기별",
      semester: "학기별",
      annual: "연간",
      custom: "직접 관리",
    },
  },
  en: {
    title: "Funding",
    subtitle: "Keep scholarships, payroll, project support, and restrictions maintained with related documents.",
    provider: "Provider",
    project: "Project",
    period: "Period",
    restrictions: "Restrictions",
    present: "Present",
    amount: "Amount",
    active: "Active",
    inactive: "Inactive",
    evidence: "Related documents",
    edit: "Edit funding",
    save: "Save",
    cancel: "Cancel",
    add: "Add item",
    empty: "No funding records yet.",
    emptyEditing: "No funding items yet. Start with scholarships, payroll, or project support.",
    item: "Funding item",
    sourceType: "Source type",
    compensationKind: "Compensation",
    cadence: "Cadence",
    notes: "Notes",
    linkedAffiliation: "Linked affiliation",
    noAffiliation: "No linked affiliation",
    remove: "Remove",
    currency: "Currency",
    sourceTypeLabels: {
      scholarship: "Scholarship",
      assistantship: "Assistantship",
      payroll: "Payroll",
      internal_grant: "Internal grant",
      external_grant: "External grant",
      industry: "Industry",
      fellowship: "Fellowship",
      other: "Other",
    },
    compensationLabels: {
      scholarship: "Scholarship",
      payroll: "Payroll",
      grant: "Grant",
      stipend: "Stipend",
      other: "Other",
    },
    cadenceLabels: {
      one_time: "One-time",
      monthly: "Monthly",
      quarterly: "Quarterly",
      semester: "Semester",
      annual: "Annual",
      custom: "Custom",
    },
  },
} as const;

function createRecordId(prefix: string) {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatAmount(amount: number | undefined, currency: string | undefined, locale: Locale) {
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

function createEmptyFundingRecord(accountId: string | null): FundingRecord {
  return {
    id: createRecordId("fund"),
    owner: { type: "user", id: accountId ?? "anonymous" },
    title: "",
    sourceType: "scholarship",
    compensationKind: "scholarship",
    providerName: "",
    currency: "KRW",
    cadence: "monthly",
    startDate: "",
    active: true,
    restrictions: [],
  };
}

function normalizeFundingRecord(record: FundingRecord): FundingRecord {
  return {
    ...record,
    title: record.title.trim(),
    providerName: record.providerName.trim(),
    projectName: record.projectName?.trim() || undefined,
    currency: record.currency.trim().toUpperCase() || "KRW",
    startDate: record.startDate,
    endDate: record.endDate?.trim() || undefined,
    linkedAffiliationId: record.linkedAffiliationId?.trim() || undefined,
    restrictions: record.restrictions.map((item) => item.trim()).filter(Boolean),
    notes: record.notes?.trim() || undefined,
    amount: record.amount === undefined || Number.isNaN(record.amount) ? undefined : record.amount,
  };
}

export function FundingWorkspace({
  locale,
  funding,
  documents,
  affiliations,
}: FundingWorkspaceProps) {
  const { currentAccount } = useAuth();
  const text = copy[locale];
  const [resolvedDocuments, setResolvedDocuments] = useState<DocumentRecord[]>(documents);
  const [resolvedFunding, setResolvedFunding] = useState<FundingRecord[]>(funding);
  const [resolvedAffiliations, setResolvedAffiliations] =
    useState<AffiliationTimelineEntry[]>(affiliations);
  const [draftFunding, setDraftFunding] = useState<FundingRecord[]>(funding);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setResolvedDocuments(loadBrowserDocuments(documents));
  }, [documents]);

  useEffect(() => {
    if (!currentAccount?.id) {
      setResolvedFunding(funding);
      setResolvedAffiliations(affiliations);
      return;
    }

    setResolvedFunding(loadBrowserFundingForAccount(currentAccount.id, funding));
    setResolvedAffiliations(loadBrowserAffiliationsForAccount(currentAccount.id, affiliations));
  }, [affiliations, currentAccount?.id, funding]);

  useEffect(() => {
    if (!isEditing) {
      setDraftFunding(resolvedFunding);
    }
  }, [isEditing, resolvedFunding]);

  useEffect(() => {
    if (!currentAccount?.id) {
      return;
    }

    let cancelled = false;

    void syncDocumentsForAccount(currentAccount.id)
      .then((serverDocuments) => {
        if (!cancelled && serverDocuments) {
          setResolvedDocuments(serverDocuments);
        }
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccount?.id]);

  useEffect(() => {
    if (!currentAccount?.id) {
      return;
    }

    let cancelled = false;

    void Promise.all([
      syncFundingForAccount(currentAccount.id, funding),
      syncAffiliationsForAccount(currentAccount.id, affiliations),
    ])
      .then(([serverFunding, serverAffiliations]) => {
        if (cancelled) {
          return;
        }

        if (serverFunding) {
          setResolvedFunding(serverFunding);
        }

        if (serverAffiliations) {
          setResolvedAffiliations(serverAffiliations);
        }
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [affiliations, currentAccount?.id, funding]);

  const affiliationOptions = useMemo(
    () =>
      resolvedAffiliations.map((item) => ({
        value: item.id,
        label: [item.roleTitle, item.institutionName].filter(Boolean).join(" / "),
      })),
    [resolvedAffiliations],
  );

  const handleOpenEdit = () => {
    setDraftFunding(resolvedFunding);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftFunding(resolvedFunding);
    setIsEditing(false);
  };

  const handleAddFunding = () => {
    setDraftFunding((current) => [...current, createEmptyFundingRecord(currentAccount?.id ?? null)]);
  };

  const handleUpdateFunding = (id: string, patch: Partial<FundingRecord>) => {
    setDraftFunding((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleRemoveFunding = (id: string) => {
    setDraftFunding((current) => current.filter((item) => item.id !== id));
  };

  const handleSaveFunding = async () => {
    if (!currentAccount?.id) {
      return;
    }

    const nextFunding = draftFunding
      .map(normalizeFundingRecord)
      .filter((item) => item.title.length > 0 && item.providerName.length > 0 && item.startDate.length > 0);

    try {
      const persistedFunding = await replaceFundingForAccount(currentAccount.id, nextFunding);
      setResolvedFunding(persistedFunding);
      setDraftFunding(persistedFunding);
      setIsEditing(false);
    } catch {
      // Keep the editor open so the user can retry.
    }
  };

  return (
    <div className="page-standard workspace-page-shell">
      <section className="card workspace-intro-card workspace-intro-card-compact">
        <div className="workspace-intro-top">
          <div className="workspace-intro-copy">
            <strong>{text.title}</strong>
          </div>
          <div className="editor-actions">
            {isEditing ? (
              <>
                <button type="button" className="secondary-cta" onClick={handleCancelEdit}>
                  <X size={16} />
                  {text.cancel}
                </button>
                <button type="button" className="primary-cta" onClick={handleSaveFunding}>
                  <Save size={16} />
                  {text.save}
                </button>
              </>
            ) : (
              <button type="button" className="primary-cta" onClick={handleOpenEdit}>
                <PencilLine size={16} />
                {text.edit}
              </button>
            )}
          </div>
        </div>
      </section>

      {isEditing ? (
        <>
          <div className="detail-cards">
            {draftFunding.length === 0 ? (
              <section className="card profile-detail-card">
                <div className="card-body">
                  <p className="card-support-text">{text.emptyEditing}</p>
                </div>
              </section>
            ) : null}

            {draftFunding.map((item, index) => (
              <section className="card profile-edit-card" key={item.id}>
                <div className="card-header">
                  <div>
                    <h3>
                      {text.item} {index + 1}
                    </h3>
                    <p className="card-support-text">
                      {item.title || item.providerName || text.provider}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="profile-inline-btn"
                    onClick={() => handleRemoveFunding(item.id)}
                  >
                    <Trash2 size={15} />
                    {text.remove}
                  </button>
                </div>
                <div className="card-body">
                  <div className="profile-form-grid">
                    <label className="editor-field">
                      <span>{text.item}</span>
                      <input
                        value={item.title}
                        onChange={(event) => handleUpdateFunding(item.id, { title: event.target.value })}
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.provider}</span>
                      <input
                        value={item.providerName}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, { providerName: event.target.value })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.project}</span>
                      <input
                        value={item.projectName ?? ""}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, { projectName: event.target.value })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.amount}</span>
                      <input
                        type="number"
                        value={item.amount ?? ""}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, {
                            amount:
                              event.target.value.trim().length > 0
                                ? Number(event.target.value)
                                : undefined,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.sourceType}</span>
                      <select
                        value={item.sourceType}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, {
                            sourceType: event.target.value as FundingRecord["sourceType"],
                          })
                        }
                      >
                        {fundingSourceTypes.map((value) => (
                          <option key={value} value={value}>
                            {text.sourceTypeLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.compensationKind}</span>
                      <select
                        value={item.compensationKind}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, {
                            compensationKind: event.target.value as FundingRecord["compensationKind"],
                          })
                        }
                      >
                        {compensationKinds.map((value) => (
                          <option key={value} value={value}>
                            {text.compensationLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.period}</span>
                      <input
                        type="date"
                        value={item.startDate}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, { startDate: event.target.value })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.present}</span>
                      <input
                        type="date"
                        value={item.endDate ?? ""}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, { endDate: event.target.value })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.cadence}</span>
                      <select
                        value={item.cadence}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, {
                            cadence: event.target.value as FundingRecord["cadence"],
                          })
                        }
                      >
                        {fundingCadences.map((value) => (
                          <option key={value} value={value}>
                            {text.cadenceLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.linkedAffiliation}</span>
                      <select
                        value={item.linkedAffiliationId ?? ""}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, {
                            linkedAffiliationId: event.target.value || undefined,
                          })
                        }
                      >
                        <option value="">{text.noAffiliation}</option>
                        {affiliationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.currency}</span>
                      <input
                        value={item.currency}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, { currency: event.target.value.toUpperCase() })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.active}</span>
                      <select
                        value={item.active ? "active" : "inactive"}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, { active: event.target.value === "active" })
                        }
                      >
                        <option value="active">{text.active}</option>
                        <option value="inactive">{text.inactive}</option>
                      </select>
                    </label>
                    <label className="editor-field editor-field-full">
                      <span>{text.restrictions}</span>
                      <input
                        value={item.restrictions.join(", ")}
                        onChange={(event) =>
                          handleUpdateFunding(item.id, {
                            restrictions: event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                    <label className="editor-field editor-field-full">
                      <span>{text.notes}</span>
                      <textarea
                        value={item.notes ?? ""}
                        onChange={(event) => handleUpdateFunding(item.id, { notes: event.target.value })}
                      />
                    </label>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="editor-actions">
            <button type="button" className="secondary-cta" onClick={handleAddFunding}>
              <Plus size={16} />
              {text.add}
            </button>
          </div>
        </>
      ) : (
        <div className="detail-cards">
          {resolvedFunding.length === 0 ? (
            <section className="card profile-detail-card">
              <div className="card-body">
                <p className="card-support-text">{text.empty}</p>
              </div>
            </section>
          ) : null}

          {resolvedFunding.map((item) => (
            <section className="card profile-detail-card" key={item.id}>
              <div className="card-header">
                <div>
                  <h3>{item.title}</h3>
                  <p className="card-support-text">{item.providerName}</p>
                </div>
                <span className={`pill ${item.active ? "pill-green" : "pill-gray"}`}>
                  {item.active ? text.active : text.inactive}
                </span>
              </div>

              <div className="card-body">
                <dl className="field-list">
                  <div className="field-row">
                    <dt>{text.provider}</dt>
                    <dd>{item.providerName}</dd>
                  </div>
                  {item.projectName ? (
                    <div className="field-row">
                      <dt>{text.project}</dt>
                      <dd>{item.projectName}</dd>
                    </div>
                  ) : null}
                  <div className="field-row">
                    <dt>{text.period}</dt>
                    <dd>
                      {item.startDate} - {item.endDate ?? text.present}
                    </dd>
                  </div>
                  <div className="field-row">
                    <dt>{text.amount}</dt>
                    <dd>{formatAmount(item.amount, item.currency, locale)}</dd>
                  </div>
                  {item.restrictions.length > 0 ? (
                    <div className="field-row">
                      <dt>{text.restrictions}</dt>
                      <dd>{item.restrictions.join(", ")}</dd>
                    </div>
                  ) : null}
                </dl>

                <DocumentEvidencePicker
                  evidenceKey={`funding:${item.id}`}
                  documents={resolvedDocuments}
                  locale={locale}
                  title={text.evidence}
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
