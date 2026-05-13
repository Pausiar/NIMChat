"use client";

import { Clock, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DesignGeneration } from "./types";

interface GenerationHistoryProps {
  history: DesignGeneration[];
  activeId?: string;
  onSelect: (generation: DesignGeneration) => void;
  onClear: () => void;
}

export function GenerationHistory({
  history,
  activeId,
  onSelect,
  onClear,
}: GenerationHistoryProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Historial</h3>
          <p className="text-xs text-white/40">Versiones de esta sesión</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={history.length === 0}
          className="h-8 gap-1.5 text-white/50 hover:text-white disabled:opacity-30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Limpiar
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {history.length === 0 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-5 text-center">
            <RotateCcw className="mb-3 h-5 w-5 text-white/25" />
            <p className="text-sm text-white/55">Aún no hay generaciones.</p>
            <p className="mt-1 text-xs text-white/35">
              Cada componente generado aparecerá aquí para restaurarlo rápido.
            </p>
          </div>
        ) : (
          history.map((generation) => (
            <button
              key={generation.id}
              type="button"
              onClick={() => onSelect(generation)}
              className={cn(
                "group flex w-full gap-3 rounded-xl border p-2 text-left transition hover:bg-white/[0.06]",
                activeId === generation.id
                  ? "border-orange-400/50 bg-orange-500/10"
                  : "border-white/10 bg-black/20"
              )}
            >
              <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-zinc-800 via-zinc-950 to-orange-950">
                {generation.thumbnail ? (
                  <img
                    src={generation.thumbnail}
                    alt="Miniatura de generación"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-2 rounded-md border border-white/10 bg-white/5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-white/80 group-hover:text-white">
                  {generation.prompt}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/35">
                  <Clock className="h-3 w-3" />
                  {new Date(generation.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}