import type { GenerationParams } from "./chat-storage";
import { CODE_TOOLS, executeAgentTool, type AgentAction, type ToolCall } from "./tools";
import { NimChatServerClient } from "./server-client";

export const SYSTEM_PROMPT_CODE = `You are an expert software engineer with full access to the user's local filesystem and terminal through tools.
You work autonomously to complete programming tasks.

Rules:
- Always inspect the project before editing files.
- Always read files before editing them to understand the current state.
- Make minimal, precise changes. Do not rewrite what does not need changing.
- Run tests, type checks, or builds after significant changes when available.
- If you encounter an error, analyze it and fix it before proceeding.
- Explain each action briefly before taking it.
- Ask for clarification only if the task is genuinely ambiguous.
- Never delete files without explicit confirmation from the user.
- When the task is complete, return a concise summary and do not call more tools.

Available tools: read_file, write_file, edit_file, delete_file, run_command, list_directory, search_in_files.
If native tool calling is unavailable, respond with strict JSON:
{"thought":"short reasoning","tool_calls":[{"name":"list_directory","arguments":{"path":".","recursive":false}}]}
When done in JSON fallback mode, respond with {"done":true,"summary":"..."}.`;

interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: unknown;
}

interface RunAgentLoopOptions {
  task: string;
  apiKey: string;
  model: string;
  params: GenerationParams;
  serverUrl?: string;
  maxIterations?: number;
  signal?: AbortSignal;
  onAction: (action: AgentAction) => void;
  onThought?: (content: string) => void;
  onComplete?: (summary: string) => void;
}

interface NimToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
  name?: string;
  arguments?: Record<string, unknown> | string;
}

interface NimResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: NimToolCall[];
    };
    finish_reason?: string | null;
  }>;
}

export async function runAgentLoop(options: RunAgentLoopOptions) {
  const client = new NimChatServerClient(options.serverUrl);
  const maxIterations = options.maxIterations ?? 12;
  const projectInfo = await client.getProjectInfo();
  const messages: AgentMessage[] = [
    { role: "system", content: SYSTEM_PROMPT_CODE },
    {
      role: "user",
      content: `Project: ${projectInfo.name}\nRoot: ${projectInfo.path}\nBranch: ${projectInfo.branch ?? "sin git"}\nTask: ${options.task}`,
    },
  ];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    if (options.signal?.aborted) throw new DOMException("Agent aborted", "AbortError");

    const response = await callNimWithTools({
      apiKey: options.apiKey,
      model: options.model,
      params: options.params,
      messages,
      signal: options.signal,
    });

    const choice = response.choices?.[0];
    const assistantMessage = choice?.message ?? {};
    const content = assistantMessage.content ?? "";
    if (content.trim()) {
      options.onThought?.(content.trim());
      options.onAction({
        id: `think-${Date.now()}-${iteration}`,
        type: "THINK",
        title: "Razonando",
        detail: content.trim().slice(0, 240),
        status: "success",
        timestamp: Date.now(),
        output: content.trim(),
      });
    }

    const parsedFallback = parseFallback(content);
    const toolCalls = normalizeToolCalls(assistantMessage.tool_calls, parsedFallback?.tool_calls);

    messages.push({
      role: "assistant",
      content,
      tool_calls: assistantMessage.tool_calls,
    });

    if (parsedFallback?.done || toolCalls.length === 0) {
      const summary = parsedFallback?.summary || content || "Tarea completada.";
      options.onComplete?.(summary);
      return { summary, iterations: iteration + 1 };
    }

    for (const toolCall of toolCalls) {
      if (options.signal?.aborted) throw new DOMException("Agent aborted", "AbortError");
      const { action, result } = await executeAgentTool(client, toolCall);
      options.onAction(action);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolCall.name,
        content: JSON.stringify(result),
      });

      if (action.status === "needs-confirmation") {
        const summary = "El agente se ha pausado porque una acción requiere confirmación explícita.";
        options.onComplete?.(summary);
        return { summary, iterations: iteration + 1 };
      }
    }
  }

  const summary = "Se alcanzó el límite de iteraciones del agente. Revisa el historial antes de continuar.";
  options.onComplete?.(summary);
  return { summary, iterations: maxIterations };
}

async function callNimWithTools(opts: {
  apiKey: string;
  model: string;
  params: GenerationParams;
  messages: AgentMessage[];
  signal?: AbortSignal;
}) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-nvidia-api-key": opts.apiKey,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: Math.min(opts.params.temperature, 0.4),
      max_tokens: Math.max(opts.params.maxTokens, 4096),
      top_p: opts.params.topP,
      stream: false,
      tools: CODE_TOOLS,
      tool_choice: "auto",
    }),
    signal: opts.signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `NVIDIA NIM error ${response.status}`);
  }
  return response.json() as Promise<NimResponse>;
}

function normalizeToolCalls(nativeCalls?: NimToolCall[], fallbackCalls?: unknown): ToolCall[] {
  const rawCalls = nativeCalls?.length ? nativeCalls : Array.isArray(fallbackCalls) ? fallbackCalls as NimToolCall[] : [];
  return rawCalls.flatMap((call, index) => {
    const name = call.function?.name ?? call.name;
    if (!name) return [];
    const rawArgs = call.function?.arguments ?? call.arguments ?? {};
    const args = typeof rawArgs === "string" ? safeParseArgs(rawArgs) : rawArgs;
    return [{ id: call.id ?? `tool-${Date.now()}-${index}`, name, arguments: args as Record<string, unknown> }];
  });
}

function parseFallback(content: string): { done?: boolean; summary?: string; tool_calls?: unknown[] } | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("```")) return null;
  const jsonText = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function safeParseArgs(value: string) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}
