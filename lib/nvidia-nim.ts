import type { GenerationParams, Message } from "./chat-storage";

export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

export interface StreamChatOptions {
  apiKey: string;
  model: string;
  messages: Pick<Message, "role" | "content">[];
  params: GenerationParams;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onReasoning?: (token: string) => void;
}

interface NimDelta {
  content?: string;
  reasoning_content?: string;
  role?: string;
}

interface NimChunk {
  choices?: { delta?: NimDelta; finish_reason?: string | null }[];
}

/**
 * Streams a chat completion through our own /api/chat proxy so the API key
 * never needs to leave the browser via CORS-prone direct calls — but the key
 * itself is still user-provided and forwarded per request.
 */
export async function streamChat(opts: StreamChatOptions): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-nvidia-api-key": opts.apiKey,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.params.temperature,
      max_tokens: opts.params.maxTokens,
      top_p: opts.params.topP,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new Error(humanizeError(res.status, detail));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const rawLine = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      const line = rawLine.trim();
      if (!line || !line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data) as NimChunk;
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.reasoning_content && opts.onReasoning) {
          opts.onReasoning(delta.reasoning_content);
        }
        if (delta.content) {
          opts.onToken(delta.content);
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
}

function humanizeError(status: number, detail: string): string {
  if (status === 401 || status === 403) {
    return "API key inválida o sin permisos. Revisa tu key en ajustes.";
  }
  if (status === 429) {
    return "Has alcanzado el límite de uso (rate limit). Espera un momento e intenta de nuevo.";
  }
  if (status === 404) {
    return "El modelo seleccionado no está disponible en NVIDIA NIM.";
  }
  if (status >= 500) {
    return "Error del servidor de NVIDIA NIM. Intenta más tarde.";
  }
  return `Error ${status}: ${detail.slice(0, 300) || "petición fallida"}`;
}
