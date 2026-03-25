"use client";

import {
  documentCategories,
  documentListSchema,
  documentRecordSchema,
  type DocumentRecord,
  type OwnerScope,
} from "@research-os/types";
import {
  Download,
  Eye,
  FolderArchive,
  PencilLine,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import {
  readFirstJsonFromStorage,
  writeJsonToStorage,
} from "@/lib/browser-json-store";
import {
  deleteDocumentFile,
  createDocumentAssetId,
  getDocumentFile,
  saveDocumentFile,
} from "@/lib/document-file-store";
import {
  createServerDocumentRecord,
  deleteServerDocumentRecord,
  isServerDocumentId,
  syncDocumentsForAccount,
  updateServerDocumentRecord,
} from "@/lib/document-server-store";
import { ensureSeededDocumentFiles } from "@/lib/document-seeds";
import { useAuth } from "@/components/auth-provider";
import { CompactDocumentRow } from "@/components/compact-document-row";
import { DocumentIntakePanel } from "@/components/document-intake-panel";
import type { Locale } from "@/lib/i18n";
import { buildScopedStorageKey } from "@/lib/mock-auth-store";
import {
  categoryTypeMap,
  getCategoryLabel,
  getTypeLabel,
  inferCategoryFromType,
  inferClassification,
  type DocumentCategory,
  type DocumentType,
} from "@/lib/document-taxonomy";

interface DocumentWorkspaceProps {
  locale: Locale;
  initialDocuments: DocumentRecord[];
}

interface UploadDraft {
  id: string;
  file: File;
  fileName: string;
  title: string;
  summary: string;
  documentCategory: DocumentCategory;
  documentType: DocumentType;
  suggestedCategory: DocumentCategory;
  suggestedType: DocumentType;
  tagsText: string;
  mimeType: string;
  fileExtension: string;
  fileSizeBytes: number;
}

interface DocumentPreviewState {
  document: DocumentRecord;
  mode: "iframe" | "text" | "unavailable";
  url?: string;
  text?: string;
  message?: string;
}

const storageBaseKey = "researchos:documents-workspace:v2";
const legacyStorageBaseKey = "researchos:documents-workspace:v1";
const acceptedFileTypes =
  ".pdf,.hwp,.hwpx,.doc,.docx,.csv,.tsv,.xls,.xlsx,.ppt,.pptx,.txt,.md";
const supportedFormatLabels = ["PDF", "HWP/HWPX", "DOC/DOCX", "CSV/XLSX", "PPT/PPTX"] as const;
const textPreviewExtensions = new Set(["txt", "md", "csv", "tsv"]);
const iframePreviewExtensions = new Set(["pdf"]);

const copy = {
  ko: {
    introTitle: "개인 문서 저장소",
    introDescription: "파일을 보관하고, 분류와 설명을 붙여 다시 찾기 쉽게 정리합니다.",
    introCount: "저장 문서",
    introFormats: "지원 형식",
    introMode: "저장 방식",
    introModeValue: "파일 + 분류 + 설명",
    uploadTitle: "문서 추가",
    uploadDescription: "파일을 올리면 대기열에서 분류를 다듬은 뒤 저장할 수 있습니다.",
    dropTitle: "파일을 끌어놓거나 선택해서 추가",
    dropDescription: "저장 후에는 미리보기, 파일 교체, 삭제, 다운로드를 같은 화면에서 처리합니다.",
    selectFiles: "파일 선택",
    queueTitle: "업로드 대기열",
    queueDescription: "아직 저장하지 않은 파일입니다.",
    queueEmpty: "대기 중인 파일이 없습니다.",
    saveAll: "모두 저장",
    clearQueue: "비우기",
    nameLabel: "문서명",
    summaryLabel: "설명",
    summaryPlaceholder: "이 문서가 언제 다시 필요할지 짧게 적어둡니다.",
    tagsLabel: "태그",
    tagsPlaceholder: "예: 울산대학교, 2026전기, 장학금, 국문",
    categoryLabel: "기본 분류",
    typeLabel: "세부 유형",
    recommendationLabel: "파일명 기준 추천",
    saveDraft: "저장",
    removeDraft: "제외",
    libraryTitle: "문서 저장소",
    libraryDescription: "더 압축된 리스트에서 필요한 작업만 바로 이어집니다.",
    searchLabel: "검색",
    searchPlaceholder: "문서명, 설명, 태그, 기관명으로 찾기",
    allCategories: "전체",
    libraryEmpty: "조건에 맞는 문서가 없습니다.",
    noSummary: "설명이 아직 없습니다.",
    formatLabel: "형식",
    updatedLabel: "최근 수정",
    privateBadge: "개인 보관",
    preview: "미리보기",
    replaceFile: "파일 교체",
    download: "다운로드",
    deleteDocument: "삭제",
    deleteConfirm: "이 문서를 저장소에서 삭제할까요?",
    replaceError: "파일을 교체하지 못했습니다.",
    previewError: "미리보기를 불러오지 못했습니다.",
    previewUnavailable: "이 형식은 브라우저에서 바로 미리보기가 어렵습니다.",
    previewNoSource: "원본 파일이 저장되어 있지 않습니다.",
    previewTitle: "문서 미리보기",
    previewClose: "닫기",
    previewMeta: "문서 정보",
    previewTextFallback: "텍스트 미리보기를 준비하지 못했습니다.",
    previewSummary: "설명",
    fileLabel: "원본 파일",
    linkedCategory: "분류",
    linkedType: "세부 유형",
  },
  en: {
    introTitle: "Personal document repository",
    introDescription: "Store files with classification and short notes so they stay easy to retrieve later.",
    introCount: "Stored",
    introFormats: "Formats",
    introMode: "Storage model",
    introModeValue: "File + category + notes",
    uploadTitle: "Add documents",
    uploadDescription: "Dropped files enter the queue first, then you refine classification before saving.",
    dropTitle: "Drop files here or choose them",
    dropDescription: "Preview, replace, delete, and download are handled from the same screen.",
    selectFiles: "Choose files",
    queueTitle: "Upload queue",
    queueDescription: "These files are not stored yet.",
    queueEmpty: "There are no files waiting to be saved.",
    saveAll: "Save all",
    clearQueue: "Clear",
    nameLabel: "Document name",
    summaryLabel: "Description",
    summaryPlaceholder: "Leave a short note about when this file will matter again later.",
    tagsLabel: "Tags",
    tagsPlaceholder: "Example: Ulsan, 2026 spring, scholarship, Korean",
    categoryLabel: "Base category",
    typeLabel: "Detailed type",
    recommendationLabel: "Suggested from file name",
    saveDraft: "Save",
    removeDraft: "Remove",
    libraryTitle: "Document repository",
    libraryDescription: "Use a denser list view and open heavier actions only when needed.",
    searchLabel: "Search",
    searchPlaceholder: "Search by title, summary, tags, or institution",
    allCategories: "All",
    libraryEmpty: "No documents match the current filter.",
    noSummary: "No description yet.",
    formatLabel: "Format",
    updatedLabel: "Updated",
    privateBadge: "Personal only",
    preview: "Preview",
    replaceFile: "Replace file",
    download: "Download",
    deleteDocument: "Delete",
    deleteConfirm: "Delete this document from the repository?",
    replaceError: "Could not replace the file.",
    previewError: "Could not load the preview.",
    previewUnavailable: "This format is difficult to preview directly in the browser.",
    previewNoSource: "The original source file is not stored for this document yet.",
    previewTitle: "Document preview",
    previewClose: "Close",
    previewMeta: "Document info",
    previewTextFallback: "Could not prepare a text preview.",
    previewSummary: "Description",
    fileLabel: "Source file",
    linkedCategory: "Category",
    linkedType: "Detailed type",
  },
} as const;

function createId(prefix: string) {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getTodayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatFileSize(bytes?: number) {
  if (!bytes) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").at(-1)?.toLowerCase() ?? "";
}

function getFormatLabel(fileName?: string, fileExtension?: string) {
  const extension = (fileExtension || (fileName ? getFileExtension(fileName) : "")).toUpperCase();
  return extension || "FILE";
}

function parseTags(value: string, fallbackTag?: string) {
  const fromInput = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (fallbackTag) {
    fromInput.unshift(fallbackTag.toLowerCase());
  }

  return [...new Set(fromInput)];
}

function sortDocuments(items: DocumentRecord[]) {
  return [...items].sort((a, b) => b.updatedOn.localeCompare(a.updatedOn));
}

function buildDraftFromFile(file: File): UploadDraft {
  const fileExtension = getFileExtension(file.name);
  const inferred = inferClassification(file.name);

  return {
    id: createId("draft"),
    file,
    fileName: file.name,
    title: file.name,
    summary: "",
    documentCategory: inferred.documentCategory,
    documentType: inferred.documentType,
    suggestedCategory: inferred.documentCategory,
    suggestedType: inferred.documentType,
    tagsText: fileExtension,
    mimeType: file.type,
    fileExtension,
    fileSizeBytes: file.size,
  };
}

function normalizeStoredDocument(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const normalized = {
    ...candidate,
    documentCategory:
      typeof candidate.documentCategory === "string" &&
      documentCategories.includes(candidate.documentCategory as DocumentCategory)
        ? (candidate.documentCategory as DocumentCategory)
        : inferCategoryFromType((candidate.documentType as DocumentType | undefined) ?? "other"),
  };

  const validated = documentRecordSchema.safeParse(normalized);
  return validated.success ? validated.data : null;
}

function shouldUseTextPreview(document: DocumentRecord) {
  const extension = (document.fileExtension ?? "").toLowerCase();
  return textPreviewExtensions.has(extension) || document.mimeType?.startsWith("text/") === true;
}

function shouldUseIframePreview(document: DocumentRecord) {
  const extension = (document.fileExtension ?? "").toLowerCase();
  return iframePreviewExtensions.has(extension) || document.mimeType === "application/pdf";
}

export function DocumentWorkspace({ locale, initialDocuments }: DocumentWorkspaceProps) {
  const text = copy[locale];
  const queueReadyLabel = locale === "ko" ? "저장 준비" : "Ready to save";
  const queueNextStepLabel =
    locale === "ko"
      ? "분류를 확인한 뒤 저장소에 저장하세요."
      : "Review the category, then save to the repository.";
  const libraryCountLabel = locale === "ko" ? "결과" : "results";
  const repositoryActionHint =
    locale === "ko"
      ? "문서명을 누르면 미리보기가 열리고, 오른쪽 작업으로 교체·다운로드·삭제를 바로 처리할 수 있습니다."
      : "Click a title to preview. Use the row actions for replace, download, or delete.";
  const { currentAccount, backendStatus } = useAuth();
  const ownerAccountId = currentAccount?.id ?? initialDocuments[0]?.owner.id ?? "user-local";
  const owner: OwnerScope = { type: "user", id: ownerAccountId };
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const queueRef = useRef<HTMLDivElement | null>(null);

  const [documents, setDocuments] = useState<DocumentRecord[]>(sortDocuments(initialDocuments));
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<DocumentCategory | "all">("all");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [previewState, setPreviewState] = useState<DocumentPreviewState | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const storageKey = buildScopedStorageKey(storageBaseKey);
  const legacyStorageKey = buildScopedStorageKey(legacyStorageBaseKey);
  const currentAccountId = currentAccount?.id ?? null;

  const buildFileAssetId = (fileName: string, accountId: string) =>
    backendStatus.currentMode === "supabase"
      ? createDocumentAssetId(accountId, fileName)
      : createId("file");

  useEffect(() => {
    try {
      const parsed = readFirstJsonFromStorage<unknown>(
        [storageKey, legacyStorageKey, storageBaseKey, legacyStorageBaseKey],
        null,
      );

      if (!parsed) {
        return;
      }
      const migrated = Array.isArray(parsed)
        ? parsed
            .map((item) => normalizeStoredDocument(item))
            .filter((item): item is DocumentRecord => item !== null)
        : [];

      const validated = documentListSchema.safeParse(migrated);

      if (validated.success) {
        setDocuments(sortDocuments(validated.data));
      }
    } finally {
      setIsHydrated(true);
    }
  }, [legacyStorageKey, storageKey]);

  useEffect(() => {
    if (!currentAccountId) {
      return;
    }

    let cancelled = false;

    void syncDocumentsForAccount(currentAccountId)
      .then((serverDocuments) => {
        if (cancelled || !serverDocuments) {
          return;
        }

        setDocuments(sortDocuments(serverDocuments));
      })
      .catch(() => {
        // Keep the local cache path alive when the server sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [currentAccountId]);

  useEffect(() => {
    void ensureSeededDocumentFiles(documents);
  }, [documents]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writeJsonToStorage(buildScopedStorageKey(storageBaseKey), documents);
  }, [documents, isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const watchedKeys = new Set([storageKey, legacyStorageKey, storageBaseKey, legacyStorageBaseKey]);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && !watchedKeys.has(event.key)) {
        return;
      }

      const parsed = readFirstJsonFromStorage<unknown>(
        [storageKey, legacyStorageKey, storageBaseKey, legacyStorageBaseKey],
        null,
      );

      if (!Array.isArray(parsed)) {
        return;
      }

      const migrated = parsed
        .map((item) => normalizeStoredDocument(item))
        .filter((item): item is DocumentRecord => item !== null);
      const validated = documentListSchema.safeParse(migrated);

      if (validated.success) {
        setDocuments(sortDocuments(validated.data));
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [legacyStorageKey, storageKey]);

  useEffect(() => {
    return () => {
      if (previewState?.url) {
        window.URL.revokeObjectURL(previewState.url);
      }
    };
  }, [previewState]);

  const filteredDocuments = useMemo(
    () =>
      sortDocuments(
        documents.filter((document) => {
          if (
            activeCategoryFilter !== "all" &&
            document.documentCategory !== activeCategoryFilter
          ) {
            return false;
          }

          const haystack = [
            document.title,
            document.originalFileName,
            document.summary,
            document.fileExtension,
            getCategoryLabel(locale, document.documentCategory),
            getTypeLabel(locale, document.documentType),
            ...document.tags,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(searchValue.trim().toLowerCase());
        }),
      ),
    [activeCategoryFilter, documents, locale, searchValue],
  );

  const handleFilesAdded = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setDrafts((current) => [...files.map(buildDraftFromFile), ...current]);
    requestAnimationFrame(() => {
      queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFilesAdded(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    handleFilesAdded(Array.from(event.dataTransfer.files ?? []));
  };

  const updateDraft = <K extends keyof UploadDraft>(id: string, key: K, value: UploadDraft[K]) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [key]: value } : draft)),
    );
  };

  const removeDraft = (id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  };

  const saveDraftRecord = (draft: UploadDraft, fileAssetId: string) =>
    documentRecordSchema.parse({
      id: createId("doc"),
      owner,
      title: draft.title.trim() || draft.fileName,
      documentCategory: draft.documentCategory,
      documentType: draft.documentType,
      sourceKind: "file",
      status: "active",
      visibility: "private",
      summary: draft.summary.trim() || undefined,
      originalFileName: draft.fileName,
      mimeType: draft.mimeType || undefined,
      fileExtension: draft.fileExtension || undefined,
      fileSizeBytes: draft.fileSizeBytes,
      fileAssetId,
      tags: parseTags(draft.tagsText, draft.fileExtension),
      relatedFundingIds: [],
      relatedAffiliationIds: [],
      updatedOn: getTodayInSeoul(),
    });

  const persistDraftRecord = async (draft: UploadDraft) => {
    const fileAssetId = buildFileAssetId(draft.fileName, owner.id);
    const nextRecord = saveDraftRecord(draft, fileAssetId);

    try {
      await saveDocumentFile(fileAssetId, draft.file);
      return await createServerDocumentRecord(nextRecord, owner.id);
    } catch (caught) {
      try {
        await deleteDocumentFile(fileAssetId);
      } catch {
        // Best-effort cleanup only.
      }

      throw caught;
    }
  };

  const saveDraft = async (draftId: string) => {
    const draft = drafts.find((item) => item.id === draftId);

    if (!draft) {
      return;
    }

    try {
      const savedRecord = await persistDraftRecord(draft);
      setDocuments((current) => sortDocuments([savedRecord, ...current]));
      removeDraft(draftId);
    } catch {
      window.alert(locale === "ko" ? "문서를 저장하지 못했습니다." : "Could not save the document.");
    }
  };

  const saveAllDrafts = async () => {
    if (drafts.length === 0) {
      return;
    }

    const nextRecords: DocumentRecord[] = [];

    try {
      for (const draft of drafts) {
        nextRecords.push(await persistDraftRecord(draft));
      }

      setDocuments((current) => sortDocuments([...nextRecords, ...current]));
      setDrafts([]);
    } catch {
      window.alert(locale === "ko" ? "문서를 저장하지 못했습니다." : "Could not save the document.");
    }
  };

  const handleDownload = async (document: DocumentRecord) => {
    if (!document.fileAssetId) {
      window.alert(text.previewNoSource);
      return;
    }

    const file = await getDocumentFile(document.fileAssetId);

    if (!file) {
      window.alert(text.previewNoSource);
      return;
    }

    const url = window.URL.createObjectURL(file);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.originalFileName || document.title;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const closePreview = () => {
    setPreviewState((current) => {
      if (current?.url) {
        window.URL.revokeObjectURL(current.url);
      }

      return null;
    });
  };

  const openPreview = async (document: DocumentRecord) => {
    if (!document.fileAssetId) {
      setPreviewState({ document, mode: "unavailable", message: text.previewNoSource });
      return;
    }

    try {
      const file = await getDocumentFile(document.fileAssetId);

      if (!file) {
        setPreviewState({ document, mode: "unavailable", message: text.previewNoSource });
        return;
      }

      if (shouldUseTextPreview(document)) {
        const rawText = await file.text();
        setPreviewState({
          document,
          mode: "text",
          text: rawText.slice(0, 40000) || text.previewTextFallback,
        });
        return;
      }

      if (shouldUseIframePreview(document)) {
        setPreviewState({
          document,
          mode: "iframe",
          url: window.URL.createObjectURL(file),
        });
        return;
      }

      setPreviewState({ document, mode: "unavailable", message: text.previewUnavailable });
    } catch {
      setPreviewState({ document, mode: "unavailable", message: text.previewError });
    }
  };

  const requestReplaceFile = (documentId: string) => {
    setReplaceTargetId(documentId);
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const targetId = replaceTargetId;

    event.target.value = "";
    setReplaceTargetId(null);

    if (!file || !targetId) {
      return;
    }

    const target = documents.find((item) => item.id === targetId);

    if (!target) {
      return;
    }

    const nextAssetId =
      backendStatus.currentMode === "supabase" || !target.fileAssetId
        ? buildFileAssetId(file.name, target.owner.id)
        : target.fileAssetId;
    const shouldCleanupNewAsset = nextAssetId !== target.fileAssetId;

    try {
      await saveDocumentFile(nextAssetId, file);

      const nextOriginalFileName = file.name;
      const shouldFollowFileName =
        !target.originalFileName || target.title === target.originalFileName;
      const nextRecord: DocumentRecord = {
        ...target,
        title: shouldFollowFileName ? nextOriginalFileName : target.title,
        originalFileName: nextOriginalFileName,
        mimeType: file.type || undefined,
        fileExtension: getFileExtension(file.name) || undefined,
        fileSizeBytes: file.size,
        fileAssetId: nextAssetId,
        updatedOn: getTodayInSeoul(),
      };
      const persistedRecord = isServerDocumentId(target.id)
        ? await updateServerDocumentRecord(nextRecord, target.owner.id)
        : await createServerDocumentRecord(nextRecord, target.owner.id);

      setDocuments((current) =>
        sortDocuments(
          current.map((document) => (document.id === targetId ? persistedRecord : document)),
        ),
      );

      if (shouldCleanupNewAsset && target.fileAssetId) {
        void deleteDocumentFile(target.fileAssetId).catch(() => undefined);
      }

      if (previewState?.document.id === targetId) {
        closePreview();
      }
    } catch {
      try {
        if (shouldCleanupNewAsset) {
          await deleteDocumentFile(nextAssetId);
        }
      } catch {
        // Best-effort cleanup only.
      }

      window.alert(text.replaceError);
    }
  };

  const handleDeleteDocument = async (document: DocumentRecord) => {
    if (!window.confirm(text.deleteConfirm)) {
      return;
    }

    try {
      if (isServerDocumentId(document.id)) {
        await deleteServerDocumentRecord(document.id);
      }

      if (document.fileAssetId) {
        await deleteDocumentFile(document.fileAssetId);
      }
    } catch {
      // Ignore IndexedDB cleanup failures and remove the record anyway.
    }

    setDocuments((current) => current.filter((item) => item.id !== document.id));

    if (previewState?.document.id === document.id) {
      closePreview();
    }
  };

  return (
    <div className="page-standard workspace-page-shell document-workspace">
      <section className="card document-intro-card document-intro-card-compact">
        <div className="document-intro-top">
          <div className="document-intro-copy">
            <strong>{text.introTitle}</strong>
            <p>{text.introDescription}</p>
          </div>

          <div className="document-intro-stats">
            <div className="document-intro-stat">
              <span>{text.introCount}</span>
              <strong>{documents.length}</strong>
            </div>
            <div className="document-intro-stat">
              <span>{text.introFormats}</span>
              <strong>{supportedFormatLabels.length}</strong>
            </div>
            <div className="document-intro-stat">
              <span>{text.introMode}</span>
              <strong>{text.introModeValue}</strong>
            </div>
          </div>
        </div>

        <div className="document-format-row">
          {supportedFormatLabels.map((label) => (
            <span className="tag document-format-chip" key={label}>
              {label}
            </span>
          ))}
        </div>
      </section>

      <DocumentIntakePanel
        title={text.uploadTitle}
        description=""
        selectLabel={text.selectFiles}
        dropTitle={text.dropTitle}
        dropDescription=""
        inputRef={fileInputRef}
        accept={acceptedFileTypes}
        isDragActive={isDragActive}
        onInputChange={handleFileInputChange}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragActive(false);
        }}
        onDrop={handleDrop}
      >
        <div className="document-queue-section" ref={queueRef}>
          <div className="document-section-header">
            <div>
              <h3>{text.queueTitle}</h3>
              <p className="page-subtitle">
                {drafts.length > 0
                  ? `${queueReadyLabel} ${drafts.length}. ${queueNextStepLabel}`
                  : text.queueDescription}
              </p>
            </div>

            {drafts.length > 0 ? (
              <div className="document-section-actions">
                <button type="button" className="secondary-cta" onClick={() => setDrafts([])}>
                  <X size={16} />
                  {text.clearQueue}
                </button>
                <button type="button" className="primary-cta" onClick={() => void saveAllDrafts()}>
                  <FolderArchive size={16} />
                  {text.saveAll}
                </button>
              </div>
            ) : null}
          </div>

          {drafts.length === 0 ? (
            <div className="card document-empty-card">{text.queueEmpty}</div>
          ) : (
            <div className="document-draft-grid">
              {drafts.map((draft) => (
                <article className="card document-draft-card" key={draft.id}>
                  <div className="document-draft-head">
                    <div className="document-draft-file">
                      <span className="document-format-badge">
                        {getFormatLabel(draft.fileName, draft.fileExtension)}
                      </span>
                      <div className="document-draft-file-copy">
                        <strong>{draft.fileName}</strong>
                        <span>{formatFileSize(draft.fileSizeBytes)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="document-draft-form">
                    <label className="editor-field editor-field-full">
                      <span>{text.nameLabel}</span>
                      <input value={draft.title} onChange={(event) => updateDraft(draft.id, "title", event.target.value)} />
                    </label>

                    <label className="editor-field editor-field-full">
                      <span>{text.summaryLabel}</span>
                      <textarea
                        rows={3}
                        value={draft.summary}
                        placeholder={text.summaryPlaceholder}
                        onChange={(event) => updateDraft(draft.id, "summary", event.target.value)}
                      />
                    </label>

                    <div className="document-classification-section">
                      <div className="document-field-header">
                        <span>{text.categoryLabel}</span>
                      </div>
                      <div className="document-category-grid">
                        {documentCategories.map((category) => (
                          <button
                            type="button"
                            key={`${draft.id}-${category}`}
                            className={`document-category-option${draft.documentCategory === category ? " document-category-option-active" : ""}`}
                            onClick={() => {
                              const nextType = categoryTypeMap[category].includes(draft.documentType)
                                ? draft.documentType
                                : categoryTypeMap[category][0];
                              updateDraft(draft.id, "documentCategory", category);
                              updateDraft(draft.id, "documentType", nextType);
                            }}
                          >
                            <strong>{getCategoryLabel(locale, category)}</strong>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="document-classification-section">
                      <div className="document-field-header">
                        <span>{text.typeLabel}</span>
                        <small className="document-recommendation">
                          {text.recommendationLabel}: {getTypeLabel(locale, draft.suggestedType)}
                        </small>
                      </div>
                      <div className="document-type-grid">
                        {categoryTypeMap[draft.documentCategory].map((type) => (
                          <button
                            type="button"
                            key={`${draft.id}-${type}`}
                            className={`document-type-chip${draft.documentType === type ? " document-type-chip-active" : ""}`}
                            onClick={() => updateDraft(draft.id, "documentType", type)}
                          >
                            {getTypeLabel(locale, type)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="editor-field editor-field-full">
                      <span>{text.tagsLabel}</span>
                      <input
                        value={draft.tagsText}
                        placeholder={text.tagsPlaceholder}
                        onChange={(event) => updateDraft(draft.id, "tagsText", event.target.value)}
                      />
                    </label>

                    <div className="editor-actions">
                      <button type="button" className="primary-cta" onClick={() => void saveDraft(draft.id)}>
                        <FolderArchive size={16} />
                        {text.saveDraft}
                      </button>
                      <button type="button" className="secondary-cta" onClick={() => removeDraft(draft.id)}>
                        <Trash2 size={16} />
                        {text.removeDraft}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </DocumentIntakePanel>

      <section className="document-library-section">
        <div className="document-section-header">
            <div>
              <h3>{text.libraryTitle}</h3>
              <p className="page-subtitle">
                {filteredDocuments.length} {libraryCountLabel}. {repositoryActionHint}
              </p>
            </div>

          <label className="document-search-field">
            <span>{text.searchLabel}</span>
            <div className="document-search-input">
              <Search size={16} />
              <input value={searchValue} placeholder={text.searchPlaceholder} onChange={(event) => setSearchValue(event.target.value)} />
            </div>
          </label>
        </div>

        <div className="document-filter-row">
          <button
            type="button"
            className={`document-filter-chip${activeCategoryFilter === "all" ? " document-filter-chip-active" : ""}`}
            onClick={() => setActiveCategoryFilter("all")}
          >
            {text.allCategories}
          </button>
          {documentCategories.map((category) => (
            <button
              type="button"
              key={category}
              className={`document-filter-chip${activeCategoryFilter === category ? " document-filter-chip-active" : ""}`}
              onClick={() => setActiveCategoryFilter(category)}
            >
              {getCategoryLabel(locale, category)}
            </button>
          ))}
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="card document-empty-card">{text.libraryEmpty}</div>
        ) : (
          <div className="document-line-list">
            {filteredDocuments.map((document) => {
              return (
                <CompactDocumentRow
                  key={document.id}
                  document={document}
                  primaryLabel={document.title}
                  secondaryLabel={
                    document.originalFileName && document.originalFileName !== document.title
                      ? document.originalFileName
                      : undefined
                  }
                  detail={
                    <div>
                      <p className="card-support-text">
                        {getCategoryLabel(locale, document.documentCategory)} ·{" "}
                        {getTypeLabel(locale, document.documentType)} · {text.formatLabel}:{" "}
                        {getFormatLabel(
                          document.originalFileName,
                          document.fileExtension,
                        )}
                      </p>
                      {document.summary ? (
                        <p className="card-support-text">{document.summary}</p>
                      ) : null}
                    </div>
                  }
                  meta={
                    <>
                      <span>{text.updatedLabel}</span>
                      <strong>{document.updatedOn}</strong>
                    </>
                  }
                  onOpen={() => void openPreview(document)}
                  actions={
                    <>
                      <button
                        type="button"
                        className="document-icon-btn"
                        onClick={() => void openPreview(document)}
                        aria-label={text.preview}
                        title={text.preview}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className="document-icon-btn"
                        onClick={() => requestReplaceFile(document.id)}
                        aria-label={text.replaceFile}
                        title={text.replaceFile}
                      >
                        <PencilLine size={15} />
                      </button>
                      <button
                        type="button"
                        className="document-icon-btn"
                        onClick={() => void handleDownload(document)}
                        aria-label={text.download}
                        title={text.download}
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        className="document-icon-btn document-icon-btn-danger"
                        onClick={() => void handleDeleteDocument(document)}
                        aria-label={text.deleteDocument}
                        title={text.deleteDocument}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <input ref={replaceInputRef} type="file" accept={acceptedFileTypes} className="document-file-input" onChange={handleReplaceFile} />

      {previewState ? (
        <div className="document-preview-overlay" role="dialog" aria-modal="true">
          <div className="document-preview-modal document-preview-modal-wide card">
            <div className="card-header document-preview-header">
              <div>
                <h3>{text.previewTitle}</h3>
                <p className="card-support-text">{previewState.document.title}</p>
              </div>
              <button type="button" className="secondary-cta" onClick={closePreview}>
                <X size={16} />
                {text.previewClose}
              </button>
            </div>

            <div className="document-preview-layout">
              <div className="document-preview-surface">
                {previewState.mode === "iframe" && previewState.url ? <iframe title={previewState.document.title} src={previewState.url} className="document-preview-frame" /> : null}
                {previewState.mode === "text" ? <pre className="document-preview-text">{previewState.text}</pre> : null}
                {previewState.mode === "unavailable" ? (
                  <div className="document-preview-empty">
                    <strong>{previewState.message}</strong>
                  </div>
                ) : null}
              </div>

              <aside className="document-preview-sidebar">
                <div className="document-preview-info">
                  <strong>{text.previewMeta}</strong>
                  <dl className="document-preview-meta">
                    <div><dt>{text.fileLabel}</dt><dd>{previewState.document.originalFileName ?? "-"}</dd></div>
                    <div><dt>{text.linkedCategory}</dt><dd>{getCategoryLabel(locale, previewState.document.documentCategory)}</dd></div>
                    <div><dt>{text.linkedType}</dt><dd>{getTypeLabel(locale, previewState.document.documentType)}</dd></div>
                    <div><dt>{text.updatedLabel}</dt><dd>{previewState.document.updatedOn}</dd></div>
                  </dl>
                </div>

                <div className="document-preview-summary-card">
                  <strong>{text.previewSummary}</strong>
                  <p>{previewState.document.summary || text.noSummary}</p>
                </div>

                <div className="document-preview-actions">
                  <button type="button" className="secondary-cta document-action-btn" onClick={() => requestReplaceFile(previewState.document.id)}>
                    <PencilLine size={15} />
                    {text.replaceFile}
                  </button>
                  <button type="button" className="secondary-cta document-action-btn" onClick={() => void handleDownload(previewState.document)}>
                    <Download size={15} />
                    {text.download}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
