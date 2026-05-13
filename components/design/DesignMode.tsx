"use client";

import { useState } from "react";
import { AlertCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptPanel } from "./PromptPanel";
import { PreviewPanel } from "./PreviewPanel";
import { streamChat } from "@/lib/nvidia-nim";
import { uid } from "@/lib/utils";
import type { AppSettings } from "@/lib/chat-storage";
import type { DesignGeneration, DesignState } from "./types";

const DESIGN_SYSTEM_PROMPT = `You are an expert UI/UX engineer. Generate clean, modern React components using Tailwind CSS.
Return ONLY the component code, no explanations, no markdown fences, no imports --
just the JSX function body starting with export default function Component().
Use realistic placeholder data. Make it visually polished.
You may use lucide-react icons directly by name without importing them.`;

interface DesignModeProps {
  state: DesignState;
  onStateChange: (updater: (state: DesignState) => DesignState) => void;
  settings: AppSettings;
  onModelChange: (id: string) => void;
  onOpenSettings: () => void;
}

export function DesignMode({
  state,
  onStateChange,
  settings,
  onModelChange,
  onOpenSettings,
}: DesignModeProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeGenerationId, setActiveGenerationId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const canRefine = state.currentCode.trim().length > 0;

  const handleGenerate = async (mode: "generate" | "refine") => {
    const prompt = state.currentPrompt.trim();
    if (!prompt || state.isGenerating) return;

    if (!settings.apiKey) {
      setError("Configura tu NVIDIA NIM API key en Ajustes para generar diseños.");
      onOpenSettings();
      return;
    }

    setError(null);
    onStateChange((current) => ({ ...current, isGenerating: true, currentCode: "" }));
    setActiveTab("preview");

    let rawOutput = "";
    const userContent =
      mode === "refine" && state.currentCode
        ? `Refina el componente existente según esta petición: ${prompt}\n\nCódigo actual:\n${state.currentCode}`
        : prompt;

    try {
      await streamChat({
        apiKey: settings.apiKey,
        model: settings.selectedModel,
        params: settings.params,
        messages: [
          { role: "system", content: DESIGN_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        onToken: (token) => {
          rawOutput += token;
          onStateChange((current) => ({ ...current, currentCode: rawOutput }));
        },
      });

      const code = extractJSX(rawOutput);
      const generation: DesignGeneration = {
        id: uid("design"),
        prompt,
        code,
        timestamp: Date.now(),
      };
      setActiveGenerationId(generation.id);
      onStateChange((current) => ({
        ...current,
        currentCode: code,
        history: [generation, ...current.history],
        isGenerating: false,
      }));
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "El modelo no devolvió código válido. Intenta reformular el prompt.";
      setError(message);
      onStateChange((current) => ({ ...current, isGenerating: false }));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a0b] pb-24 text-white lg:flex-row">
      <PromptPanel
        prompt={state.currentPrompt}
        onPromptChange={(value) =>
          onStateChange((current) => ({ ...current, currentPrompt: value }))
        }
        selectedModel={settings.selectedModel}
        onModelChange={onModelChange}
        history={state.history}
        activeGenerationId={activeGenerationId}
        onSelectGeneration={(generation) => {
          setActiveGenerationId(generation.id);
          onStateChange((current) => ({
            ...current,
            currentPrompt: generation.prompt,
            currentCode: generation.code,
          }));
          setActiveTab("preview");
        }}
        onClearHistory={() => {
          setActiveGenerationId(undefined);
          onStateChange((current) => ({ ...current, history: [] }));
        }}
        onGenerate={handleGenerate}
        isGenerating={state.isGenerating}
        canRefine={canRefine}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {!settings.apiKey && (
          <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Design Mode usa la misma API key de NVIDIA NIM que el chat.
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenSettings}
              className="border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:text-white"
            >
              Configurar
            </Button>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{error}</div>
            <button type="button" onClick={() => setError(null)} className="text-red-100/60 hover:text-white">
              ×
            </button>
          </div>
        )}

        <PreviewPanel
          code={state.currentCode}
          onCodeChange={(code) =>
            onStateChange((current) => ({ ...current, currentCode: code }))
          }
          activeTab={activeTab}
          onTabChange={setActiveTab}
          background={state.selectedBackground}
          onBackgroundChange={(selectedBackground) =>
            onStateChange((current) => ({ ...current, selectedBackground }))
          }
          viewport={state.selectedViewport}
          onViewportChange={(selectedViewport) =>
            onStateChange((current) => ({ ...current, selectedViewport }))
          }
          refreshKey={refreshKey}
          onRefresh={() => setRefreshKey((value) => value + 1)}
          isGenerating={state.isGenerating}
        />
      </div>
    </div>
  );
}

export function extractJSX(rawOutput: string): string {
  const withoutFences = rawOutput
    .replace(/```(?:tsx|jsx|ts|js)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const withoutImports = withoutFences
    .split("\n")
    .filter((line) => !/^\s*import\s/.test(line))
    .join("\n")
    .trim();

  const exportIndex = withoutImports.search(/export\s+default\s+function\s+\w+\s*\(/);
  const functionIndex = withoutImports.search(/function\s+\w+\s*\(/);

  let code = withoutImports;
  if (exportIndex > 0) {
    code = withoutImports.slice(exportIndex).trim();
  } else if (exportIndex === -1 && functionIndex >= 0) {
    code = `export default ${withoutImports.slice(functionIndex).trim()}`;
  }

  if (!/export\s+default\s+function\s+\w+\s*\(/.test(code) || !/return\s*\(?\s*</.test(code)) {
    throw new Error("El modelo no devolvió código válido. Intenta reformular el prompt.");
  }

  return code;
}