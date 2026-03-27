import { getLocalizedList, getLocalizedText, type RBotLocale } from "./knowledge-pack";
import { getRBotRuntimeStatus, readRBotRuntimeConfig } from "./runtime";
import type { RBotKnowledgeMatch } from "./retrieval";

interface OllamaResponse {
  message?: {
    content?: string;
  };
}

export function readRBotOllamaConfig() {
  return readRBotRuntimeConfig();
}

function buildSourceDigest(match: RBotKnowledgeMatch, locale: RBotLocale) {
  const { entry } = match;
  const nextSteps = getLocalizedList(entry.nextSteps, locale)
    .map((item) => `- ${item}`)
    .join("\n");
  const caution = entry.caution ? getLocalizedText(entry.caution, locale) : null;

  return [
    `Title: ${getLocalizedText(entry.title, locale)}`,
    `Summary: ${getLocalizedText(entry.summary, locale)}`,
    `Guidance: ${getLocalizedText(entry.answer, locale)}`,
    `Next steps:\n${nextSteps}`,
    caution ? `Caution: ${caution}` : null,
    `Source: ${getLocalizedText(entry.sourceLabel, locale)} (${entry.sourceUrl})`,
    `Verified on: ${entry.verifiedOn}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateRBotAnswerWithOllama({
  locale,
  question,
  matches,
}: {
  locale: RBotLocale;
  question: string;
  matches: RBotKnowledgeMatch[];
}) {
  const config = readRBotOllamaConfig();
  const runtimeStatus = await getRBotRuntimeStatus();

  if (matches.length === 0 || runtimeStatus.status !== "ready") {
    return null;
  }

  const language = locale === "ko" ? "Korean" : "English";
  const sourceDigest = matches.map((match, index) => `Source ${index + 1}\n${buildSourceDigest(match, locale)}`).join("\n\n");
  const systemPrompt = [
    "You are R-Bot, a bounded research-admin assistant for ResearchPages.",
    `Reply in ${language}.`,
    "Use only the provided sources.",
    "Do not invent school-specific rules.",
    "If the sources are not enough for a school-specific question, explicitly ask for the school or program name.",
    "Keep the answer concise and practical.",
  ].join(" ");

  try {
    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: runtimeStatus.model,
        stream: false,
        keep_alive: "30m",
        options: {
          temperature: 0.2,
        },
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Question:\n${question}\n\nSources:\n${sourceDigest}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OllamaResponse;
    const content = data.message?.content?.trim();

    return content || null;
  } catch {
    return null;
  }
}
