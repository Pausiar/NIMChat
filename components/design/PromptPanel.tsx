"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/shared/ModelPicker";
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
    <aside className="flex min-h-0 flex-col border-r border-border bg-[#0b0b0b] lg:w-[340px] lg:shrink-0">
      <GenerationHistory
        history={history}
        activeId={activeGenerationId}
        onSelect={onSelectGeneration}
        onClear={onClearHistory}
      />

      <div className="border-t border-border p-2">
        <div className="rounded-md border border-border bg-[#101010] transition-colors focus-within:border-nim-yellow/50">
          <div className="flex items-start gap-2 px-2.5 pt-2.5">
            <span className="ui-mono select-none pt-px text-nim-yellow">&gt;</span>
            <textarea
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && canSubmit) {
                  event.preventDefault();
                  onGenerate("generate");
                }
              }}
              placeholder="Describe el componente: una tarjeta de métricas con gráfico y porcentaje…"
              rows={4}
              disabled={isGenerating}
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-white outline-none placeholder:text-white/25"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 py-1.5">
            <div className="min-w-0 max-w-full flex-1 basis-32">
              <ModelPicker value={selectedModel} onChange={onModelChange} side="top" className="max-w-full" />
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onGenerate("refine")}
                disabled={!canSubmit || !canRefine}
              >
                Refinar
              </Button>
              <Button type="button" size="sm" onClick={() => onGenerate("generate")} disabled={!canSubmit}>
                {isGenerating && <Loader2 className="h-3 w-3 animate-spin" />}
                Generar
              </Button>
            </div>
          </div>
        </div>
        <p className="ui-mono mt-1.5 text-center text-[10px] text-white/25">ctrl + enter para generar</p>
      </div>
    </aside>
  );
}
