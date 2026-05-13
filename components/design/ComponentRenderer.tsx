"use client";

import { useEffect, useMemo, useState } from "react";
import * as Babel from "@babel/standalone";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignBackground, DesignViewport } from "./types";

const backgroundClass: Record<DesignBackground, string> = {
  white: "bg-white",
  gray: "bg-zinc-100",
  dark: "bg-zinc-950",
  transparent:
    "bg-[linear-gradient(45deg,#d4d4d8_25%,transparent_25%),linear-gradient(-45deg,#d4d4d8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d4d4d8_75%),linear-gradient(-45deg,transparent_75%,#d4d4d8_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]",
};

const viewportClass: Record<DesignViewport, string> = {
  mobile: "w-[375px]",
  tablet: "w-[768px]",
  desktop: "w-full",
};

interface ComponentRendererProps {
  code: string;
  background: DesignBackground;
  viewport: DesignViewport;
  refreshKey: number;
  isGenerating: boolean;
}

export function ComponentRenderer({
  code,
  background,
  viewport,
  refreshKey,
  isGenerating,
}: ComponentRendererProps) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "nimchat-design-error") {
        setRuntimeError(String(event.data.message ?? "Error de runtime"));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const compiled = useMemo(() => {
    if (!code.trim()) return { js: "", error: null };
    try {
      const result = Babel.transform(code, {
        filename: "GeneratedComponent.tsx",
        presets: [
          ["typescript", { isTSX: true, allExtensions: true }],
          ["react", { runtime: "classic" }],
        ],
        plugins: ["transform-modules-commonjs"],
      });
      return { js: result.code ?? "", error: null };
    } catch (error) {
      return {
        js: "",
        error:
          error instanceof Error
            ? error.message
            : "El modelo no devolvió código válido. Intenta reformular el prompt.",
      };
    }
  }, [code]);

  const srcDoc = useMemo(() => {
    if (!compiled.js) return "";
    return buildSrcDoc(compiled.js);
  }, [compiled.js, refreshKey]);

  if (!code.trim()) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
        <div>
          <RefreshCw className="mx-auto mb-3 h-7 w-7 text-white/25" />
          <p className="text-sm font-medium text-white/65">Preview listo</p>
          <p className="mt-1 max-w-sm text-xs text-white/35">
            Escribe una descripción y genera un componente para verlo aquí.
          </p>
        </div>
      </div>
    );
  }

  if (compiled.error && isGenerating) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
        <div className="h-28 w-full max-w-sm animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (compiled.error) {
    return <RenderError message={compiled.error} />;
  }

  return (
    <div className={cn("relative h-full min-h-[420px] overflow-auto rounded-2xl p-4", backgroundClass[background])}>
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-sm">
          <div className="rounded-full border border-white/15 bg-zinc-950/80 px-4 py-2 text-sm text-white/70">
            Generando interfaz...
          </div>
        </div>
      )}
      {runtimeError && <RenderError message={runtimeError} floating />}
      <div className={cn("mx-auto h-full min-h-[560px] overflow-hidden rounded-xl shadow-2xl transition-all", viewportClass[viewport])}>
        <iframe
          key={`${refreshKey}-${compiled.js}`}
          title="Preview del componente generado"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          onLoad={() => setRuntimeError(null)}
          className="h-full min-h-[560px] w-full border-0 bg-transparent"
        />
      </div>
    </div>
  );
}

function RenderError({ message, floating }: { message: string; floating?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100",
        floating && "absolute left-6 right-6 top-6 z-20 backdrop-blur"
      )}
    >
      <div className="mb-1 flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        El modelo no devolvió código válido
      </div>
      <p className="text-red-100/75">{message}</p>
    </div>
  );
}

function buildSrcDoc(compiledJs: string) {
  const js = JSON.stringify(compiledJs);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      html, body, #root { min-height: 100%; margin: 0; }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import React from "https://esm.sh/react@19.0.0";
      import { createRoot } from "https://esm.sh/react-dom@19.0.0/client";
      import * as LucideReact from "https://esm.sh/lucide-react@0.460.0?deps=react@19.0.0";

      Object.assign(globalThis, LucideReact);
      globalThis.React = React;

      const exports = {};
      const module = { exports };
      const compiled = ${js};

      try {
        new Function("React", "exports", "module", compiled)(React, exports, module);
        const Component = module.exports.default || exports.default;
        if (typeof Component !== "function") {
          throw new Error("No se encontró un export default function válido.");
        }
        createRoot(document.getElementById("root")).render(React.createElement(Component));
      } catch (error) {
        const message = String(error && error.message ? error.message : error);
        parent.postMessage({ type: "nimchat-design-error", message }, "*");
        document.getElementById("root").innerHTML = '<pre style="margin:16px;padding:16px;border:1px solid rgba(239,68,68,.35);border-radius:16px;background:rgba(239,68,68,.08);color:#fecaca;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;">' + message + '</pre>';
      }
    </script>
  </body>
</html>`;
}