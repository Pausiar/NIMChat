import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { ServerError } from "../utils/security";

export type McpTransportKind = "stdio" | "http";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpTransportKind;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  /** Si es false, el agente solo ve las herramientas marcadas como de solo lectura. */
  allowWrites: boolean;
}

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
}

export type McpStatus = "disconnected" | "connecting" | "connected" | "error";

interface Runtime {
  client?: Client;
  status: McpStatus;
  error?: string;
  tools: McpToolInfo[];
  connecting?: Promise<void>;
}

export const SECRET_MASK = "••••••••";
const CONNECT_TIMEOUT_MS = 25_000;
const CALL_TIMEOUT_MS = 60_000;

function configDir() {
  return process.env.NIMCHAT_CONFIG_DIR ?? path.join(os.homedir(), ".nimchat");
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: tiempo agotado (${ms / 1000}s)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key, v]) => key.trim() && typeof v === "string"
  ) as [string, string][];
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export class McpManager {
  private configs: McpServerConfig[] = [];
  private runtimes = new Map<string, Runtime>();
  private readonly file = path.join(configDir(), "mcp.json");

  constructor() {
    this.load();
  }

  private load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (Array.isArray(parsed.servers)) this.configs = parsed.servers as McpServerConfig[];
    } catch {
      this.configs = [];
    }
  }

  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    // Puede contener tokens: solo legible por el usuario.
    fs.writeFileSync(this.file, JSON.stringify({ servers: this.configs }, null, 2), { mode: 0o600 });
  }

  private runtime(id: string): Runtime {
    let runtime = this.runtimes.get(id);
    if (!runtime) {
      runtime = { status: "disconnected", tools: [] };
      this.runtimes.set(id, runtime);
    }
    return runtime;
  }

  private find(id: string) {
    const config = this.configs.find((c) => c.id === id);
    if (!config) throw new ServerError(404, "Conector no encontrado.");
    return config;
  }

  /** Lista para la interfaz: los valores secretos nunca salen del servidor. */
  list() {
    return this.configs.map((config) => {
      const runtime = this.runtime(config.id);
      return {
        ...config,
        env: config.env ? Object.fromEntries(Object.keys(config.env).map((k) => [k, SECRET_MASK])) : undefined,
        headers: config.headers
          ? Object.fromEntries(Object.keys(config.headers).map((k) => [k, SECRET_MASK]))
          : undefined,
        status: runtime.status,
        error: runtime.error,
        tools: runtime.tools,
      };
    });
  }

  async upsert(input: Partial<McpServerConfig> & Record<string, unknown>) {
    const previous = input.id ? this.configs.find((c) => c.id === input.id) : undefined;
    const name = String(input.name ?? "").trim();
    if (!name || name.length > 40) throw new ServerError(400, "El nombre es obligatorio (máx. 40 caracteres).");
    const transport: McpTransportKind = input.transport === "http" ? "http" : "stdio";

    const merge = (incoming: Record<string, string> | undefined, old: Record<string, string> | undefined) => {
      if (!incoming) return undefined;
      // Un valor enmascarado significa «no lo cambié»: se conserva el guardado.
      return Object.fromEntries(
        Object.entries(incoming).map(([key, value]) => [key, value === SECRET_MASK ? (old?.[key] ?? "") : value])
      );
    };

    const config: McpServerConfig = {
      id: previous?.id ?? randomUUID(),
      name,
      transport,
      enabled: input.enabled !== false,
      allowWrites: input.allowWrites === true,
    };
    if (transport === "stdio") {
      const command = String(input.command ?? "").trim();
      if (!command) throw new ServerError(400, "Indica el comando que arranca el servidor MCP.");
      config.command = command;
      config.args = Array.isArray(input.args) ? input.args.map(String).filter((a) => a.length > 0) : [];
      config.env = merge(stringRecord(input.env), previous?.env);
    } else {
      const url = String(input.url ?? "").trim();
      if (!/^https?:\/\//i.test(url)) throw new ServerError(400, "La URL debe empezar por http:// o https://");
      config.url = url;
      config.headers = merge(stringRecord(input.headers), previous?.headers);
    }

    await this.disconnect(config.id);
    this.configs = previous
      ? this.configs.map((c) => (c.id === config.id ? config : c))
      : [...this.configs, config];
    this.save();
    if (config.enabled) void this.connect(config.id).catch(() => undefined);
    return config.id;
  }

  async remove(id: string) {
    this.find(id);
    await this.disconnect(id);
    this.configs = this.configs.filter((c) => c.id !== id);
    this.runtimes.delete(id);
    this.save();
  }

  async disconnect(id: string) {
    const runtime = this.runtimes.get(id);
    if (runtime?.client) {
      await runtime.client.close().catch(() => undefined);
    }
    this.runtimes.set(id, { status: "disconnected", tools: [] });
  }

  connect(id: string): Promise<void> {
    const config = this.find(id);
    const runtime = this.runtime(id);
    if (runtime.status === "connected") return Promise.resolve();
    if (runtime.connecting) return runtime.connecting;

    runtime.status = "connecting";
    runtime.error = undefined;
    runtime.connecting = withTimeout(this.open(config, runtime), CONNECT_TIMEOUT_MS, `Conectar con ${config.name}`)
      .catch(async (error: unknown) => {
        await runtime.client?.close().catch(() => undefined);
        runtime.client = undefined;
        runtime.tools = [];
        runtime.status = "error";
        runtime.error = error instanceof Error ? error.message : String(error);
        throw error;
      })
      .finally(() => {
        runtime.connecting = undefined;
      });
    return runtime.connecting;
  }

  private async open(config: McpServerConfig, runtime: Runtime) {
    const client = new Client({ name: "nimchat", version: "1.0.0" });
    runtime.client = client;

    if (config.transport === "stdio") {
      await client.connect(
        new StdioClientTransport({
          command: config.command!,
          args: config.args ?? [],
          env: { ...getDefaultEnvironment(), ...(config.env ?? {}) },
          stderr: "ignore",
        })
      );
    } else {
      const url = new URL(config.url!);
      const requestInit = { headers: config.headers ?? {} };
      try {
        await client.connect(new StreamableHTTPClientTransport(url, { requestInit }));
      } catch {
        // Servidores antiguos solo hablan SSE.
        const legacy = new Client({ name: "nimchat", version: "1.0.0" });
        await legacy.connect(new SSEClientTransport(url, { requestInit }));
        runtime.client = legacy;
      }
    }

    const listed = await runtime.client!.listTools();
    runtime.tools = listed.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: (tool.inputSchema ?? { type: "object", properties: {} }) as Record<string, unknown>,
      readOnly: tool.annotations?.readOnlyHint === true,
    }));
    runtime.status = "connected";
  }

  /** Conecta en segundo plano todos los conectores activos. */
  autoConnect() {
    for (const config of this.configs) {
      if (config.enabled) void this.connect(config.id).catch(() => undefined);
    }
  }

  /** Herramientas que el agente puede usar ahora mismo (respeta «solo lectura»). */
  async toolsForAgent() {
    await Promise.allSettled(
      this.configs.filter((c) => c.enabled).map((c) => this.connect(c.id))
    );
    return this.configs.flatMap((config) => {
      const runtime = this.runtime(config.id);
      if (!config.enabled || runtime.status !== "connected") return [];
      return runtime.tools
        .filter((tool) => config.allowWrites || tool.readOnly)
        .map((tool) => ({ serverId: config.id, serverName: config.name, ...tool }));
    });
  }

  async call(serverId: string, toolName: string, args: Record<string, unknown>) {
    const config = this.find(serverId);
    const runtime = this.runtime(serverId);
    if (!config.enabled) throw new ServerError(400, `El conector ${config.name} está desactivado.`);
    await this.connect(serverId);
    const tool = runtime.tools.find((t) => t.name === toolName);
    if (!tool) throw new ServerError(404, `El conector ${config.name} no tiene la herramienta ${toolName}.`);
    if (!config.allowWrites && !tool.readOnly) {
      throw new ServerError(403, `${config.name} está en modo solo lectura y ${toolName} puede modificar datos.`);
    }

    const result = await runtime.client!.callTool({ name: toolName, arguments: args }, undefined, {
      timeout: CALL_TIMEOUT_MS,
    });
    const content = Array.isArray(result.content) ? result.content : [];
    const text = content
      .map((part) =>
        part && typeof part === "object" && (part as { type?: string }).type === "text"
          ? String((part as { text?: unknown }).text ?? "")
          : `[${(part as { type?: string })?.type ?? "contenido"}]`
      )
      .join("\n");
    return { text, isError: result.isError === true };
  }

  async shutdown() {
    await Promise.allSettled([...this.runtimes.keys()].map((id) => this.disconnect(id)));
  }
}
