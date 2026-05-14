"use client";

import { useRef, useState } from "react";
import * as Babel from "@babel/standalone";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptPanel } from "./PromptPanel";
import { PreviewPanel } from "./PreviewPanel";
import { streamChat } from "@/lib/nvidia-nim";
import { uid } from "@/lib/utils";
import type { AppSettings } from "@/lib/chat-storage";
import { resolveMaxTokens } from "@/lib/token-policy";
import type { DesignGeneration, DesignState } from "./types";

const DESIGN_SYSTEM_PROMPT = `You are an expert UI/UX engineer. Generate clean, modern React components using Tailwind CSS.
Return ONLY the component code, no explanations, no markdown fences, no imports --
just one self-contained React component starting with export default function Component().
Use realistic placeholder data. Make it visually polished.
You may use lucide-react icons directly by name without importing them.
IMPORTANT RULES:
- Keep the component focused and reasonably sized (under ~320 lines).
- Do not use Next.js-specific components such as Link or Image.
- If you need state, use React.useState / React.useMemo / React.useEffect, not imported hooks.
- Never use inline SVG data URIs inside className or style attributes (no bg-[url('data:image/svg+xml,...')]).
- Never embed raw SVG inside CSS classes or style props.
- If you need a background pattern, use Tailwind gradient or solid color classes only.
- Keep className strings simple: no nested quotes, no data URIs, no base64.
- Do not include prose, markdown, tables, comments outside the component, or explanations.`;

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
        ? `Refina el componente existente según esta petición: ${prompt}\n\nCódigo actual:\n${state.currentCode}`
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

      const code = assertValidGeneratedCode(extractJSX(rawOutput));
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

        {state.isGenerating && (livePreview || liveReasoning) && (
          <div className="mx-4 mt-4 grid gap-3 lg:grid-cols-2">
            {liveReasoning && (
              <div className="flex min-h-[120px] flex-col gap-2 rounded-2xl border border-orange-400/20 bg-orange-500/[0.04] p-3 text-xs text-orange-100/85">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-orange-300/80">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Razonando
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono leading-relaxed text-orange-100/75">{liveReasoning}</pre>
              </div>
            )}
            {livePreview && (
              <div className="flex min-h-[120px] flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/80">
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
        />
      </div>
    </div>
  );
}

function assertValidGeneratedCode(code: string): string {
  try {
    Babel.transform(code, {
      filename: "GeneratedComponent.tsx",
      presets: [
        ["typescript", { isTSX: true, allExtensions: true }],
        ["react", { runtime: "classic" }],
      ],
    });
    return code;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unterminated string constant|unexpected token/i.test(message)) {
      throw new Error(
        "El modelo devolvió JSX incompleto o mal formado. Aumenta Max tokens en Ajustes (hasta 32768) y vuelve a intentarlo.",
      );
    }
    throw new Error("El modelo no devolvió código válido. Prueba a generar de nuevo.");
  }
}

function extractCodeBlock(output: string): string {
  const matches = [...output.matchAll(/```(?:tsx|jsx|ts|js)?\s*([\s\S]*?)```/gi)];
  if (matches.length === 0) return output;

  const codeLike = matches.find((match) => /export\s+default|function\s+\w+|const\s+\w+\s*=/.test(match[1]));
  return (codeLike ?? matches[0])[1];
}

function stripImports(code: string): string {
  return code
    .replace(/^\s*["']use client["'];?\s*/gm, "")
    .replace(/^\s*import[\s\S]*?;\s*/gm, "")
    .replace(/^\s*export\s+\{[^}]*\};?\s*/gm, "")
    .trim();
}

function sanitizeDangerousCss(code: string): string {
  return code
    .replace(/\s+[\w:/.-]+-\[[^\]\n]*(?:data:image|base64|<svg|%3csvg|%3Csvg)[^\]\n]*\]/g, "")
    .replace(/\s+[\w:/.-]+-\[url\([\s\S]*?\)\]/g, "")
    .replace(/style=\{\{[^}]*url\([^}]*\)[^}]*\}\}/g, "");
}

function sliceToCode(code: string): string {
  const lines = code.split("\n");
  const startIndex = lines.findIndex((line) =>
    /^\s*(const|let|var|function|type|interface|export\s+default|export\s+function|export\s+const)\b/.test(line)
  );

  if (startIndex === -1) return code.trim();
  return lines.slice(startIndex).join("\n").trim();
}

function ensureDefaultExport(code: string): string {
  if (/export\s+default\s+/.test(code)) return code;

  const functionMatch = code.match(/\bfunction\s+([A-Z][\w]*)\s*\(/);
  if (functionMatch) {
    return code.replace(/\bfunction\s+([A-Z][\w]*)\s*\(/, "export default function $1(");
  }

  const constMatch = code.match(/\bconst\s+([A-Z][\w]*)\s*=\s*(?:\([^)]*\)|[\w{} ,]+)?\s*=>/);
  if (constMatch) return `${code}\n\nexport default ${constMatch[1]};`;

  throw new Error("El modelo no devolvió un componente React exportable. Prueba a generar de nuevo.");
}

function autoCloseCode(code: string): string {
  const lines = code.split("\n");

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.trim()) continue;
    const dq = (line.match(/(?<!\\)"/g) || []).length;
    const sq = (line.match(/(?<!\\)'/g) || []).length;
    const bt = (line.match(/(?<!\\)`/g) || []).length;
    if (dq % 2 !== 0 || sq % 2 !== 0 || bt % 2 !== 0) {
      lines.splice(i);
    }
    break;
  }

  let trimmed = lines.join("\n");

  const openB = (trimmed.match(/\{/g) || []).length;
  const closeB = (trimmed.match(/\}/g) || []).length;
  const openP = (trimmed.match(/\(/g) || []).length;
  const closeP = (trimmed.match(/\)/g) || []).length;

  const missingParens = Math.max(0, openP - closeP);
  const missingBraces = Math.max(0, openB - closeB);

  if (missingParens > 0 || missingBraces > 0) {
    trimmed += "\n" + ")".repeat(missingParens) + "\n" + "}".repeat(missingBraces);
  }

  return trimmed;
}

export function extractJSX(rawOutput: string): string {
  const withoutFences = sanitizeDangerousCss(extractCodeBlock(rawOutput))
    .replace(/<\/\s+<\/(\w[\w.]*)\s*>/g, "</$1>")
    .replace(/<\/\s+(\w[\w.]*)\s*>/g, "</$1>")
    .replace(/<\/\s*$/gm, "")
    .trim();

  let code = ensureDefaultExport(stripImports(sliceToCode(withoutFences)));

  code = autoCloseCode(code);

  if (!/export\s+default\s+/.test(code) || !/return\s*\(?\s*</.test(code)) {
    throw new Error("El modelo no devolvió código válido. Intenta reformular el prompt.");
  }

  return code;
}