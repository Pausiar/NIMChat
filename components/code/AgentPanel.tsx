"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Loader2, MessagesSquare, Network, Pause, Square, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/shared/ModelPicker";
import type { AgentAction } from "@/lib/tools";
import type { AgentInfo, AgentMessageEvent } from "@/lib/agents";
import { getModel } from "@/lib/models";
import { ActionItem } from "./ActionItem";

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
  model: string;
  onModelChange: (id: string) => void;
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
  model,
  onModelChange,
}: AgentPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "24px";
    element.style.height = `${Math.min(200, element.scrollHeight)}px`;
  }, [task]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isRunning && task.trim() && !disabled) onRun();
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-[#0b0b0b]">
      <div className="ui-mono flex h-9 shrink-0 items-center justify-between border-b border-border px-3 text-[11px] uppercase tracking-wider text-white/35">
        <span>agente</span>
        {isRunning && <Loader2 className="h-3 w-3 animate-spin text-nim-yellow" />}
      </div>

      {(agentsMode || agents.length > 0) && (
        <div className="max-h-56 shrink-0 space-y-1.5 overflow-auto border-b border-border p-3">
          <div className="ui-mono flex items-center gap-1.5 text-[11px] text-nim-yellow">
            <Network className="h-3.5 w-3.5" /> modo agentes
          </div>
          {agents.length === 0 && <div className="text-xs text-white/40">El orquestador decidirá si necesita delegar.</div>}
          {agents.map((agent) => (
            <div key={agent.name} className="rounded-md border border-border px-2.5 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-white">{agent.name}</span>
                {agent.status === "running" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-nim-yellow" />
                ) : agent.status === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-nim-yellow" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                )}
              </div>
              <div className="ui-mono mt-0.5 text-[10px] text-white/40">
                {agent.role || "subagente"} · {getModel(agent.model).name} · {agent.actionCount} acc.
              </div>
              {agent.summary && <div className="mt-1 line-clamp-3 text-[11px] text-white/55">{agent.summary}</div>}
            </div>
          ))}
          {agentMessages.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="ui-mono flex items-center gap-1.5 text-[10px] text-white/35">
                <MessagesSquare className="h-3 w-3" /> conversación entre agentes
              </div>
              {agentMessages.map((m) => (
                <div key={m.id} className="rounded bg-white/[0.03] px-2 py-1 text-[11px] text-white/60">
                  <span className="text-nim-yellow">{m.from}</span> → {m.to}: {m.content}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {actions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            <div className="ui-mono text-xl text-nim-yellow">&gt;_</div>
            <div className="text-sm text-white/45">Describe una tarea. El agente lee, edita y verifica el proyecto.</div>
            <div className="ui-mono mt-1 text-[11px] text-white/25">di «usa agentes» para repartir el trabajo</div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {actions.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </div>
        )}
      </div>

      {summary && (
        <div className="border-t border-border bg-nim-yellow/[0.06] px-3 py-2.5 text-xs leading-relaxed text-white/80">
          {summary}
        </div>
      )}

      <div className="border-t border-border p-2">
        <div className="rounded-md border border-border bg-[#101010] transition-colors focus-within:border-nim-yellow/50">
          <div className="flex items-start gap-2 px-2.5 pt-2.5">
            <span className="ui-mono select-none pt-px text-nim-yellow">&gt;</span>
            <textarea
              ref={textareaRef}
              value={task}
              onChange={(event) => onTaskChange(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isRunning}
              rows={1}
              placeholder="Qué quieres que haga…"
              className="min-h-[24px] w-full resize-none bg-transparent text-[13px] leading-relaxed text-white outline-none placeholder:text-white/25 disabled:opacity-60"
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-1.5 py-1.5">
            <ModelPicker value={model} onChange={onModelChange} side="top" align="start" />
            {isRunning ? (
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={onPause}>
                  <Pause className="h-3 w-3" />
                  {isPaused ? "reanudar" : "pausar"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onCancel} className="border-red-500/40 text-red-300 hover:bg-red-500/10">
                  <Square className="h-3 w-3 fill-current" />
                  cancelar
                </Button>
              </div>
            ) : (
              <Button type="button" size="sm" onClick={onRun} disabled={!task.trim() || disabled}>
                Ejecutar
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
