"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TerminalEvent } from "@/lib/server-client";
import { cn } from "@/lib/utils";

interface TerminalOutputProps {
  events: TerminalEvent[];
  onRun: (command: string) => void;
  disabled?: boolean;
}

export function TerminalOutput({ events, onRun, disabled }: TerminalOutputProps) {
  const [command, setCommand] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [events]);

  const grouped = useMemo(() => groupEvents(events), [events]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#070708]">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4 font-mono text-xs">
        {grouped.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-white/35">
            <Terminal className="mb-3 h-8 w-8" />
            <div>No hay comandos todavía</div>
          </div>
        )}
        {grouped.map((group) => (
          <div
            key={group.id}
            className={cn(
              "rounded-xl border p-3",
              group.source === "agent"
                ? "border-sky-500/20 bg-sky-500/[0.08]"
                : "border-white/10 bg-white/[0.035]"
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2 text-white/70">
              <span className="truncate">$ {group.command}</span>
              <span className="shrink-0 text-[10px] text-white/35">{new Date(group.startedAt).toLocaleTimeString()}</span>
            </div>
            <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words leading-relaxed text-white/70">
              {renderAnsi(group.output || "")}
            </pre>
            {group.exitCode != null && (
              <div className={cn("mt-2 text-[11px]", group.exitCode === 0 ? "text-emerald-300" : "text-red-300")}>
                exit {group.exitCode}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex items-center gap-2 border-t border-white/10 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const value = command.trim();
          if (!value) return;
          onRun(value);
          setCommand("");
        }}
      >
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          disabled={disabled}
          placeholder="npm run build"
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-3 font-mono text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
        />
        <Button type="submit" size="sm" disabled={!command.trim() || disabled} className="h-10 bg-white text-black hover:bg-white/90">
          <Play className="h-4 w-4" />
          Ejecutar
        </Button>
      </form>
    </div>
  );
}

function groupEvents(events: TerminalEvent[]) {
  const map = new Map<string, { id: string; source: "agent" | "user"; command: string; startedAt: number; output: string; exitCode?: number | null }>();
  for (const event of events) {
    const current = map.get(event.id) ?? {
      id: event.id,
      source: event.source,
      command: event.command,
      startedAt: event.timestamp,
      output: "",
      exitCode: undefined,
    };
    if (event.type === "stdout" || event.type === "stderr" || event.type === "error") {
      current.output += event.data ?? "";
    }
    if (event.type === "exit") current.exitCode = event.exitCode;
    map.set(event.id, current);
  }
  return [...map.values()];
}

function renderAnsi(text: string) {
  const clean = text.replace(/\u001b\[(\d+;?)*m/g, "");
  return clean || " ";
}
