import type { AppSettings } from "./chat-storage";
import { getModel } from "./models";

export type GenerationMode = "chat" | "design" | "code";

export interface TokenPreset {
  chat: number;
  design: number;
  code: number;
}

export const TOKEN_RANGE = {
  min: 256,
  max: 32768,
  step: 256,
} as const;

const MODEL_TOKEN_PRESETS: Record<string, TokenPreset> = {
  "meta/llama-3.3-70b-instruct": { chat: 4096, design: 12288, code: 12288 },
  "mistralai/mistral-7b-instruct-v0.3": { chat: 3072, design: 8192, code: 8192 },
  "qwen/qwen2.5-72b-instruct": { chat: 6144, design: 16384, code: 16384 },
  "deepseek-ai/deepseek-r1": { chat: 8192, design: 16384, code: 16384 },
  "microsoft/phi-3-mini-128k-instruct": { chat: 3072, design: 8192, code: 8192 },
  "moonshotai/kimi-k2.6": { chat: 6144, design: 16384, code: 16384 },
  "deepseek-ai/deepseek-v4-flash": { chat: 4096, design: 12288, code: 12288 },
  "deepseek-ai/deepseek-v4-pro": { chat: 6144, design: 16384, code: 16384 },
  "z-ai/glm-5.1": { chat: 4096, design: 12288, code: 12288 },
  "google/gemma-4-31b-it": { chat: 4096, design: 12288, code: 12288 },
  "qwen/qwen3.5-122b-a10b": { chat: 6144, design: 16384, code: 16384 },
};

function clampToRange(value: number): number {
  const clamped = Math.min(TOKEN_RANGE.max, Math.max(TOKEN_RANGE.min, value));
  return Math.round(clamped / TOKEN_RANGE.step) * TOKEN_RANGE.step;
}

function getFallbackPreset(modelId: string): TokenPreset {
  const model = getModel(modelId);
  const isFast = model.capabilities.includes("Rápido");
  const isCode = model.capabilities.includes("Código");
  const isReasoning = model.capabilities.includes("Razonamiento");

  if (isFast && !isCode && !isReasoning) {
    return { chat: 3072, design: 8192, code: 8192 };
  }

  if (isCode || isReasoning) {
    return { chat: 6144, design: 16384, code: 16384 };
  }

  return { chat: 4096, design: 12288, code: 12288 };
}

export function getAutoTokenPreset(modelId: string): TokenPreset {
  const preset = MODEL_TOKEN_PRESETS[modelId] ?? getFallbackPreset(modelId);
  return {
    chat: clampToRange(preset.chat),
    design: clampToRange(preset.design),
    code: clampToRange(preset.code),
  };
}

export function resolveMaxTokens(options: {
  settings: Pick<AppSettings, "params" | "selectedModel" | "maxTokensMode">;
  model?: string;
  mode: GenerationMode;
}): number {
  const modelId = options.model ?? options.settings.selectedModel;
  if (options.settings.maxTokensMode === "manual") {
    return clampToRange(options.settings.params.maxTokens);
  }
  return getAutoTokenPreset(modelId)[options.mode];
}