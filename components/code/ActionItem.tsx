"use client";

import {
  Bot,
  CheckCircle2,
  Clock3,
  FileMinus,
  FilePenLine,
  FilePlus2,
  FileSearch,
  FolderSearch,
  GitBranch,
  Play,
  Search,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentAction, AgentActionType } from "@/lib/tools";

const iconByType: Record<AgentActionType, React.ReactNode> = {
  READ: <FolderSearch className="h-4 w-4" />,
  WRITE: <FilePlus2 className="h-4 w-4" />,
  EDIT: <FilePenLine className="h-4 w-4" />,
  DELETE: <FileMinus className="h-4 w-4" />,
  RUN: <Play className="h-4 w-4" />,
  SEARCH: <Search className="h-4 w-4" />,
  GIT: <GitBranch className="h-4 w-4" />,
  THINK: <Bot className="h-4 w-4" />,
};

export function ActionItem({ action, onViewDiff }: { action: AgentAction; onViewDiff?: () => void }) {
  const statusIcon =
    action.status === "success" ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
    ) : action.status === "error" || action.status === "needs-confirmation" ? (
      <XCircle className="h-3.5 w-3.5 text-red-300" />
    ) : (
      <Clock3 className="h-3.5 w-3.5 text-sky-300" />
    );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm text-white/80">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25",
            action.status === "running" && "text-sky-200",
            action.status === "success" && "text-emerald-200",
            action.status === "error" && "text-red-200",
            action.status === "needs-confirmation" && "text-amber-200"
          )}
        >
          {iconByType[action.type] ?? <FileSearch className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-medium text-white">{action.title}</div>
            {statusIcon}
          </div>
          {action.detail && <div className="mt-1 line-clamp-2 text-xs text-white/45">{action.detail}</div>}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/35">
            <span>{timeAgo(action.timestamp)}</span>
            {action.durationMs != null && <span>{(action.durationMs / 1000).toFixed(1)}s</span>}
            {action.diff && (
              <button type="button" onClick={onViewDiff} className="text-sky-300 hover:text-sky-200">
                Ver diff
              </button>
            )}
          </div>
          {action.status === "needs-confirmation" && (
            <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
              Requiere confirmación explícita antes de continuar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(timestamp: number) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 3) return "ahora";
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `hace ${minutes}m`;
}
