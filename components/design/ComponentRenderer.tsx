"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignBackground, DesignViewport } from "./types";
import { isWebDocument, previewDocument } from "./web-doc";

export { buildStandaloneHtml } from "./web-doc";

const backgroundClass: Record<DesignBackground, string> = {
  white: "bg-white",
  gray: "bg-zinc-200",
  dark: "bg-zinc-950",
  transparent:
    "bg-[linear-gradient(45deg,#d4d4d8_25%,transparent_25%),linear-gradient(-45deg,#d4d4d8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d4d4d8_75%),linear-gradient(-45deg,transparent_75%,#d4d4d8_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]",
};

const viewportClass: Record<DesignViewport, string> = {
  mobile: "w-[375px] max-w-full",
  tablet: "w-[768px] max-w-full",
  desktop: "w-full",
};

interface ComponentRendererProps {
  code: string;
  background: DesignBackground;
  viewport: DesignViewport;
  refreshKey: number;
  isGenerating: boolean;
  /** Aviso no bloqueante (por ejemplo, error de sintaxis en el JS). */
  notice?: string | null;
}

export function ComponentRenderer({ code, background, viewport, refreshKey, isGenerating, notice }: ComponentRendererProps) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    setRuntimeError(null);
  }, [code, refreshKey]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "nimchat-design-error") {
        setRuntimeError(String(event.data.message ?? "Error de ejecución"));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const srcDoc = useMemo(() => (isWebDocument(code) ? previewDocument(code) : ""), [code]);

  if (!code.trim()) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <RefreshCw className={cn("mx-auto mb-3 h-6 w-6 text-white/25", isGenerating && "animate-spin")} />
          <p className="text-sm font-medium text-white/60">{isGenerating ? "Generando interfaz…" : "Vista previa lista"}</p>
          {!isGenerating && (
            <p className="mt-1 max-w-sm text-xs text-white/35">Describe una interfaz y se mostrará aquí en HTML, CSS y JavaScript.</p>
          )}
        </div>
      </div>
    );
  }

  if (!srcDoc) {
    return (
      <div className="p-4">
        <Banner message="Este diseño es de una versión anterior (React) y ya no se puede mostrar. Genera uno nuevo." />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full overflow-auto p-3", backgroundClass[background])}>
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="ui-mono rounded-full border border-white/15 bg-zinc-950/80 px-4 py-2 text-xs text-white/70">generando…</div>
        </div>
      )}
      {(runtimeError || notice) && <Banner message={runtimeError ?? notice ?? ""} floating />}
      <div className={cn("mx-auto h-full min-h-[480px] overflow-hidden rounded-md shadow-2xl transition-all", viewportClass[viewport])}>
        <iframe
          key={`${refreshKey}-${code.length}`}
          title="Vista previa del diseño"
          // Aislado: puede ejecutar scripts pero no tiene acceso a la app ni a sus datos.
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="h-full min-h-[480px] w-full border-0 bg-transparent"
        />
      </div>
    </div>
  );
}

function Banner({ message, floating }: { message: string; floating?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100",
        floating && "absolute left-4 right-4 top-4 z-20 backdrop-blur"
      )}
    >
      <div className="mb-0.5 flex items-center gap-2 font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        Aviso
      </div>
      <p className="break-words text-red-100/80">{message}</p>
    </div>
  );
}
