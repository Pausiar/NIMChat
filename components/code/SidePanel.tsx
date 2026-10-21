"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Loader2, MessagesSquare, Minimize2, Network, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentInfo, AgentMessageEvent } from "@/lib/agents";
import type { ArtifactMeta } from "@/lib/artifact-store";
import { getModel } from "@/lib/models";
import type { McpServerInfo, NimChatServerClient } from "@/lib/server-client";
import { cn } from "@/lib/utils";
import { ConnectorsPanel } from "./ConnectorsPanel";

type Tab = "agents" | "context" | "connectors";

interface SidePanelProps {
  client: NimChatServerClient;
  projectKey: string;
  agents: AgentInfo[];
  agentMessages: AgentMessageEvent[];
  running: boolean;
  /** Tokens aproximados de la conversación del agente y umbral de compactación. */
  contextTokens: number;
  compactAt: number;
  /** Resultados grandes guardados fuera del prompt en la ejecución actual. */
  artifacts: ArtifactMeta[];
  compacting: boolean;
  onCompact: () => void;
  onOpenContextFile: () => void;
  connectedCount: number;
  onConnectorsChange: (servers: McpServerInfo[]) => void;
  /** Cambia cada vez que el agente actúa: refresca context_agent.md. */
  refreshSignal: number;
}

export function SidePanel(props: SidePanelProps) {
  const [tab, setTab] = useState<Tab>("agents");
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "agents", label: "agentes", badge: props.agents.length || undefined },
    { id: "context", label: "contexto" },
    { id: "connectors", label: "conectores", badge: props.connectedCount || undefined },
  ];

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col border-l border-border bg-[#0b0b0b]">
      <div className="ui-mono flex h-9 shrink-0 items-stretch border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 text-xs transition-colors",
              tab === t.id ? "text-white" : "text-white/45 hover:text-white"
            )}
          >
            {t.label}
            {t.badge != null && <span className="text-nim-yellow">{t.badge}</span>}
            {tab === t.id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-nim-yellow" />}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "agents" && <AgentsTab agents={props.agents} messages={props.agentMessages} running={props.running} />}
        {tab === "context" && <ContextTab {...props} />}
        {tab === "connectors" && <ConnectorsPanel client={props.client} onChange={props.onConnectorsChange} />}
      </div>
    </aside>
  );
}

function AgentsTab({ agents, messages, running }: { agents: AgentInfo[]; messages: AgentMessageEvent[]; running: boolean }) {
  if (agents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <Network className="h-5 w-5 text-white/25" />
        <p className="text-sm text-white/50">Aquí verás a los agentes trabajar.</p>
        <p className="text-xs leading-relaxed text-white/30">
          Escribe «usa agentes» en tu petición y un orquestador repartirá el trabajo. Además, el agente puede llamar a un
          explorador de solo lectura que lee los archivos por él.
        </p>
        {running && <Loader2 className="h-4 w-4 animate-spin text-nim-yellow" />}
      </div>
    );
  }
  return (
    <div className="space-y-2 p-3">
      {agents.map((agent) => (
        <div key={agent.name} className="rounded-md border border-border px-2.5 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-white">{agent.name}</span>
            {agent.status === "running" ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-nim-yellow" />
            ) : agent.status === "done" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-nim-yellow" />
            ) : (
              <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            )}
          </div>
          <div className="ui-mono mt-0.5 break-words text-[10px] text-white/40">
            {agent.role || "subagente"} · {getModel(agent.model).name} · {agent.actionCount} acciones
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] text-white/45">{agent.task}</div>
          {agent.summary && <div className="mt-1 line-clamp-4 text-[11px] text-white/65">{agent.summary}</div>}
        </div>
      ))}
      {messages.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="ui-mono flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/30">
            <MessagesSquare className="h-3 w-3" /> conversación entre agentes
          </div>
          {messages.map((m) => (
            <div key={m.id} className="break-words rounded bg-white/[0.03] px-2 py-1 text-[11px] text-white/60">
              <span className="text-nim-yellow">{m.from}</span> → {m.to}: {m.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContextTab({
  client,
  projectKey,
  running,
  contextTokens,
  compactAt,
  artifacts,
  compacting,
  onCompact,
  onOpenContextFile,
  refreshSignal,
}: SidePanelProps) {
  const [file, setFile] = useState<{ content: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setFile(await client.readFile("context_agent.md"));
    } catch {
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey, refreshSignal, running]);

  const percent = Math.min(100, Math.round((contextTokens / Math.max(1, compactAt)) * 100));

  return (
    <div className="space-y-4 p-3">
      <section>
        <div className="ui-mono mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/30">
          <span>working set (L0)</span>
          <span className={percent >= 80 ? "text-nim-yellow" : undefined}>{percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-nim-yellow transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
          ~{contextTokens.toLocaleString("es-ES")} / ~{compactAt.toLocaleString("es-ES")} tokens (umbral blando del modelo).
          Al superarlo se compacta con cooldown; si no baja, truncate mecánico. El resumen se inyecta en el system prompt.
        </p>
        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={onCompact} disabled={running || compacting || contextTokens < 1500}>
          {compacting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minimize2 className="h-3 w-3" />}
          Compactar ahora
        </Button>
      </section>

      <section>
        <div className="ui-mono mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/30">
          <span>memoria L1 · context_agent.md</span>
          <button type="button" onClick={() => void load()} aria-label="Actualizar" className="text-white/40 hover:text-white">
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </button>
        </div>
        {file ? (
          <>
            <pre className="ui-mono max-h-[32vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-black/30 p-2.5 text-[11px] leading-relaxed text-white/65">
              {file.content}
            </pre>
            <Button size="sm" variant="ghost" className="mt-1.5" onClick={onOpenContextFile}>
              <FileText className="h-3 w-3" />
              abrir en el editor
            </Button>
          </>
        ) : (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs leading-relaxed text-white/35">
            Todavía no existe. El agente lo crea al trabajar en el proyecto y ahí anota la estructura, lo hecho y lo pendiente
            para poder continuar sin releerlo todo.
          </p>
        )}
      </section>

      <section>
        <div className="ui-mono mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/30">
          <span>artifacts L2</span>
          <span>{artifacts.length}</span>
        </div>
        {artifacts.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-white/35">
            Los resultados grandes de herramientas se guardan aquí durante la ejecución. El chat solo ve un preview; el agente
            puede recuperarlos con <span className="ui-mono">recall_artifact</span>.
          </p>
        ) : (
          <ul className="max-h-[28vh] space-y-1.5 overflow-auto">
            {artifacts.map((artifact) => (
              <li key={artifact.id} className="rounded-md border border-border px-2 py-1.5 text-[11px]">
                <div className="ui-mono flex items-center justify-between gap-2 text-[10px] text-white/45">
                  <span className="truncate text-nim-yellow">{artifact.id}</span>
                  <span>{artifact.bytes.toLocaleString("es-ES")} B</span>
                </div>
                <div className="mt-0.5 truncate text-white/70">
                  {artifact.tool}
                  {artifact.path ? ` · ${artifact.path}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
