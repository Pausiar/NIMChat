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
  selectedModel: string;
  theme: "dark" | "light";
}

const CHATS_KEY = "nimchat:chats";
const SETTINGS_KEY = "nimchat:settings";
const ACTIVE_CHAT_KEY = "nimchat:active-chat";

export const DEFAULT_SYSTEM_PROMPT =
  "Eres un asistente técnico experto que responde en español de forma clara, concisa y precisa. Cuando muestres código, usa siempre bloques de Markdown con el lenguaje apropiado. Si no sabes algo, dilo honestamente.";

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  globalSystemPrompt: DEFAULT_SYSTEM_PROMPT,
  params: { temperature: 0.7, maxTokens: 1024, topP: 0.9 },
  selectedModel: DEFAULT_MODEL_ID,
  theme: "dark",
};

const isBrowser = () => typeof window !== "undefined";

export function loadChats(): Chat[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
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
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
