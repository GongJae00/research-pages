"use client";

import { FilePlus2, UploadCloud } from "lucide-react";
import type {
  ChangeEvent,
  DragEvent,
  ReactNode,
  RefObject,
} from "react";

interface DocumentIntakePanelProps {
  title: string;
  description: string;
  selectLabel: string;
  dropTitle: string;
  dropDescription: string;
  inputRef: RefObject<HTMLInputElement | null>;
  accept: string;
  multiple?: boolean;
  isDragActive: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  children?: ReactNode;
  className?: string;
}

export function DocumentIntakePanel({
  title,
  description,
  selectLabel,
  dropTitle,
  dropDescription,
  inputRef,
  accept,
  multiple = true,
  isDragActive,
  onInputChange,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
  className,
}: DocumentIntakePanelProps) {
  return (
    <section
      className={`card document-upload-card document-intake-panel${className ? ` ${className}` : ""}`}
    >
      <div className="card-header document-upload-header">
        <div>
          <h3>{title}</h3>
          <p className="card-support-text">{description}</p>
        </div>

        <button
          type="button"
          className="primary-cta"
          onClick={() => inputRef.current?.click()}
        >
          <FilePlus2 size={16} />
          {selectLabel}
        </button>
      </div>

      <div
        className={`document-dropzone ${isDragActive ? "document-dropzone-active" : ""}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="document-dropzone-icon">
          <UploadCloud size={22} />
        </div>
        <strong>{dropTitle}</strong>
        <p>{dropDescription}</p>
        <button
          type="button"
          className="secondary-cta"
          onClick={() => inputRef.current?.click()}
        >
          {selectLabel}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          className="document-file-input"
          onChange={onInputChange}
        />
      </div>

      {children ? <div className="document-intake-body">{children}</div> : null}
    </section>
  );
}
