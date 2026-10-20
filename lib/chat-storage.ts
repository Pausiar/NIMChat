import { DEFAULT_MODEL_ID } from "./models";
import { uid } from "./utils";

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  model?: string;
}

export interface GenerationParams {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export type MaxTokensMode = "auto" | "manual";

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  apiKey: string;
  globalSystemPrompt: string;
  params: GenerationParams;
  maxTokensMode: MaxTokensMode;
  selectedModel: string;
  theme: "dark" | "light";
  /** Segundos de espera entre peticiones del agente (para no saturar la API). */
  requestDelaySeconds: number;
  /** Máximo de pasos del agente antes de pausar y ofrecer «Continuar». */
  agentMaxIterations: number;
}

const CHATS_KEY = "nimchat:chats";
const SETTINGS_KEY = "nimchat:settings";
const ACTIVE_CHAT_KEY = "nimchat:active-chat";

const LEGACY_SYSTEM_PROMPT =
  "Eres un asistente técnico experto que responde en español de forma clara, concisa y precisa. Cuando muestres código, usa siempre bloques de Markdown con el lenguaje apropiado. Si no sabes algo, dilo honestamente.";

export const DEFAULT_SYSTEM_PROMPT = `Eres un asistente técnico experto. Respondes en español de forma clara, concisa y precisa, salvo que el usuario pida otro idioma.

Reglas:
- Cuando muestres código, usa siempre bloques de Markdown con el lenguaje apropiado.
- Si no sabes algo, dilo honestamente. No inventes APIs, rutas, comandos ni datos.
- No expongas claves privadas, tokens, contraseñas ni secretos: no los repitas, no los escribas en archivos, commits ni logs. Si los encuentras, avisa y propón usar variables de entorno.
- Siempre que trabajes en un proyecto, crea y mantén un archivo context_agent.md en su raíz donde vayas escribiendo el contexto necesario para poder continuar la tarea más tarde: objetivo, estructura del proyecto y dónde está cada cosa, qué está hecho, qué falta y las decisiones tomadas. Léelo al empezar para no tener que releer todo el proyecto y actualízalo al terminar cada bloque de trabajo.
- Prefiere cambios pequeños y verificables, y explica brevemente qué haces y por qué.`;

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  globalSystemPrompt: DEFAULT_SYSTEM_PROMPT,
  params: { temperature: 0.7, maxTokens: 1024, topP: 0.9 },
  maxTokensMode: "auto",
  selectedModel: DEFAULT_MODEL_ID,
  theme: "dark",
  requestDelaySeconds: 0,
  agentMaxIterations: 60,
};

const isBrowser = () => typeof window !== "undefined";

export function loadChats(): Chat[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Chat[]).map((chat) =>
      chat.systemPrompt === LEGACY_SYSTEM_PROMPT ? { ...chat, systemPrompt: undefined } : chat
    );
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[]) {
  if (!isBrowser()) return;
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function loadSettings(): AppSettings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      params?: Partial<GenerationParams>;
    };
    const merged = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      params: {
        ...DEFAULT_SETTINGS.params,
        ...(parsed.params ?? {}),
      },
    };
    // Quien nunca tocó el prompt por defecto recibe el nuevo.
    if (merged.globalSystemPrompt === LEGACY_SYSTEM_PROMPT) {
      merged.globalSystemPrompt = DEFAULT_SYSTEM_PROMPT;
    }
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  if (!isBrowser()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadActiveChatId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACTIVE_CHAT_KEY);
}

export function saveActiveChatId(id: string | null) {
  if (!isBrowser()) return;
  if (id) localStorage.setItem(ACTIVE_CHAT_KEY, id);
  else localStorage.removeItem(ACTIVE_CHAT_KEY);
}

export function createNewChat(model: string, systemPrompt?: string): Chat {
  const now = Date.now();
  return {
    id: uid("chat"),
    title: "Nuevo chat",
    messages: [],
    model,
    systemPrompt,
    createdAt: now,
    updatedAt: now,
  };
}

export function newMessage(
  role: Role,
  content: string,
  model?: string
): Message {
  return {
    id: uid("msg"),
    role,
    content,
    timestamp: Date.now(),
    model,
  };
}
