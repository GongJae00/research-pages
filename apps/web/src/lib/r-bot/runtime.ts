export interface RBotRuntimeConfig {
  baseUrl: string;
  model: string;
  installCommand: string;
  disabled: boolean;
}

export interface RBotRuntimeStatus extends RBotRuntimeConfig {
  provider: "ollama";
  reachable: boolean;
  modelAvailable: boolean;
  status: "ready" | "pull-required" | "unreachable" | "disabled";
}

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
}

function readValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readBooleanFlag(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function readRBotRuntimeConfig(): RBotRuntimeConfig {
  const model = readValue(process.env.RBOT_MODEL) ?? "qwen3:4b";
  const baseUrl = (readValue(process.env.RBOT_OLLAMA_URL) ?? "http://127.0.0.1:11434").replace(/\/$/, "");

  return {
    baseUrl,
    model,
    installCommand: `ollama pull ${model}`,
    disabled: readBooleanFlag(process.env.RBOT_DISABLE_OLLAMA),
  };
}

export async function getRBotRuntimeStatus(): Promise<RBotRuntimeStatus> {
  const config = readRBotRuntimeConfig();

  if (config.disabled) {
    return {
      ...config,
      provider: "ollama",
      reachable: false,
      modelAvailable: false,
      status: "disabled",
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, {
      headers: {
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ...config,
        provider: "ollama",
        reachable: false,
        modelAvailable: false,
        status: "unreachable",
      };
    }

    const data = (await response.json()) as OllamaTagsResponse;
    const modelAvailable =
      data.models?.some((entry) => entry.name === config.model || entry.model === config.model) ?? false;

    return {
      ...config,
      provider: "ollama",
      reachable: true,
      modelAvailable,
      status: modelAvailable ? "ready" : "pull-required",
    };
  } catch {
    return {
      ...config,
      provider: "ollama",
      reachable: false,
      modelAvailable: false,
      status: "unreachable",
    };
  }
}
