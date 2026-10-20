import type { AgentInfo, AgentMessageEvent } from "./agents";
import type { AgentMessage } from "./agent-context";
import type { StopReason } from "./agent-loop";
import type { AgentAction } from "./tools";
import { uid } from "./utils";

export type FeedEntry =
  | { id: string; kind: "user"; text: string; at: number }
  | { id: string; kind: "action"; action: AgentAction }
  | { id: string; kind: "assistant"; text: string; at: number }
  | { id: string; kind: "notice"; text: string; tone: "info" | "warn" | "error"; at: number };

export interface CodeSession {
  id: string;
  title: string;
  projectPath: string;
  projectName: string;
  createdAt: number;
  updatedAt: number;
  feed: FeedEntry[];
  stopReason?: StopReason;
  /** La última ejecución usó el modo agentes: «Continuar» lo mantiene. */
  agentsMode?: boolean;
  agents: AgentInfo[];
  agentMessages: AgentMessageEvent[];
}

const SESSIONS_KEY = "nimchat:code:sessions";
const ACTIVE_KEY = "nimchat:code:active-session";
const transcriptKey = (id: string) => `nimchat:code:transcript:${id}`;
const MAX_FEED = 400;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // cuota llena o sin almacenamiento: la sesión sigue en memoria
  }
}

export function loadSessions(): CodeSession[] {
  const sessions = read<CodeSession[]>(SESSIONS_KEY, []);
  return Array.isArray(sessions) ? sessions : [];
}

export function saveSessions(sessions: CodeSession[]) {
  write(
    SESSIONS_KEY,
    sessions.map((s) => ({ ...s, feed: s.feed.slice(-MAX_FEED) }))
  );
}

export const loadActiveSessionId = () => read<string | null>(ACTIVE_KEY, null);
export const saveActiveSessionId = (id: string | null) => write(ACTIVE_KEY, id);

export const loadTranscript = (id: string) => read<AgentMessage[]>(transcriptKey(id), []);
export const saveTranscript = (id: string, messages: AgentMessage[]) => write(transcriptKey(id), messages);
export function deleteTranscript(id: string) {
  try {
    localStorage.removeItem(transcriptKey(id));
  } catch {
    // nada que borrar
  }
}

export function newSession(projectPath: string, projectName: string): CodeSession {
  const now = Date.now();
  return {
    id: uid("session"),
    title: "Nueva sesión",
    projectPath,
    projectName,
    createdAt: now,
    updatedAt: now,
    feed: [],
    agents: [],
    agentMessages: [],
  };
}

export function titleFromPrompt(text: string): string {
  const line = text.trim().split("\n")[0].replace(/\s+/g, " ");
  return line.length > 44 ? `${line.slice(0, 43)}…` : line || "Nueva sesión";
}

/** Inserta o sustituye una acción (la misma acción pasa de «running» a «success»). */
export function upsertAction(feed: FeedEntry[], action: AgentAction): FeedEntry[] {
  const index = feed.findIndex((e) => e.kind === "action" && e.action.id === action.id);
  if (index >= 0) {
    const next = feed.slice();
    next[index] = { id: next[index].id, kind: "action", action };
    return next;
  }
  return [...feed, { id: `a-${action.id}`, kind: "action", action }];
}

export function relativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "ahora";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}
