"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, Loader2, MessagesSquare, Network, Pause, Play, Square, WandSparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentAction } from "@/lib/tools";
import type { AgentInfo, AgentMessageEvent } from "@/lib/agents";
import { getModel } from "@/lib/models";
import { ActionItem } from "./ActionItem";

const placeholders = [
  "Añade autenticación con JWT a esta API de Express",
  "Refactoriza los componentes de la carpeta /ui para usar shadcn",
  "Crea un CRUD completo para la entidad Product con TypeScript",
  "Encuentra y corrige todos los errores de TypeScript del proyecto",
];

interface AgentPanelProps {
  actions: AgentAction[];
  task: string;
  onTaskChange: (value: string) => void;
  onRun: () => void;
  onPause: () => void;
  onCancel: () => void;
  isRunning: boolean;
  isPaused: boolean;
  disabled?: boolean;
  summary?: string;
  agents?: AgentInfo[];
  agentMessages?: AgentMessageEvent[];
  agentsMode?: boolean;
}

export function AgentPanel({
  actions,
  task,
  onTaskChange,
  onRun,
  onPause,
  onCancel,
  isRunning,
  isPaused,
  disabled,
  summary,
  agents = [],
  agentMessages = [],
  agentsMode,
}: AgentPanelProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex((value) => (value + 1) % placeholders.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "96px";
    element.style.height = `${Math.min(220, element.scrollHeight)}px`;
  }, [task]);

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-white/10 bg-[#0c0c0f]">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Agente Code</div>
            <div className="text-[11px] text-white/35">NVIDIA NIM + servidor local</div>
          </div>
        </div>
      </div>

      {(agentsMode || agents.length > 0) && (
        <div className="max-h-64 shrink-0 space-y-2 overflow-auto border-b border-white/10 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-nim-yellow">
            <Network className="h-3.5 w-3.5" /> Modo agentes
          </div>
          {agents.length === 0 && (
            <div className="text-xs text-white/40">El orquestador decidirá si necesita delegar.</div>
          )}
          {agents.map((agent) => (
            <div key={agent.name} className="rounded-lg border border-white/10 bg-white/[0.035] p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-white">{agent.name}</span>
                {agent.status === "running" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
                ) : agent.status === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-300" />
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-white/40">
                {agent.role || "subagente"} · {getModel(agent.model).name} · {agent.actionCount} acciones
              </div>
              {agent.summary && <div className="mt-1 line-clamp-3 text-[11px] text-white/55">{agent.summary}</div>}
            </div>
          ))}
          {agentMessages.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                <MessagesSquare className="h-3.5 w-3.5" /> Conversación entre agentes
              </div>
              {agentMessages.map((m) => (
                <div key={m.id} className="rounded-md bg-black/30 px-2 py-1 text-[11px] text-white/60">
                  <span className="text-nim-yellow">{m.from}</span> → {m.to}: {m.content}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {actions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white/35">
            <WandSparkles className="mb-3 h-8 w-8" />
            <div className="text-sm">Describe una tarea y el agente leerá, editará y verificará el proyecto.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {actions.map((action) => <ActionItem key={action.id} action={action} />)}
          </div>
        )}
      </div>

      {summary && (
        <div className="border-t border-white/10 bg-emerald-500/[0.07] px-4 py-3 text-xs leading-relaxed text-emerald-100">
          {summary}
        </div>
      )}

      <div className="border-t border-white/10 p-3">
        <textarea
          ref={textareaRef}
          value={task}
          onChange={(event) => onTaskChange(event.target.value)}
          disabled={disabled || isRunning}
          placeholder={placeholders[placeholderIndex]}
          className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-white/25 disabled:opacity-60"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          {isRunning ? (
            <>
              <Button type="button" variant="outline" onClick={onPause} className="border-white/10 text-white/70 hover:text-white">
                <Pause className="h-4 w-4" />
                {isPaused ? "Reanudar" : "Pausar"}
              </Button>
              <Button type="button" variant="destructive" onClick={onCancel}>
                <Square className="h-4 w-4" />
                Cancelar
              </Button>
            </>
          ) : (
            <Button type="button" onClick={onRun} disabled={!task.trim() || disabled} className="col-span-2 bg-white text-black hover:bg-white/90">
              <Play className="h-4 w-4" />
              Ejecutar
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
