"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Pause, Play, Square, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentAction } from "@/lib/tools";
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
