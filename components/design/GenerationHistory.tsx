"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignGeneration } from "./types";

interface GenerationHistoryProps {
  history: DesignGeneration[];
  activeId?: string;
  onSelect: (generation: DesignGeneration) => void;
  onClear: () => void;
}

export function GenerationHistory({ history, activeId, onSelect, onClear }: GenerationHistoryProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="ui-mono text-[11px] uppercase tracking-wider text-white/35">historial</span>
        <button
          type="button"
          onClick={onClear}
          disabled={history.length === 0}
          aria-label="Limpiar historial"
          className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {history.length === 0 ? (
          <div className="flex h-full min-h-[120px] flex-col items-center justify-center px-5 text-center">
            <div className="ui-mono text-xl text-nim-yellow">&gt;_</div>
            <p className="mt-1 text-sm text-white/45">Genera interfaces con React + Tailwind.</p>
            <p className="mt-1 text-xs text-white/30">Cada versión queda aquí para restaurarla.</p>
          </div>
        ) : (
          history.map((generation) => (
            <button
              key={generation.id}
              type="button"
              onClick={() => onSelect(generation)}
              className={cn(
                "group flex w-full items-start gap-2 rounded-md border-l-2 px-2 py-1.5 text-left transition-colors",
                activeId === generation.id
                  ? "border-nim-yellow bg-white/5"
                  : "border-transparent hover:bg-white/5"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] text-white/75 group-hover:text-white">{generation.prompt}</p>
                <div className="ui-mono mt-0.5 text-[10px] text-white/30">
                  {new Date(generation.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
