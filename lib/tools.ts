import type { NimChatServerClient } from "./server-client";

export type AgentActionType = "READ" | "WRITE" | "EDIT" | "DELETE" | "RUN" | "SEARCH" | "GIT" | "THINK";
export type AgentActionStatus = "pending" | "running" | "success" | "error" | "needs-confirmation";

export interface AgentAction {
  id: string;
  type: AgentActionType;
  title: string;
  detail?: string;
  status: AgentActionStatus;
  timestamp: number;
  durationMs?: number;
  output?: string;
  diff?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export const CODE_TOOLS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the content of a file at the given path",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file with new content",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Replace specific 1-based lines in a file. Prefer this over write_file for partial changes",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          startLine: { type: "number" },
          endLine: { type: "number" },
          newContent: { type: "string" },
        },
        required: ["path", "startLine", "endLine", "newContent"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file or empty directory. Requires explicit user confirmation for destructive actions",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, confirm: { type: "boolean" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Execute a shell command in the project directory. Use for builds, tests, installs",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          cwd: { type: "string" },
          confirm: { type: "boolean" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "List files and folders in a directory with metadata",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, recursive: { type: "boolean" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_in_files",
      description: "Search for a string or regex pattern across project files",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          filePattern: { type: "string" },
          caseSensitive: { type: "boolean" },
        },
        required: ["query"],
      },
    },
  },
] as const;

export async function executeAgentTool(client: NimChatServerClient, call: ToolCall) {
  const started = Date.now();
  const action = createAction(call);
  try {
    const result = await runTool(client, call);
    return {
      action: { ...action, status: "success" as const, durationMs: Date.now() - started, output: stringifyToolResult(result) },
      result,
    };
  } catch (error) {
    const requiresConfirmation = Boolean((error as { requiresConfirmation?: boolean })?.requiresConfirmation);
    const output = error instanceof Error ? error.message : String(error);
    return {
      action: {
        ...action,
        status: requiresConfirmation ? "needs-confirmation" as const : "error" as const,
        durationMs: Date.now() - started,
        output,
      },
      result: { error: output, requiresConfirmation },
    };
  }
}

function createAction(call: ToolCall): AgentAction {
  const args = call.arguments;
  const path = typeof args.path === "string" ? args.path : undefined;
  const command = typeof args.command === "string" ? args.command : undefined;
  const titleByTool: Record<string, { type: AgentActionType; title: string }> = {
    read_file: { type: "READ", title: `Leyendo ${path ?? "archivo"}` },
    write_file: { type: "WRITE", title: `Escribiendo ${path ?? "archivo"}` },
    edit_file: { type: "EDIT", title: `Editando ${path ?? "archivo"}` },
    delete_file: { type: "DELETE", title: `Eliminando ${path ?? "archivo"}` },
    run_command: { type: "RUN", title: `Ejecutando ${command ?? "comando"}` },
    list_directory: { type: "READ", title: `Listando ${path ?? "directorio"}` },
    search_in_files: { type: "SEARCH", title: `Buscando ${String(args.query ?? "")}` },
  };
  const meta = titleByTool[call.name] ?? { type: "THINK" as const, title: call.name };
  return {
    id: call.id,
    type: meta.type,
    title: meta.title,
    detail: compactArgs(args),
    status: "running",
    timestamp: Date.now(),
  };
}

async function runTool(client: NimChatServerClient, call: ToolCall) {
  const args = call.arguments;
  switch (call.name) {
    case "read_file":
      return client.readFile(requiredString(args.path, "path"));
    case "write_file":
      return client.writeFile(requiredString(args.path, "path"), requiredString(args.content, "content"));
    case "edit_file":
      return client.editFile(
        requiredString(args.path, "path"),
        requiredNumber(args.startLine, "startLine"),
        requiredNumber(args.endLine, "endLine"),
        requiredString(args.newContent, "newContent")
      );
    case "delete_file":
      return client.deleteFile(requiredString(args.path, "path"), Boolean(args.confirm));
    case "run_command":
      return client.runCommand(requiredString(args.command, "command"), typeof args.cwd === "string" ? args.cwd : ".", "agent", Boolean(args.confirm));
    case "list_directory":
      return client.listFiles(requiredString(args.path, "path"), Boolean(args.recursive));
    case "search_in_files": {
      const query = requiredString(args.query, "query");
      const pattern = typeof args.filePattern === "string" && args.filePattern ? args.filePattern : "**/*";
      const flags = args.caseSensitive ? "" : "-i";
      const command = `npx --yes rg ${flags} --line-number --hidden --glob "!node_modules" --glob "!.git" --glob "!.next" --glob "${pattern}" ${JSON.stringify(query)}`;
      return client.runCommand(command, ".", "agent");
    }
    default:
      throw new Error(`Tool desconocida: ${call.name}`);
  }
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string") throw new Error(`${name} debe ser string.`);
  return value;
}

function requiredNumber(value: unknown, name: string) {
  if (typeof value !== "number") throw new Error(`${name} debe ser number.`);
  return value;
}

function compactArgs(args: Record<string, unknown>) {
  return Object.entries(args)
    .filter(([key]) => key !== "content" && key !== "newContent")
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

function stringifyToolResult(result: unknown) {
  const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
  return text.length > 4000 ? `${text.slice(0, 4000)}\n...[resultado truncado]` : text;
}
