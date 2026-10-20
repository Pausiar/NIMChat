"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePenLine,
  FilePlus2,
  FileMinus,
  FolderSearch,
  GitBranch,
  Loader2,
  MessagesSquare,
  Network,
  Play,
  Plug,
  Search,
  Square,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { ModelPicker } from "@/components/shared/ModelPicker";
import type { AgentAction, AgentActionType } from "@/lib/tools";
import type { FeedEntry } from "@/lib/code-sessions";
import { cn } from "@/lib/utils";

const ICONS: Record<AgentActionType, React.ReactNode> = {
  READ: <FolderSearch className="h-3.5 w-3.5" />,
  WRITE: <FilePlus2 className="h-3.5 w-3.5" />,
  EDIT: <FilePenLine className="h-3.5 w-3.5" />,
  DELETE: <FileMinus className="h-3.5 w-3.5" />,
  RUN: <Play className="h-3.5 w-3.5" />,
  SEARCH: <Search className="h-3.5 w-3.5" />,
  GIT: <GitBranch className="h-3.5 w-3.5" />,
  THINK: <Bot className="h-3.5 w-3.5" />,
  AGENT: <Network className="h-3.5 w-3.5" />,
  MESSAGE: <MessagesSquare className="h-3.5 w-3.5" />,
  MCP: <Plug className="h-3.5 w-3.5" />,
};

interface CodeChatProps {
  feed: FeedEntry[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onContinue: () => void;
  running: boolean;
  status: string | null;
  canContinue: boolean;
  disabled?: boolean;
  model: string;
  onModelChange: (id: string) => void;
  /** Vista de código: el chat ocupa poco espacio. */
  compact?: boolean;
}

export function CodeChat({
  feed,
  input,
  onInputChange,
  onSend,
  onStop,
  onContinue,
  running,
  status,
  canContinue,
  disabled,
  model,
  onModelChange,
  compact,
}: CodeChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [feed, status]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "24px";
    element.style.height = `${Math.min(compact ? 96 : 200, element.scrollHeight)}px`;
  }, [input, compact]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!running && input.trim() && !disabled) onSend();
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {feed.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            <div className="ui-mono text-xl text-nim-yellow">&gt;_</div>
            <div className="text-sm text-white/50">Describe una tarea. El agente lee, edita y verifica el proyecto.</div>
            <div className="ui-mono mt-1 text-[11px] text-white/25">di «usa agentes» para repartir el trabajo entre varios</div>
          </div>
        ) : (
          <div className={cn("mx-auto flex w-full flex-col gap-2.5 px-4", compact ? "max-w-none py-3" : "max-w-3xl py-6")}>
            {feed.map((entry) => (
              <FeedItem key={entry.id} entry={entry} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className={cn("mx-auto w-full shrink-0 px-3 pb-3", compact ? "max-w-none" : "max-w-3xl")}>
        {status && (
          <div className="ui-mono mb-2 flex items-center gap-2 rounded-md border border-nim-yellow/25 bg-nim-yellow/[0.06] px-2.5 py-1.5 text-[11px] text-nim-yellow">
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
            <span className="min-w-0 break-words">{status}</span>
          </div>
        )}
        {canContinue && !running && (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-white/[0.03] px-2.5 py-2">
            <span className="min-w-0 flex-1 text-xs text-white/60">
              La ejecución se detuvo antes de terminar. El contexto se conserva.
            </span>
            <Button size="sm" onClick={onContinue} disabled={disabled}>
              <Play className="h-3 w-3 fill-current" />
              Continuar
            </Button>
          </div>
        )}
        <div className="rounded-lg border border-border bg-[#101010] transition-colors focus-within:border-nim-yellow/50">
          <div className="flex items-start gap-2 px-3 pt-2.5">
            <span className="ui-mono select-none pt-px text-nim-yellow">&gt;</span>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || running}
              rows={1}
              placeholder={running ? "El agente está trabajando…" : "Qué quieres que haga…"}
              className="min-h-[24px] w-full resize-none bg-transparent text-[14px] leading-relaxed text-white outline-none placeholder:text-white/25 disabled:opacity-60"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 py-1.5">
            <div className="min-w-0 max-w-full flex-1 basis-40">
              <ModelPicker value={model} onChange={onModelChange} side="top" className="max-w-full" />
            </div>
            {running ? (
              <Button type="button" size="sm" variant="outline" onClick={onStop} className="shrink-0 border-red-500/40 text-red-300 hover:bg-red-500/10">
                <Square className="h-3 w-3 fill-current" />
                detener
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={onSend} disabled={!input.trim() || disabled} className="shrink-0">
                Ejecutar
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeedItem({ entry }: { entry: FeedEntry }) {
  if (entry.kind === "user") {
    return (
      <div className="flex gap-3">
        <span className="ui-mono mt-px select-none text-nim-yellow">&gt;</span>
        <div className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-white">{entry.text}</div>
      </div>
    );
  }
  if (entry.kind === "assistant") {
    return (
      <div className="flex gap-3">
        <span className="ui-mono mt-0.5 select-none text-nim-yellow">●</span>
        <div className="min-w-0 flex-1">
          <MarkdownRenderer content={entry.text} />
        </div>
      </div>
    );
  }
  if (entry.kind === "notice") {
    return (
      <div
        className={cn(
          "ui-mono flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px]",
          entry.tone === "error" && "border-red-500/30 bg-red-500/10 text-red-200",
          entry.tone === "warn" && "border-nim-yellow/30 bg-nim-yellow/[0.06] text-nim-yellow",
          entry.tone === "info" && "border-border text-white/50"
        )}
      >
        {entry.tone !== "info" && <AlertTriangle className="mt-px h-3 w-3 shrink-0" />}
        <span className="min-w-0 break-words">{entry.text}</span>
      </div>
    );
  }
  // El razonamiento del agente se lee como texto, no como una herramienta.
  if (entry.action.type === "THINK" && entry.action.title === "Razonando") {
    return (
      <div className="flex gap-3">
        <span className="ui-mono mt-0.5 select-none text-nim-yellow">●</span>
        <div className="min-w-0 flex-1">
          {entry.action.agent && <AgentTag name={entry.action.agent} />}
          <MarkdownRenderer content={entry.action.output ?? entry.action.detail ?? ""} />
        </div>
      </div>
    );
  }
  return <ToolRow action={entry.action} />;
}

function AgentTag({ name }: { name: string }) {
  return (
    <span className="ui-mono mb-0.5 mr-1.5 inline-block rounded border border-nim-yellow/30 bg-nim-yellow/10 px-1.5 text-[10px] text-nim-yellow">
      {name}
    </span>
  );
}

function ToolRow({ action }: { action: AgentAction }) {
  const [open, setOpen] = useState(false);
  const expandable = Boolean(action.output);
  return (
    <div className="rounded-md border border-border bg-white/[0.02] text-[13px]">
      <button
        type="button"
        disabled={!expandable}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <span className={cn("shrink-0", action.status === "error" ? "text-red-300" : "text-nim-yellow/80")}>
          {ICONS[action.type] ?? <Bot className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1 truncate text-white/85">{action.title}</span>
        {action.agent && <AgentTag name={action.agent} />}
        {action.durationMs != null && (
          <span className="ui-mono shrink-0 text-[10px] text-white/30">{(action.durationMs / 1000).toFixed(1)}s</span>
        )}
        {action.status === "running" ? (
          <Clock3 className="h-3.5 w-3.5 shrink-0 animate-pulse text-nim-yellow" />
        ) : action.status === "success" ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-nim-yellow/70" />
        ) : (
          <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
        )}
        {expandable && (
          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-white/30 transition-transform", open && "rotate-90")} />
        )}
      </button>
      {action.detail && !open && (
        <div className="ui-mono truncate px-2.5 pb-1.5 pl-[34px] text-[11px] text-white/35">{action.detail}</div>
      )}
      {open && (
        <pre className="ui-mono max-h-64 overflow-auto whitespace-pre-wrap break-words border-t border-border px-3 py-2 text-[11px] leading-relaxed text-white/60">
          {action.output}
        </pre>
      )}
      {action.status === "needs-confirmation" && (
        <div className="border-t border-nim-yellow/30 bg-nim-yellow/10 px-2.5 py-1 text-xs text-nim-yellow">
          Requiere confirmación explícita antes de continuar.
        </div>
      )}
    </div>
  );
}
