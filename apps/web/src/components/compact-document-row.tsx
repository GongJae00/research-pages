"use client";

import type { DocumentRecord } from "@research-os/types";

interface CompactDocumentRowProps {
  document: DocumentRecord;
  primaryLabel?: string;
  secondaryLabel?: string;
  meta?: React.ReactNode;
  detail?: React.ReactNode;
  actions: React.ReactNode;
  onOpen: () => void;
  className?: string;
}

export function CompactDocumentRow({
  document,
  primaryLabel,
  secondaryLabel,
  meta,
  detail,
  actions,
  onOpen,
  className,
}: CompactDocumentRowProps) {
  const displayName = primaryLabel || document.originalFileName || document.title;
  const supportingName =
    secondaryLabel && secondaryLabel !== displayName ? secondaryLabel : undefined;
  const accessibleTitle =
    supportingName
      ? `${displayName} (${supportingName})`
      : displayName;

  return (
    <article
      className={`compact-document-row${className ? ` ${className}` : ""}`}
      onDoubleClick={onOpen}
    >
      <div className="compact-document-main">
        <button
          type="button"
          className="compact-document-title"
          title={accessibleTitle}
          onClick={onOpen}
        >
          {displayName}
        </button>
        {supportingName ? <p className="card-support-text">{supportingName}</p> : null}
        {detail ? <div>{detail}</div> : null}
      </div>

      <div className="compact-document-side">
        {meta ? <div className="compact-document-meta">{meta}</div> : null}
        <div className="compact-document-actions">{actions}</div>
      </div>
    </article>
  );
}
