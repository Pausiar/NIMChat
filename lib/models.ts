export type ModelCapability =
  | "Razonamiento"
  | "Código"
  | "Rápido"
  | "Generalista"
  | "Multilingüe";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  size: string;
  capabilities: ModelCapability[];
  description: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: "meta/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    size: "70B",
    capabilities: ["Generalista", "Razonamiento", "Multilingüe"],
    description: "Modelo flagship open-source de Meta, excelente para uso general.",
  },
  {
    id: "mistralai/mistral-7b-instruct-v0.3",
    name: "Mistral 7B Instruct v0.3",
    provider: "Mistral AI",
    size: "7B",
    capabilities: ["Rápido", "Generalista"],
    description: "Modelo ligero y rápido, ideal para respuestas veloces.",
  },
  {
    id: "qwen/qwen2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "Alibaba",
    size: "72B",
    capabilities: ["Razonamiento", "Código", "Multilingüe"],
    description: "Muy fuerte en código y matemáticas, soporta muchos idiomas.",
  },
  {
    id: "deepseek-ai/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    size: "671B (MoE)",
    capabilities: ["Razonamiento", "Código"],
    description: "Modelo de razonamiento con cadena de pensamiento explícita.",
  },
  {
    id: "microsoft/phi-3-mini-128k-instruct",
    name: "Phi-3 Mini 128k",
    provider: "Microsoft",
    size: "3.8B",
    capabilities: ["Rápido", "Generalista"],
    description: "Modelo pequeño con contexto largo (128k tokens).",
  },
  {
    id: "moonshotai/kimi-k2.6",
    name: "Kimi K2.6",
    provider: "Moonshot AI",
    size: "MoE",
    capabilities: ["Razonamiento", "Código", "Multilingüe"],
    description:
      "Modelo versátil orientado a razonamiento, tareas técnicas y uso multilingüe.",
  },
  {
    id: "deepseek-ai/deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    size: "Flash",
    capabilities: ["Rápido", "Generalista", "Código"],
    description:
      "Variante priorizada para baja latencia y respuestas rápidas en tareas generales.",
  },
  {
    id: "deepseek-ai/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    size: "Pro",
    capabilities: ["Razonamiento", "Código", "Generalista"],
    description:
      "Versión más capaz de la familia V4, orientada a calidad y razonamiento complejo.",
  },
  {
    id: "z-ai/glm-5.1",
    name: "GLM 5.1",
    provider: "Z.ai",
    size: "N/D",
    capabilities: ["Generalista", "Multilingüe", "Razonamiento"],
    description:
      "Modelo generalista con buen soporte multilingüe para conversaciones y análisis.",
  },
  {
    id: "google/gemma-4-31b-it",
    name: "Gemma 4 31B IT",
    provider: "Google",
    size: "31B",
    capabilities: ["Generalista", "Código", "Multilingüe"],
    description:
      "Modelo instruction-tuned de 31B, equilibrado para asistencia general y código.",
  },
  {
    id: "qwen/qwen3.5-122b-a10b",
    name: "Qwen 3.5 122B A10B",
    provider: "Qwen",
    size: "122B",
    capabilities: ["Razonamiento", "Código", "Multilingüe"],
    description:
      "Modelo grande de Qwen orientado a razonamiento avanzado, programación y varios idiomas.",
  },
];

export const DEFAULT_MODEL_ID = "meta/llama-3.3-70b-instruct";

/** Modelo recibido de `/v1/models` de NVIDIA NIM (solo los campos que usamos). */
export interface RemoteModel {
  id: string;
  owned_by?: string;
}

// Ids que NIM expone pero no sirven para chat (embeddings, rerankers, imagen…).
const NON_CHAT_PATTERN =
  /embed|rerank|reward|guard|nemoretriever|clip|whisper|tts|asr|stable-diffusion|sdxl|flux|parse|ocr/i;

/** Información mínima para un modelo que no está en el catálogo curado. */
export function deriveModelInfo(id: string): ModelInfo {
  const [owner, ...rest] = id.split("/");
  const slug = rest.length > 0 ? rest.join("/") : owner;
  const name = slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    id,
    name,
    provider: rest.length > 0 ? owner : "NVIDIA NIM",
    size: "N/D",
    capabilities: [],
    description: "Modelo disponible en NVIDIA NIM. Sin ficha curada todavía.",
  };
}

export function getModel(id: string): ModelInfo {
  return AVAILABLE_MODELS.find((m) => m.id === id) ?? deriveModelInfo(id);
}

/**
 * Combina el catálogo remoto con las fichas curadas: primero los modelos
 * curados (en su orden), después el resto por nombre. Si no hay lista remota,
 * devuelve el catálogo local.
 */
export function mergeRemoteModels(remote: RemoteModel[]): ModelInfo[] {
  const chatIds = remote
    .map((m) => m.id)
    .filter((id) => !NON_CHAT_PATTERN.test(id));
  if (chatIds.length === 0) return AVAILABLE_MODELS;

  const remoteSet = new Set(chatIds);
  const curated = AVAILABLE_MODELS.filter((m) => remoteSet.has(m.id));
  const curatedIds = new Set(curated.map((m) => m.id));
  const extra = chatIds
    .filter((id) => !curatedIds.has(id))
    .sort()
    .map(deriveModelInfo);

  return [...curated, ...extra];
}
