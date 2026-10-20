import type { ModelInfo } from "./models";

export const ORCHESTRATOR_NAME = "orquestador";
export const MAX_SUBAGENTS_PER_RUN = 8;
export const MAX_PARALLEL_SUBAGENTS = 4;
export const SUBAGENT_MAX_ITERATIONS = 16;

export type AgentStatus = "running" | "done" | "error";

export interface AgentInfo {
  name: string;
  role: string;
  model: string;
  task: string;
  status: AgentStatus;
  startedAt: number;
  finishedAt?: number;
  summary?: string;
  actionCount: number;
}

export interface AgentMessageEvent {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

const AGENTS_REQUEST_PATTERN =
  /\b(sub-?agent(?:e|es|s)?|multi-?agent(?:e|es|s)?|agentes|agents|orquest\w+|orchestrat\w+)\b/i;

/** El modo agentes solo se activa cuando el usuario lo pide con sus palabras. */
export function wantsAgents(task: string): boolean {
  return AGENTS_REQUEST_PATTERN.test(task);
}

export const DELEGATE_TOOLS = [
  {
    type: "function",
    function: {
      name: "delegate_task",
      description:
        "Delegate a self-contained sub-task to a specialised sub-agent. Several delegate_task calls in the same turn run in parallel. Returns the sub-agent's final summary.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short unique agent name, e.g. 'backend' or 'tests'" },
          role: { type: "string", description: "One-line specialisation" },
          task: { type: "string", description: "Complete instructions, including which files it owns" },
          model: { type: "string", description: "Optional model id from the available list" },
        },
        required: ["name", "task"],
      },
    },
  },
] as const;

export const EXPLORE_TOOLS = [
  {
    type: "function",
    function: {
      name: "explore_project",
      description:
        "Delegate a read-only investigation to an explorer sub-agent. It reads files and returns which ones matter and what to change in each, keeping your own context small. Use it before editing in an unfamiliar or large project.",
      parameters: {
        type: "object",
        properties: { question: { type: "string", description: "What you need to find out, including the task goal" } },
        required: ["question"],
      },
    },
  },
] as const;

export const MESSAGE_TOOLS = [
  {
    type: "function",
    function: {
      name: "send_message",
      description:
        "Send a message to another agent (by name) or to 'all'. The recipient reads it at the start of its next step.",
      parameters: {
        type: "object",
        properties: { to: { type: "string" }, message: { type: "string" } },
        required: ["to", "message"],
      },
    },
  },
] as const;

export function buildOrchestratorPrompt(models: ModelInfo[]): string {
  const catalog = models
    .slice(0, 40)
    .map((m) => `- ${m.id}${m.capabilities.length ? ` (${m.capabilities.join(", ")})` : ""}`)
    .join("\n");
  return `

# Agents mode (activated by the user)
You are the orchestrator. You may split the task across sub-agents with delegate_task.
- Delegate only when it helps. Small tasks: do them yourself.
- Put independent sub-tasks in the SAME turn so they run in parallel (max ${MAX_PARALLEL_SUBAGENTS} at once, ${MAX_SUBAGENTS_PER_RUN} per run).
- Give each sub-agent a distinct set of files so they never edit the same file.
- Pick a model per sub-agent with the "model" argument. Use fast models for simple work and strong reasoning/coding models for hard work. Available models:
${catalog}
- Sub-agents can talk to each other and to you ("${ORCHESTRATOR_NAME}") with send_message.
- When sub-agents finish, verify the result (build/tests) and give the user one concise summary.`;
}

export function buildSubagentPrompt(base: string, name: string, role: string, peers: string[]): string {
  return `${base}

# You are sub-agent "${name}"${role ? ` (${role})` : ""}
- Do only the task you were given; do not touch files outside its scope.
- Use send_message to coordinate with: ${[ORCHESTRATOR_NAME, ...peers].join(", ")}.
- You cannot create other agents.
- Finish with a short summary listing the files you changed.`;
}

/** Buzón compartido: cada agente lee sus mensajes al inicio de cada paso. */
export class Mailbox {
  private boxes = new Map<string, string[]>();

  register(name: string) {
    if (!this.boxes.has(name)) this.boxes.set(name, []);
  }

  names(): string[] {
    return [...this.boxes.keys()];
  }

  /** Devuelve los destinatarios reales o `null` si el destino no existe. */
  send(from: string, to: string, content: string): string[] | null {
    const targets =
      to === "all" ? this.names().filter((n) => n !== from) : this.boxes.has(to) ? [to] : [];
    if (targets.length === 0) return null;
    for (const target of targets) this.boxes.get(target)!.push(`[${from}] ${content}`);
    return targets;
  }

  drain(name: string): string[] {
    const pending = this.boxes.get(name) ?? [];
    this.boxes.set(name, []);
    return pending;
  }
}
