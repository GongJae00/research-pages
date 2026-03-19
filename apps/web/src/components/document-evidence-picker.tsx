"use client";

import { Link2, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { DocumentRecord } from "@research-os/types";

import { getCategoryLabel, getTypeLabel } from "@/lib/document-taxonomy";
import {
  readEvidenceForAccountKey,
  readEvidenceForKey,
  writeEvidenceForAccountKey,
  writeEvidenceForKey,
} from "@/lib/evidence-links";
import type { Locale } from "@/lib/i18n";
import { getActiveAccountId } from "@/lib/mock-auth-store";
import {
  replaceEvidenceLinksForAccount,
  syncEvidenceLinksForAccount,
} from "@/lib/profile-evidence-server-store";

interface DocumentEvidencePickerProps {
  evidenceKey: string;
  documents: DocumentRecord[];
  locale: Locale;
  title?: string;
  selectedIds?: string[];
  onChange?: (documentIds: string[]) => void;
  persist?: boolean;
}

const copy = {
  ko: {
    title: "관련 문서",
    add: "관련 문서 선택",
    empty: "연결된 관련 문서가 아직 없습니다.",
    noDocuments: "문서 저장소에 아직 선택할 문서가 없습니다.",
    linked: "연결됨",
    select: "선택",
  },
  en: {
    title: "Related documents",
    add: "Select related documents",
    empty: "No related documents linked yet.",
    noDocuments: "There are no documents in the repository yet.",
    linked: "Linked",
    select: "Select",
  },
} as const;

export function DocumentEvidencePicker({
  evidenceKey,
  documents,
  locale,
  title,
  selectedIds,
  onChange,
  persist = true,
}: DocumentEvidencePickerProps) {
  const [, setRevision] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const controlled = selectedIds !== undefined;
  const accountId = getActiveAccountId();
  const activeSelectedIds = controlled
    ? selectedIds
    : accountId
      ? readEvidenceForAccountKey(accountId, evidenceKey)
      : readEvidenceForKey(evidenceKey);

  useEffect(() => {
    if (!persist || controlled || !accountId) {
      return;
    }

    let cancelled = false;

    void syncEvidenceLinksForAccount(accountId)
      .then(() => {
        if (!cancelled) {
          setRevision((value) => value + 1);
        }
      })
      .catch(() => {
        // Keep local evidence cache when server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, controlled, evidenceKey, persist]);

  const selectedDocuments = useMemo(
    () => documents.filter((document) => activeSelectedIds.includes(document.id)),
    [activeSelectedIds, documents],
  );

  const toggleDocument = (documentId: string) => {
    const nextValue = activeSelectedIds.includes(documentId)
      ? activeSelectedIds.filter((id) => id !== documentId)
      : [...activeSelectedIds, documentId];

    if (!controlled) {
      setRevision((value) => value + 1);
    }

    if (persist) {
      if (accountId) {
        writeEvidenceForAccountKey(accountId, evidenceKey, nextValue);
        void replaceEvidenceLinksForAccount(accountId, evidenceKey, nextValue).catch(() => undefined);
      } else {
        writeEvidenceForKey(evidenceKey, nextValue);
      }
    }

    onChange?.(nextValue);
  };

  return (
    <div className="evidence-picker">
      <div className="evidence-picker-header">
        <div className="evidence-picker-title">
          <Link2 size={15} />
          <span>{title ?? copy[locale].title}</span>
        </div>

        <button
          type="button"
          className="secondary-cta evidence-picker-btn"
          onClick={() => setIsOpen((value) => !value)}
        >
          <Plus size={14} />
          {copy[locale].add}
        </button>
      </div>

      {selectedDocuments.length === 0 ? (
        <p className="evidence-picker-empty">{copy[locale].empty}</p>
      ) : (
        <div className="evidence-linked-list">
          {selectedDocuments.map((document) => (
            <div className="evidence-linked-item" key={document.id}>
              <div className="evidence-linked-copy">
                <strong>{document.title}</strong>
                <span>
                  {getCategoryLabel(locale, document.documentCategory)} /{" "}
                  {getTypeLabel(locale, document.documentType)}
                </span>
              </div>
              <button
                type="button"
                className="evidence-unlink-btn"
                onClick={() => toggleDocument(document.id)}
                aria-label={copy[locale].linked}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isOpen ? (
        <div className="evidence-document-panel">
          {documents.length === 0 ? (
            <p className="evidence-picker-empty">{copy[locale].noDocuments}</p>
          ) : (
            documents.map((document) => {
              const active = activeSelectedIds.includes(document.id);

              return (
                <button
                  type="button"
                  key={document.id}
                  className={`evidence-document-option${active ? " evidence-document-option-active" : ""}`}
                  onClick={() => toggleDocument(document.id)}
                >
                  <div className="evidence-document-option-copy">
                    <strong>{document.title}</strong>
                    <span>
                      {getCategoryLabel(locale, document.documentCategory)} /{" "}
                      {getTypeLabel(locale, document.documentType)}
                    </span>
                  </div>
                  <span className={`pill ${active ? "pill-green" : "pill-gray"}`}>
                    {active ? copy[locale].linked : copy[locale].select}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
