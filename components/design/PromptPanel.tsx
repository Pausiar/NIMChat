"use client";

import { Loader2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { GenerationHistory } from "./GenerationHistory";
import type { DesignGeneration } from "./types";

interface PromptPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (id: string) => void;
  history: DesignGeneration[];
  activeGenerationId?: string;
  onSelectGeneration: (generation: DesignGeneration) => void;
  onClearHistory: () => void;
  onGenerate: (mode: "generate" | "refine") => void;
  isGenerating: boolean;
  canRefine: boolean;
}

export function PromptPanel({
  prompt,
  onPromptChange,
  selectedModel,
  onModelChange,
  history,
  activeGenerationId,
  onSelectGeneration,
  onClearHistory,
  onGenerate,
  isGenerating,
  canRefine,
}: PromptPanelProps) {
  const canSubmit = prompt.trim().length > 0 && !isGenerating;

  return (
    <aside className="flex min-h-0 flex-col gap-4 border-r border-white/10 bg-[#0d0d10]/90 p-4 lg:w-[40%]">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-orange-300/70">
          NimChat Design
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Genera interfaces con NVIDIA NIM
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          Describe un componente y el modelo devolverá React + Tailwind listo
          para copiar en un proyecto Next.js.
        </p>
      </div>

      <GenerationHistory
        history={history}
        activeId={activeGenerationId}
        onSelect={onSelectGeneration}
        onClear={onClearHistory}
      />

      <div className="rounded-2xl border border-white/10 bg-[#141418] p-3 shadow-xl">
        <Textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="Describe el componente que quieres generar... (ej: 'Un dashboard card con métricas de ventas, gráfico de línea y badge de porcentaje')"
          className="min-h-[96px] resize-y border-white/10 bg-black/20 text-sm leading-relaxed text-white placeholder:text-white/30 focus-visible:ring-orange-400/40"
          disabled={isGenerating}
        />

        <div className="mt-3">
          <ModelSelector value={selectedModel} onChange={onModelChange} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={() => onGenerate("generate")}
            disabled={!canSubmit}
            className="gap-2 bg-white text-black hover:bg-white/90 disabled:opacity-40"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            Generar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onGenerate("refine")}
            disabled={!canSubmit || !canRefine}
            className="gap-2 border-orange-400/30 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20 hover:text-white disabled:opacity-30"
          >
            Refinar
          </Button>
        </div>
      </div>
    </aside>
  );
}