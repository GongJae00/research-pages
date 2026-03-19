"use client";

import type { AffiliationTimelineEntry, DocumentRecord } from "@research-os/types";
import {
  appointmentStatuses,
  organizationTypes,
  roleTracks,
} from "@research-os/types";
import { PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { DocumentEvidencePicker } from "@/components/document-evidence-picker";
import { loadBrowserAffiliationsForAccount } from "@/lib/affiliation-browser-store";
import {
  replaceAffiliationsForAccount,
  syncAffiliationsForAccount,
} from "@/lib/affiliation-server-store";
import { loadBrowserDocuments } from "@/lib/document-browser-store";
import { syncDocumentsForAccount } from "@/lib/document-server-store";
import type { Locale } from "@/lib/i18n";

interface AffiliationWorkspaceProps {
  locale: Locale;
  affiliations: AffiliationTimelineEntry[];
  documents: DocumentRecord[];
  embedded?: boolean;
}

const copy = {
  ko: {
    title: "소속 이력",
    subtitle: "학교, 연구실, 기관, 프로젝트 단위의 소속과 역할을 계속 업데이트합니다.",
    institution: "기관",
    department: "부서",
    lab: "연구실",
    period: "기간",
    notes: "비고",
    present: "현재",
    active: "진행 중",
    inactive: "종료",
    evidence: "관련 문서",
    edit: "소속 편집",
    save: "저장",
    cancel: "취소",
    add: "항목 추가",
    empty: "등록된 소속 이력이 아직 없습니다.",
    emptyEditing: "아직 항목이 없습니다. 학교, 연구실, 기관 소속부터 추가해보세요.",
    item: "소속 항목",
    organizationType: "기관 유형",
    roleTrack: "역할 트랙",
    appointmentStatus: "상태",
    startDate: "시작일",
    endDate: "종료일",
    roleTitle: "역할명",
    remove: "삭제",
    organizationLabels: {
      university: "대학교",
      lab: "연구실",
      company: "기업",
      government: "정부",
      research_institute: "연구소",
      hospital: "병원",
      foundation: "재단",
      other: "기타",
    },
    roleTrackLabels: {
      student: "학생",
      faculty: "교수",
      postdoc: "포닥",
      researcher: "연구원",
      staff: "스태프",
      admin: "행정",
      industry: "산학",
      other: "기타",
    },
    appointmentLabels: {
      planned: "예정",
      active: "진행 중",
      paused: "보류",
      completed: "종료",
    },
  },
  en: {
    title: "Affiliations",
    subtitle: "Keep university, lab, institution, and project roles updated over time.",
    institution: "Institution",
    department: "Department",
    lab: "Lab",
    period: "Period",
    notes: "Notes",
    present: "Present",
    active: "Active",
    inactive: "Inactive",
    evidence: "Related documents",
    edit: "Edit affiliations",
    save: "Save",
    cancel: "Cancel",
    add: "Add item",
    empty: "No affiliations yet.",
    emptyEditing: "No affiliation items yet. Start with university, lab, or institutional roles.",
    item: "Affiliation item",
    organizationType: "Organization type",
    roleTrack: "Role track",
    appointmentStatus: "Status",
    startDate: "Start date",
    endDate: "End date",
    roleTitle: "Role title",
    remove: "Remove",
    organizationLabels: {
      university: "University",
      lab: "Lab",
      company: "Company",
      government: "Government",
      research_institute: "Research institute",
      hospital: "Hospital",
      foundation: "Foundation",
      other: "Other",
    },
    roleTrackLabels: {
      student: "Student",
      faculty: "Faculty",
      postdoc: "Postdoc",
      researcher: "Researcher",
      staff: "Staff",
      admin: "Admin",
      industry: "Industry",
      other: "Other",
    },
    appointmentLabels: {
      planned: "Planned",
      active: "Active",
      paused: "Paused",
      completed: "Completed",
    },
  },
} as const;

function createRecordId(prefix: string) {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyAffiliation(accountId: string | null): AffiliationTimelineEntry {
  return {
    id: createRecordId("aff"),
    owner: { type: "user", id: accountId ?? "anonymous" },
    institutionName: "",
    organizationType: "university",
    roleTitle: "",
    roleTrack: "student",
    appointmentStatus: "active",
    startDate: "",
    active: true,
    relatedFundingIds: [],
  };
}

function normalizeAffiliation(entry: AffiliationTimelineEntry): AffiliationTimelineEntry {
  return {
    ...entry,
    institutionName: entry.institutionName.trim(),
    department: entry.department?.trim() || undefined,
    labName: entry.labName?.trim() || undefined,
    roleTitle: entry.roleTitle.trim(),
    startDate: entry.startDate,
    endDate: entry.endDate?.trim() || undefined,
    notes: entry.notes?.trim() || undefined,
  };
}

export function AffiliationWorkspace({
  locale,
  affiliations,
  documents,
  embedded = false,
}: AffiliationWorkspaceProps) {
  const { currentAccount } = useAuth();
  const text = copy[locale];
  const [resolvedDocuments, setResolvedDocuments] = useState<DocumentRecord[]>(documents);
  const [resolvedAffiliations, setResolvedAffiliations] =
    useState<AffiliationTimelineEntry[]>(affiliations);
  const [draftAffiliations, setDraftAffiliations] =
    useState<AffiliationTimelineEntry[]>(affiliations);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setResolvedDocuments(loadBrowserDocuments(documents));
  }, [documents]);

  useEffect(() => {
    if (!currentAccount?.id) {
      setResolvedAffiliations(affiliations);
      return;
    }

    setResolvedAffiliations(loadBrowserAffiliationsForAccount(currentAccount.id, affiliations));
  }, [affiliations, currentAccount?.id]);

  useEffect(() => {
    if (!isEditing) {
      setDraftAffiliations(resolvedAffiliations);
    }
  }, [isEditing, resolvedAffiliations]);

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

    void syncAffiliationsForAccount(currentAccount.id, affiliations)
      .then((serverAffiliations) => {
        if (!cancelled && serverAffiliations) {
          setResolvedAffiliations(serverAffiliations);
        }
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [affiliations, currentAccount?.id]);

  const handleOpenEdit = () => {
    setDraftAffiliations(resolvedAffiliations);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftAffiliations(resolvedAffiliations);
    setIsEditing(false);
  };

  const handleAddAffiliation = () => {
    setDraftAffiliations((current) => [...current, createEmptyAffiliation(currentAccount?.id ?? null)]);
  };

  const handleUpdateAffiliation = (
    id: string,
    patch: Partial<AffiliationTimelineEntry>,
  ) => {
    setDraftAffiliations((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleRemoveAffiliation = (id: string) => {
    setDraftAffiliations((current) => current.filter((item) => item.id !== id));
  };

  const handleSaveAffiliations = async () => {
    if (!currentAccount?.id) {
      return;
    }

    const nextAffiliations = draftAffiliations
      .map(normalizeAffiliation)
      .filter(
        (item) =>
          item.institutionName.length > 0 && item.roleTitle.length > 0 && item.startDate.length > 0,
      );

    try {
      const persistedAffiliations = await replaceAffiliationsForAccount(
        currentAccount.id,
        nextAffiliations,
      );
      setResolvedAffiliations(persistedAffiliations);
      setDraftAffiliations(persistedAffiliations);
      setIsEditing(false);
    } catch {
      // Keep the editor open so the user can retry.
    }
  };

  return (
    <div className="page-standard workspace-page-shell affiliation-workspace">
      {embedded ? null : (
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
                  <button type="button" className="primary-cta" onClick={handleSaveAffiliations}>
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
      )}

      {isEditing ? (
        <>
          <div className="detail-cards">
            {draftAffiliations.length === 0 ? (
              <section className="card profile-detail-card">
                <div className="card-body">
                  <p className="card-support-text">{text.emptyEditing}</p>
                </div>
              </section>
            ) : null}

            {draftAffiliations.map((affiliation, index) => (
              <section className="card profile-edit-card" key={affiliation.id}>
                <div className="card-header">
                  <div>
                    <h3>
                      {text.item} {index + 1}
                    </h3>
                    <p className="card-support-text">
                      {affiliation.roleTitle || affiliation.institutionName || text.institution}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="profile-inline-btn"
                    onClick={() => handleRemoveAffiliation(affiliation.id)}
                  >
                    <Trash2 size={15} />
                    {text.remove}
                  </button>
                </div>
                <div className="card-body">
                  <div className="profile-form-grid">
                    <label className="editor-field">
                      <span>{text.institution}</span>
                      <input
                        value={affiliation.institutionName}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            institutionName: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.roleTitle}</span>
                      <input
                        value={affiliation.roleTitle}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            roleTitle: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.department}</span>
                      <input
                        value={affiliation.department ?? ""}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            department: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.lab}</span>
                      <input
                        value={affiliation.labName ?? ""}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            labName: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.organizationType}</span>
                      <select
                        value={affiliation.organizationType}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            organizationType: event.target.value as AffiliationTimelineEntry["organizationType"],
                          })
                        }
                      >
                        {organizationTypes.map((value) => (
                          <option key={value} value={value}>
                            {text.organizationLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.roleTrack}</span>
                      <select
                        value={affiliation.roleTrack}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            roleTrack: event.target.value as AffiliationTimelineEntry["roleTrack"],
                          })
                        }
                      >
                        {roleTracks.map((value) => (
                          <option key={value} value={value}>
                            {text.roleTrackLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.appointmentStatus}</span>
                      <select
                        value={affiliation.appointmentStatus}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            appointmentStatus:
                              event.target.value as AffiliationTimelineEntry["appointmentStatus"],
                          })
                        }
                      >
                        {appointmentStatuses.map((value) => (
                          <option key={value} value={value}>
                            {text.appointmentLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="editor-field">
                      <span>{text.startDate}</span>
                      <input
                        type="date"
                        value={affiliation.startDate}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            startDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.endDate}</span>
                      <input
                        type="date"
                        value={affiliation.endDate ?? ""}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            endDate: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="editor-field">
                      <span>{text.active}</span>
                      <select
                        value={affiliation.active ? "active" : "inactive"}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            active: event.target.value === "active",
                          })
                        }
                      >
                        <option value="active">{text.active}</option>
                        <option value="inactive">{text.inactive}</option>
                      </select>
                    </label>
                    <label className="editor-field editor-field-full">
                      <span>{text.notes}</span>
                      <textarea
                        value={affiliation.notes ?? ""}
                        onChange={(event) =>
                          handleUpdateAffiliation(affiliation.id, {
                            notes: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="editor-actions">
            <button type="button" className="secondary-cta" onClick={handleAddAffiliation}>
              <Plus size={16} />
              {text.add}
            </button>
          </div>
        </>
      ) : (
        <div className="detail-cards">
          {resolvedAffiliations.length === 0 ? (
            <section className="card profile-detail-card">
              <div className="card-body">
                <p className="card-support-text">{text.empty}</p>
              </div>
            </section>
          ) : null}

          {resolvedAffiliations.map((affiliation) => (
            <section className="card profile-detail-card" key={affiliation.id}>
              <div className="card-header">
                <div>
                  <h3>{affiliation.roleTitle}</h3>
                  <p className="card-support-text">{affiliation.institutionName}</p>
                </div>
                <span className={`pill ${affiliation.active ? "pill-green" : "pill-gray"}`}>
                  {affiliation.active ? text.active : text.inactive}
                </span>
              </div>

              <div className="card-body">
                <dl className="field-list">
                  <div className="field-row">
                    <dt>{text.institution}</dt>
                    <dd>{affiliation.institutionName}</dd>
                  </div>
                  {affiliation.department ? (
                    <div className="field-row">
                      <dt>{text.department}</dt>
                      <dd>{affiliation.department}</dd>
                    </div>
                  ) : null}
                  {affiliation.labName ? (
                    <div className="field-row">
                      <dt>{text.lab}</dt>
                      <dd>{affiliation.labName}</dd>
                    </div>
                  ) : null}
                  <div className="field-row">
                    <dt>{text.period}</dt>
                    <dd>
                      {affiliation.startDate} - {affiliation.endDate ?? text.present}
                    </dd>
                  </div>
                  {affiliation.notes ? (
                    <div className="field-row">
                      <dt>{text.notes}</dt>
                      <dd>{affiliation.notes}</dd>
                    </div>
                  ) : null}
                </dl>

                <DocumentEvidencePicker
                  evidenceKey={`affiliation:${affiliation.id}`}
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
