"use client";

import { useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptPanel } from "./PromptPanel";
import { PreviewPanel } from "./PreviewPanel";
import { streamChat } from "@/lib/nvidia-nim";
import { uid } from "@/lib/utils";
import type { AppSettings } from "@/lib/chat-storage";
import { resolveMaxTokens } from "@/lib/token-policy";
import type { DesignGeneration, DesignState } from "./types";
import { checkJs, composeDocument, extractWebParts, splitDocument } from "./web-doc";

const DESIGN_SYSTEM_PROMPT = `You are an expert front-end designer. Build a polished, modern and responsive interface using plain HTML, CSS and vanilla JavaScript.
There is no build step: no React, no TypeScript, no frameworks, no imports, and no external requests (no CDNs, web fonts or image URLs).

Return exactly three fenced code blocks, in this order, and nothing else (no explanations):
\`\`\`html
only the markup that goes inside <body>: no <html>, <head>, <style> or <script> tags
\`\`\`
\`\`\`css
all the styles. Start with a small reset (*{box-sizing:border-box} body{margin:0;font-family:system-ui,sans-serif}), use CSS variables, flexbox/grid and media queries
\`\`\`
\`\`\`js
vanilla JavaScript for the interactivity (DOM APIs, event listeners). If nothing is interactive, put a comment
\`\`\`

Rules:
- Semantic, accessible HTML (labels, alt text, aria where needed). Use realistic placeholder data in the user's language.
- Icons: inline SVG inside the html block or emojis. No data: URIs, no base64, no external files.
- Keep it focused (under ~300 lines in total) and make it work on mobile and desktop.
- The JavaScript must be valid, must not throw on load and must not use import/export.`;

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
  const [notice, setNotice] = useState<string | null>(null);
  const [liveReasoning, setLiveReasoning] = useState("");
  const [livePreview, setLivePreview] = useState("");
  const flushTimerRef = useRef<number | null>(null);

  const canRefine = state.currentCode.trim().length > 0;

  const handleGenerate = async (mode: "generate" | "refine") => {
    const prompt = state.currentPrompt.trim();
    if (!prompt || state.isGenerating) return;
    const previousCode = state.currentCode;

    if (!settings.apiKey) {
      setError("Configura tu NVIDIA NIM API key en Ajustes para generar diseños.");
      onOpenSettings();
      return;
    }

    setError(null);
    setNotice(null);
    setLiveReasoning("");
    setLivePreview("");
    onStateChange((current) => ({
      ...current,
      isGenerating: true,
      currentCode: mode === "refine" ? current.currentCode : "",
    }));
    setActiveTab("preview");

    let rawOutput = "";
    let reasoningBuffer = "";
    const scheduleFlush = () => {
      if (flushTimerRef.current != null) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        setLivePreview(rawOutput.slice(-1200));
        setLiveReasoning(reasoningBuffer.slice(-1200));
      }, 80);
    };
    const userContent =
      mode === "refine" && state.currentCode
        ? refinePrompt(prompt, state.currentCode)
        : prompt;

    try {
      await streamChat({
        apiKey: settings.apiKey,
        model: settings.selectedModel,
        params: {
          ...settings.params,
          maxTokens: resolveMaxTokens({ settings, mode: "design" }),
        },
        messages: [
          { role: "system", content: DESIGN_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        onToken: (token) => {
          rawOutput += token;
          scheduleFlush();
        },
        onReasoning: (chunk) => {
          reasoningBuffer += chunk;
          scheduleFlush();
        },
      });

      const parts = extractWebParts(rawOutput);
      const code = composeDocument(parts);
      const jsProblem = checkJs(parts.js);
      setNotice(jsProblem ? `El JavaScript generado tiene un error de sintaxis: ${jsProblem}. Pide al modelo que lo corrija con «Refinar».` : null);
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
      onStateChange((current) => ({
        ...current,
        currentCode: mode === "refine" ? previousCode : "",
        isGenerating: false,
      }));
    } finally {
      if (flushTimerRef.current != null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      setLivePreview("");
      setLiveReasoning("");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-white lg:flex-row">
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
        {error && (
          <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{error}</div>
            <button type="button" onClick={() => setError(null)} className="text-red-100/60 hover:text-white">
              ×
            </button>
          </div>
        )}

        {state.isGenerating && (livePreview || liveReasoning) && (
          <div className="mx-3 mt-3 grid gap-3 lg:grid-cols-2">
            {liveReasoning && (
              <div className="flex min-h-[120px] flex-col gap-2 rounded-md border border-nim-yellow/20 bg-nim-yellow/[0.04] p-3 text-xs text-white/80">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-nim-yellow">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Razonando
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed text-white/60">{liveReasoning}</pre>
              </div>
            )}
            {livePreview && (
              <div className="flex min-h-[120px] flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/80">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generando código
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed text-white/70">{livePreview}</pre>
              </div>
            )}
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
          notice={notice}
        />
      </div>
    </div>
  );
}

function refinePrompt(request: string, currentDocument: string): string {
  const { html, css, js } = splitDocument(currentDocument);
  return `Refina el diseño existente según esta petición: ${request}

Diseño actual:
\`\`\`html
${html}
\`\`\`
\`\`\`css
${css}
\`\`\`
\`\`\`js
${js}
\`\`\`

Devuelve de nuevo los tres bloques completos (html, css y js) con los cambios aplicados.`;
}
