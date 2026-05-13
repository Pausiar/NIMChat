"use client";

import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiffViewerProps {
  patch: string;
  stat?: string;
  onCommit?: () => void;
  onDiscard?: () => void;
  canMutate?: boolean;
}

export function DiffViewer({ patch, stat, onCommit, onDiscard, canMutate }: DiffViewerProps) {
  const lines = patch ? patch.split("\n") : [];
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#080809] text-sm text-white/75">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium text-white">
            <GitBranch className="h-4 w-4" />
            Git Diff
          </div>
          <div className="mt-0.5 truncate text-xs text-white/40">{stat || "Sin resumen de cambios"}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={!canMutate}
            className="rounded-lg border border-red-500/25 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-35"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={onCommit}
            disabled={!canMutate}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-35"
          >
            Commit IA
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        {lines.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/35">No hay cambios en git</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            {lines.map((line, index) => (
              <div
                key={`${index}-${line.slice(0, 12)}`}
                className={cn(
                  "grid grid-cols-[64px_1fr] border-b border-white/[0.03] last:border-b-0",
                  line.startsWith("+") && !line.startsWith("+++") && "bg-emerald-500/10 text-emerald-100",
                  line.startsWith("-") && !line.startsWith("---") && "bg-red-500/10 text-red-100",
                  line.startsWith("@@") && "bg-sky-500/10 text-sky-100",
                  line.startsWith("diff") && "bg-white/[0.05] text-white"
                )}
              >
                <span className="select-none border-r border-white/[0.04] px-3 py-1 text-right text-white/25">{index + 1}</span>
                <span className="whitespace-pre-wrap break-words px-3 py-1">{line || " "}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
