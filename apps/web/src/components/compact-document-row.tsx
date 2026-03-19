"use client";

import type { DocumentRecord } from "@research-os/types";

interface CompactDocumentRowProps {
  document: DocumentRecord;
  meta?: React.ReactNode;
  actions: React.ReactNode;
  onOpen: () => void;
  className?: string;
}

export function CompactDocumentRow({
  document,
  meta,
  actions,
  onOpen,
  className,
}: CompactDocumentRowProps) {
  const displayName = document.originalFileName || document.title;
  const accessibleTitle =
    document.originalFileName && document.originalFileName !== document.title
      ? `${document.originalFileName} (${document.title})`
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
      </div>

      <div className="compact-document-side">
        {meta ? <div className="compact-document-meta">{meta}</div> : null}
        <div className="compact-document-actions">{actions}</div>
      </div>
    </article>
  );
}
