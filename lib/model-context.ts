/**
 * Presupuesto de contexto por modelo.
 *
 * Distingue context window (entrada+salida) de max_tokens (solo salida).
 * En NIM hosted el techo efectivo suele ser menor que el nativo del modelo;
 * `NIM_HOSTED_INPUT_CAP` limita el cálculo para no compactar demasiado tarde.
 */

export interface ModelContextLimits {
  /** Ventana nativa documentada del modelo. */
  contextWindow: number;
  /** Tope habitual de salida en la API hosted. */
  maxOutput: number;
}

/** Cap conservador del input usable en integrate.api.nvidia.com. */
export const NIM_HOSTED_INPUT_CAP = 32_768;

const MODEL_LIMITS: Record<string, ModelContextLimits> = {
  "meta/llama-3.3-70b-instruct": { contextWindow: 128_000, maxOutput: 4_096 },
  "mistralai/mistral-7b-instruct-v0.3": { contextWindow: 32_768, maxOutput: 4_096 },
  "qwen/qwen2.5-72b-instruct": { contextWindow: 131_072, maxOutput: 4_096 },
  "deepseek-ai/deepseek-r1": { contextWindow: 128_000, maxOutput: 8_192 },
  "microsoft/phi-3-mini-128k-instruct": { contextWindow: 128_000, maxOutput: 4_096 },
  "moonshotai/kimi-k2.6": { contextWindow: 128_000, maxOutput: 4_096 },
  "deepseek-ai/deepseek-v4-flash": { contextWindow: 128_000, maxOutput: 4_096 },
  "deepseek-ai/deepseek-v4-pro": { contextWindow: 128_000, maxOutput: 8_192 },
  "z-ai/glm-5.1": { contextWindow: 128_000, maxOutput: 4_096 },
  "google/gemma-4-31b-it": { contextWindow: 128_000, maxOutput: 4_096 },
  "qwen/qwen3.5-122b-a10b": { contextWindow: 131_072, maxOutput: 8_192 },
};

const FALLBACK_LIMITS: ModelContextLimits = {
  contextWindow: 32_768,
  maxOutput: 4_096,
};

export function getModelContextLimits(modelId: string): ModelContextLimits {
  return MODEL_LIMITS[modelId] ?? FALLBACK_LIMITS;
}

/** Tokens de entrada que podemos usar sin comerse el cupo de salida. */
export function getUsableInputBudget(modelId: string, requestedMaxTokens: number): number {
  const limits = getModelContextLimits(modelId);
  const effectiveWindow = Math.min(limits.contextWindow, NIM_HOSTED_INPUT_CAP);
  const outputReserve = Math.min(Math.max(256, requestedMaxTokens), limits.maxOutput);
  const safety = 1_024;
  return Math.max(4_096, effectiveWindow - outputReserve - safety);
}

/** Umbral blando: a partir de aquí se intenta compactar (con cooldown). */
export function getSoftCompactAt(modelId: string, requestedMaxTokens: number): number {
  return Math.floor(getUsableInputBudget(modelId, requestedMaxTokens) * 0.6);
}

/** Umbral duro: truncate mecánico aunque el summarizer no ayude. */
export function getHardTruncateAt(modelId: string, requestedMaxTokens: number): number {
  return Math.floor(getUsableInputBudget(modelId, requestedMaxTokens) * 0.85);
}
