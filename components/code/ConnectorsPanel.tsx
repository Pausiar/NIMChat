"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Pencil, Plug, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { McpServerInfo, McpServerInput, NimChatServerClient } from "@/lib/server-client";
import { cn } from "@/lib/utils";

interface Preset {
  id: string;
  label: string;
  hint: string;
  form: Partial<FormState>;
}

const PRESETS: Preset[] = [
  {
    id: "github",
    label: "GitHub",
    hint: "Repos, issues y PRs. Crea un token en github.com/settings/tokens y pégalo en Authorization.",
    form: {
      name: "github",
      transport: "http",
      url: "https://api.githubcopilot.com/mcp/",
      headers: "Authorization: Bearer ghp_TU_TOKEN",
    },
  },
  {
    id: "filesystem",
    label: "Archivos",
    hint: "Acceso a una carpeta concreta fuera del proyecto. Requiere Node.js instalado.",
    form: { name: "archivos", transport: "stdio", command: "npx", args: "-y @modelcontextprotocol/server-filesystem C:\\ruta\\a\\carpeta" },
  },
  {
    id: "postgres",
    label: "PostgreSQL",
    hint: "Consulta una base de datos Postgres. Requiere Node.js instalado.",
    form: { name: "postgres", transport: "stdio", command: "npx", args: "-y @modelcontextprotocol/server-postgres postgresql://usuario:clave@localhost/basedatos" },
  },
  {
    id: "brave",
    label: "Brave Search",
    hint: "Búsqueda web. Necesita una API key de Brave. Requiere Node.js instalado.",
    form: { name: "brave", transport: "stdio", command: "npx", args: "-y @modelcontextprotocol/server-brave-search", env: "BRAVE_API_KEY=TU_CLAVE" },
  },
  {
    id: "memory",
    label: "Memoria",
    hint: "Grafo de conocimiento persistente entre sesiones. Requiere Node.js instalado.",
    form: { name: "memoria", transport: "stdio", command: "npx", args: "-y @modelcontextprotocol/server-memory" },
  },
  { id: "custom", label: "Personalizado", hint: "Cualquier servidor MCP por comando o por URL.", form: { name: "" } },
];

interface FormState {
  id?: string;
  name: string;
  transport: "stdio" | "http";
  command: string;
  args: string;
  env: string;
  url: string;
  headers: string;
  allowWrites: boolean;
}

const EMPTY_FORM: FormState = { name: "", transport: "stdio", command: "", args: "", env: "", url: "", headers: "", allowWrites: false };

function splitArgs(line: string): string[] {
  const out: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line))) out.push(match[1] ?? match[2] ?? match[3]);
  return out;
}

function parseLines(text: string, separator: RegExp): Record<string, string> {
  const result: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const match = separator.exec(line);
    if (!match) continue;
    result[line.slice(0, match.index).trim()] = line.slice(match.index + match[0].length).trim();
  }
  return result;
}

function formFromServer(server: McpServerInfo): FormState {
  return {
    id: server.id,
    name: server.name,
    transport: server.transport,
    command: server.command ?? "",
    args: (server.args ?? []).map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" "),
    env: Object.entries(server.env ?? {}).map(([k, v]) => `${k}=${v}`).join("\n"),
    url: server.url ?? "",
    headers: Object.entries(server.headers ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n"),
    allowWrites: server.allowWrites,
  };
}

interface ConnectorsPanelProps {
  client: NimChatServerClient;
  /** Se avisa al cambiar la lista (para el contador del encabezado). */
  onChange?: (servers: McpServerInfo[]) => void;
}

/** Conectores MCP: GitHub, bases de datos y otras herramientas para el agente. */
export function ConnectorsPanel({ client, onChange }: ConnectorsPanelProps) {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [hint, setHint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await client.listMcpServers();
      setServers(list);
      onChange?.(list);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo leer la lista de conectores.");
    }
  }, [client, onChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const anyConnecting = servers.some((s) => s.status === "connecting");
  useEffect(() => {
    if (!anyConnecting) return;
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [anyConnecting, refresh]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    const payload: McpServerInput =
      form.transport === "stdio"
        ? {
            id: form.id,
            name: form.name,
            transport: "stdio",
            command: form.command,
            args: splitArgs(form.args),
            env: parseLines(form.env, /=/),
            allowWrites: form.allowWrites,
          }
        : {
            id: form.id,
            name: form.name,
            transport: "http",
            url: form.url,
            headers: parseLines(form.headers, /:\s*/),
            allowWrites: form.allowWrites,
          };
    try {
      await client.saveMcpServer(payload);
      setForm(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el conector.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (server: McpServerInfo) => {
    // Reenviar la config tal cual: los secretos enmascarados se conservan en el servidor.
    await client.saveMcpServer({ ...server, enabled: !server.enabled }).catch((cause) => setError(String(cause?.message ?? cause)));
    await refresh();
  };

  const field = "w-full rounded-md border border-border bg-black/30 px-2.5 py-1.5 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-nim-yellow/50";
  const label = "ui-mono mb-1 block text-[11px] text-white/45";

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs leading-relaxed text-white/45">
        Conecta el agente con GitHub, bases de datos y otras herramientas mediante el Model Context Protocol.
      </p>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
        )}

        {!form ? (
          <div className="space-y-2">
            {servers.length === 0 && (
              <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-white/40">
                Todavía no hay conectores.
              </div>
            )}
            {servers.map((server) => (
              <div key={server.id} className="rounded-md border border-border bg-white/[0.02] p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      server.status === "connected" && "bg-nim-yellow",
                      server.status === "error" && "bg-red-500",
                      server.status === "connecting" && "animate-pulse bg-nim-yellow/50",
                      server.status === "disconnected" && "bg-white/20"
                    )}
                  />
                  <span className="truncate text-sm font-medium text-white">{server.name}</span>
                  <span className="ui-mono text-[10px] uppercase text-white/35">{server.transport}</span>
                  <span className="ui-mono ml-auto text-[11px] text-white/40">
                    {server.status === "connecting" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : server.status === "connected" ? (
                      `${server.tools.length} herramientas`
                    ) : (
                      server.enabled ? "sin conexión" : "desactivado"
                    )}
                  </span>
                </div>
                {server.error && <div className="mt-1.5 break-words text-xs text-red-300/90">{server.error}</div>}
                <div className="mt-2 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "ui-mono rounded border px-1.5 py-0.5 text-[10px]",
                      server.allowWrites ? "border-nim-yellow/40 text-nim-yellow" : "border-border text-white/45"
                    )}
                  >
                    {server.allowWrites ? "lectura y escritura" : "solo lectura"}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <Button size="sm" variant="ghost" onClick={() => toggle(server)} className="ui-mono">
                      {server.enabled ? "desactivar" : "activar"}
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Reconectar" onClick={async () => { await client.reconnectMcpServer(server.id).catch(() => undefined); await refresh(); }}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => { setHint(""); setForm(formFromServer(server)); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={async () => { await client.deleteMcpServer(server.id).catch(() => undefined); await refresh(); }}>
                      <Trash2 className="h-3.5 w-3.5 hover:text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={() => { setHint(""); setForm({ ...EMPTY_FORM }); }} className="w-full">
              <Plus className="h-3.5 w-3.5" />
              Añadir conector
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <button type="button" onClick={() => setForm(null)} className="ui-mono flex items-center gap-1 text-xs text-white/50 hover:text-white">
              <ArrowLeft className="h-3 w-3" /> volver
            </button>

            {!form.id && (
              <div>
                <span className={label}>Plantilla</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => { setForm({ ...EMPTY_FORM, ...preset.form }); setHint(preset.hint); }}
                      className="ui-mono rounded border border-border px-2 py-1 text-[11px] text-white/70 hover:border-nim-yellow/50 hover:text-white"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {hint && <p className="mt-2 text-xs text-white/45">{hint}</p>}
              </div>
            )}

            <div>
              <label className={label}>Nombre</label>
              <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="github" />
            </div>

            <div className="flex gap-1.5">
              {(["stdio", "http"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setForm({ ...form, transport: kind })}
                  className={cn(
                    "ui-mono flex-1 rounded-md border px-2 py-1.5 text-xs",
                    form.transport === kind ? "border-nim-yellow/60 text-nim-yellow" : "border-border text-white/50 hover:text-white"
                  )}
                >
                  {kind === "stdio" ? "comando local (stdio)" : "URL remota (http)"}
                </button>
              ))}
            </div>

            {form.transport === "stdio" ? (
              <>
                <div>
                  <label className={label}>Comando</label>
                  <input className={cn(field, "ui-mono")} value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} placeholder="npx" />
                </div>
                <div>
                  <label className={label}>Argumentos</label>
                  <input className={cn(field, "ui-mono")} value={form.args} onChange={(e) => setForm({ ...form, args: e.target.value })} placeholder="-y @modelcontextprotocol/server-memory" />
                </div>
                <div>
                  <label className={label}>Variables de entorno (una por línea, CLAVE=valor)</label>
                  <textarea rows={2} className={cn(field, "ui-mono resize-none")} value={form.env} onChange={(e) => setForm({ ...form, env: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={label}>URL</label>
                  <input className={cn(field, "ui-mono")} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://servidor.example/mcp" />
                </div>
                <div>
                  <label className={label}>Cabeceras (una por línea, Nombre: valor)</label>
                  <textarea rows={2} className={cn(field, "ui-mono resize-none")} value={form.headers} onChange={(e) => setForm({ ...form, headers: e.target.value })} />
                </div>
              </>
            )}

            <label className="flex cursor-pointer items-start gap-2 text-xs text-white/60">
              <input type="checkbox" checked={form.allowWrites} onChange={(e) => setForm({ ...form, allowWrites: e.target.checked })} className="mt-0.5 accent-[#facc15]" />
              <span>
                Permitir herramientas que modifican datos. Si lo dejas desmarcado, el agente solo usa las marcadas como de
                solo lectura (recomendado).
              </span>
            </label>

            <p className="text-[11px] text-white/35">
              Las claves se guardan en tu equipo (~/.nimchat/mcp.json) y no se muestran de nuevo. Los servidores se ejecutan con
              tus permisos: añade solo conectores en los que confíes.
            </p>

            <Button onClick={save} disabled={saving || !form.name.trim()} className="w-full">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Guardar y conectar
            </Button>
          </div>
        )}
    </div>
  );
}
