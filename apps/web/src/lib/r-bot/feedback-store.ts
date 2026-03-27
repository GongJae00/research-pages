"use client";

import { readJsonFromStorage, writeJsonToStorage } from "@/lib/browser-json-store";
import { getActiveAccountId } from "@/lib/mock-auth-store";

export type RBotFeedbackSurface = "public-guide" | "document-finder" | "workspace-assistant";
export type RBotFeedbackVerdict = "positive" | "negative" | "opened";

export interface RBotFeedbackRecord {
  id: string;
  createdAt: string;
  accountId: string | null;
  locale: "ko" | "en";
  surface: RBotFeedbackSurface;
  verdict: RBotFeedbackVerdict;
  question: string;
  answerMode?: "local-model" | "source-only" | "workspace-search" | "workspace-guide";
  answer?: string;
  citationIds?: string[];
  matchedTopics?: string[];
  matchedDocumentIds?: string[];
  selectedDocumentId?: string;
  note?: string;
}

const feedbackStorageKey = "researchos:r-bot-feedback:v1";

function createId(prefix: string) {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readRBotFeedback() {
  return readJsonFromStorage<RBotFeedbackRecord[]>(feedbackStorageKey, []);
}

export function appendRBotFeedback(
  input: Omit<RBotFeedbackRecord, "id" | "createdAt" | "accountId">,
) {
  const current = readRBotFeedback();
  const nextRecord: RBotFeedbackRecord = {
    id: createId("rbot-feedback"),
    createdAt: new Date().toISOString(),
    accountId: getActiveAccountId(),
    ...input,
  };

  writeJsonToStorage(feedbackStorageKey, [nextRecord, ...current].slice(0, 300));
  return nextRecord;
}
