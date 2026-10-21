import { COMPACTION_PROMPT } from "./agent-prompts";
import type { NimChatServerClient } from "./server-client";

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: unknown;
}

/** Tokens aproximados (≈3,5 caracteres por token en texto mezclado con código). */
export function estimateTokens(messages: AgentMessage[]): number {
  let chars = 0;
  for (const message of messages) {
    chars += message.content?.length ?? 0;
    if (message.tool_calls) chars += JSON.stringify(message.tool_calls).length;
  }
  return Math.ceil(chars / 3.5);
}

/** Tope de lo que el modelo ve de una herramienta cuando va inline. */
export const MODEL_RESULT_LIMIT = 4_000;

/** Lo que el modelo ve de una herramienta: se recorta para no llenar el contexto. */
export function limitForModel(text: string, max = MODEL_RESULT_LIMIT): string {
  return text.length > max
    ? `${text.slice(0, max)}\n...[recortado: usa search_in_files, read_file por rangos o recall_artifact]`
    : text;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Agent aborted", "AbortError"));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Agent aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Espacia las llamadas a la API. Se comparte entre el orquestador y los
 * subagentes para que, aunque trabajen en paralelo, no superen el ritmo pedido.
 */
export class Throttle {
  private nextAt = 0;
  constructor(private readonly intervalMs: number) {}

  async wait(signal?: AbortSignal, onStatus?: (text: string | null) => void) {
    if (this.intervalMs <= 0) return;
    const now = Date.now();
    const at = Math.max(now, this.nextAt);
    this.nextAt = at + this.intervalMs;
    const delay = at - now;
    if (delay <= 0) return;
    onStatus?.(`Pausa de ${Math.ceil(delay / 1000)} s entre peticiones para no saturar la API…`);
    await sleep(delay, signal);
    onStatus?.(null);
  }
}

function serialize(messages: AgentMessage[]): string {
  return messages
    .map((message) => {
      if (message.role === "assistant") {
        const calls = Array.isArray(message.tool_calls)
          ? (message.tool_calls as { function?: { name?: string; arguments?: string } }[])
              .map((c) => `${c.function?.name}(${(c.function?.arguments ?? "").slice(0, 200)})`)
              .join(", ")
          : "";
        return `[agente] ${(message.content ?? "").slice(0, 1200)}${calls ? ` -> ${calls}` : ""}`;
      }
      if (message.role === "tool") return `[resultado ${message.name ?? ""}] ${(message.content ?? "").slice(0, 600)}`;
      return `[${message.role}] ${(message.content ?? "").slice(0, 1500)}`;
    })
    .join("\n");
}

export interface CompactionDeps {
  summarize: (system: string, text: string) => Promise<string>;
  /** Tokens de mensajes recientes que se conservan tal cual. */
  keepTailTokens: number;
}

const MEMORY_HEADER = "# Memoria de trabajo (inyectada — no relean context_agent.md ahora)";

/**
 * Sustituye lo antiguo por un resumen. Conserva el prompt de sistema, el primer
 * mensaje y la cola reciente (sin dejar nunca un resultado de herramienta huérfano).
 */
export async function compactMessages(
  messages: AgentMessage[],
  deps: CompactionDeps
): Promise<{ messages: AgentMessage[]; summary: string } | null> {
  // La cola reciente se elige por tamaño, no por número de mensajes: unos pocos
  // resultados enormes también hay que poder resumirlos.
  let start = messages.length;
  let tailTokens = 0;
  while (start > 3) {
    const cost = estimateTokens([messages[start - 1]]);
    if (tailTokens + cost > deps.keepTailTokens && messages.length - start >= 2) break;
    tailTokens += cost;
    start--;
  }
  while (start > 2 && messages[start]?.role === "tool") start--;
  const middle = messages.slice(2, start);
  if (middle.length < 2) return null;

  let summary: string;
  try {
    summary = (await deps.summarize(COMPACTION_PROMPT, serialize(middle))).trim();
    if (!summary) throw new Error("resumen vacío");
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") throw error;
    // Sin resumen del modelo: resumen mecánico con lo esencial.
    summary = `(Resumen automático no disponible.) Acciones previas:\n${serialize(middle).slice(0, 3000)}`;
  }

  const note: AgentMessage = {
    role: "user",
    content:
      `Resumen del contexto anterior (compactado):\n${summary}\n\n` +
      `El estado actual está en el system prompt bajo «Memoria de trabajo». ` +
      `Continúa la tarea. NO empieces por leer context_agent.md ni por reexplorar el proyecto entero; ` +
      `usa search_in_files o read_file solo sobre rutas concretas que necesites.`,
  };
  const next = applyMemoryToSystem([...messages.slice(0, 2), note, ...messages.slice(start)], summary);
  return { messages: next, summary };
}

/** Inyecta o sustituye el bloque de memoria en el mensaje de sistema. */
export function applyMemoryToSystem(messages: AgentMessage[], summary: string): AgentMessage[] {
  if (messages.length === 0) return messages;
  const system = messages[0];
  if (system.role !== "system") return messages;
  const base = (system.content ?? "").replace(/\n\n# Memoria de trabajo[\s\S]*$/, "").trimEnd();
  const block = `\n\n${MEMORY_HEADER}\n${summary.trim()}`;
  return [{ ...system, content: `${base}${block}` }, ...messages.slice(1)];
}

/**
 * Reduce el historial sin llamar al modelo: convierte resultados de tool antiguos
 * en stubs cortos (con path/artifact_id si se pueden inferir).
 */
export function truncateToolResultsMechanically(
  messages: AgentMessage[],
  options?: { keepRecentToolResults?: number; stubMaxChars?: number }
): { messages: AgentMessage[]; stubbed: number } {
  const keepRecent = options?.keepRecentToolResults ?? 4;
  const stubMax = options?.stubMaxChars ?? 280;
  const toolIndexes: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "tool") toolIndexes.push(i);
  }
  if (toolIndexes.length <= keepRecent) {
    return { messages, stubbed: 0 };
  }

  const stubSet = new Set(toolIndexes.slice(0, toolIndexes.length - keepRecent));
  let stubbed = 0;
  const next = messages.map((message, index) => {
    if (!stubSet.has(index) || message.role !== "tool") return message;
    const content = message.content ?? "";
    if (content.length <= stubMax) return message;
    stubbed++;
    const pathMatch = content.match(/"path"\s*:\s*"([^"]+)"/);
    const artMatch = content.match(/"artifact_id"\s*:\s*"(art-\d+)"/);
    const path = pathMatch?.[1];
    const artifactId = artMatch?.[1];
    const stub = {
      stubbed: true,
      tool: message.name,
      path,
      artifact_id: artifactId,
      note: "Resultado omitido para liberar contexto. Usa recall_artifact o read_file/search_in_files si lo necesitas.",
      preview: content.slice(0, Math.min(160, stubMax)),
    };
    return { ...message, content: JSON.stringify(stub) };
  });
  return { messages: next, stubbed };
}

/** True si la compactación redujo al menos `minRatio` del tamaño original. */
export function compactionReducedEnough(before: number, after: number, minRatio = 0.1): boolean {
  if (before <= 0) return after < before;
  return (before - after) / before >= minRatio;
}

const START = "<!-- nimchat:auto-summary:start -->";
const END = "<!-- nimchat:auto-summary:end -->";

/** Guarda el resumen en context_agent.md sin tocar lo que el agente haya escrito. */
export async function saveContextSummary(client: NimChatServerClient, summary: string) {
  try {
    let existing = "";
    try {
      existing = (await client.readFile("context_agent.md")).content;
    } catch {
      // aún no existe
    }
    const block = `${START}\n## Resumen automático (${new Date().toLocaleString("es-ES")})\n${summary}\n${END}`;
    const from = existing.indexOf(START);
    const to = existing.indexOf(END);
    const next =
      from >= 0 && to > from
        ? `${existing.slice(0, from)}${block}${existing.slice(to + END.length)}`
        : `${existing ? `${existing.trimEnd()}\n\n` : "# Contexto del agente\n\n"}${block}\n`;
    await client.writeFile("context_agent.md", next);
  } catch {
    // el resumen sigue en la conversación aunque no se pueda escribir el archivo
  }
}
