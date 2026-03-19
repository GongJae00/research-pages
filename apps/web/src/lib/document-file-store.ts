import { getCollaborationBackendStatus } from "./collaboration/runtime";
import { getSupabaseBrowserClient } from "./supabase/browser-client";

const DB_NAME = "researchos-document-files";
const STORE_NAME = "files";
const DB_VERSION = 1;
const supabaseDocumentBucket = "documents";

function createRandomId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function parseSupabaseAssetId(assetId: string) {
  if (!assetId.startsWith(`${supabaseDocumentBucket}/`)) {
    return null;
  }

  const path = assetId.slice(supabaseDocumentBucket.length + 1);
  if (!path) {
    return null;
  }

  return {
    bucket: supabaseDocumentBucket,
    path,
  };
}

function shouldUseSupabaseStorage(assetId: string) {
  const backendStatus = getCollaborationBackendStatus();
  return (
    backendStatus.currentMode === "supabase" &&
    backendStatus.supabaseConfigured &&
    parseSupabaseAssetId(assetId) !== null
  );
}

async function saveDocumentFileToSupabase(assetId: string, file: Blob) {
  const parsed = parseSupabaseAssetId(assetId);

  if (!parsed) {
    throw new Error("Invalid Supabase asset path.");
  }

  const client = getSupabaseBrowserClient();
  const { error } = await client.storage.from(parsed.bucket).upload(parsed.path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) {
    throw error;
  }
}

async function getDocumentFileFromSupabase(assetId: string) {
  const parsed = parseSupabaseAssetId(assetId);

  if (!parsed) {
    return null;
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client.storage.from(parsed.bucket).download(parsed.path);

  if (error) {
    throw error;
  }

  return data;
}

async function deleteDocumentFileFromSupabase(assetId: string) {
  const parsed = parseSupabaseAssetId(assetId);

  if (!parsed) {
    return;
  }

  const client = getSupabaseBrowserClient();
  const { error } = await client.storage.from(parsed.bucket).remove([parsed.path]);

  if (error) {
    throw error;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB."));
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export function createDocumentAssetId(ownerAccountId: string, originalFileName: string) {
  const fileName = sanitizeFileName(originalFileName) || "document";
  return `${supabaseDocumentBucket}/${ownerAccountId}/${createRandomId()}-${fileName}`;
}

export async function saveDocumentFile(assetId: string, file: Blob): Promise<void> {
  if (shouldUseSupabaseStorage(assetId)) {
    await saveDocumentFileToSupabase(assetId, file);
    return;
  }

  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file, assetId);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to store file."));
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Failed to store file."));
  });

  database.close();
}

export async function getDocumentFile(assetId: string): Promise<Blob | null> {
  if (shouldUseSupabaseStorage(assetId)) {
    return getDocumentFileFromSupabase(assetId);
  }

  const database = await openDatabase();

  const result = await new Promise<Blob | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(assetId);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to read file."));
    };

    request.onsuccess = () => {
      resolve((request.result as Blob | undefined) ?? null);
    };
  });

  database.close();
  return result;
}

export async function deleteDocumentFile(assetId: string): Promise<void> {
  if (shouldUseSupabaseStorage(assetId)) {
    await deleteDocumentFileFromSupabase(assetId);
    return;
  }

  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(assetId);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to delete file."));
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Failed to delete file."));
  });

  database.close();
}
