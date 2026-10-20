"use client";

import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./CodeEditor";
import { ComponentRenderer, buildStandaloneHtml } from "./ComponentRenderer";
import type { DesignBackground, DesignViewport } from "./types";

type Tab = "preview" | "code";

interface PreviewPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  background: DesignBackground;
  onBackgroundChange: (background: DesignBackground) => void;
  viewport: DesignViewport;
  onViewportChange: (viewport: DesignViewport) => void;
  refreshKey: number;
  onRefresh: () => void;
  isGenerating: boolean;
  notice?: string | null;
}

const backgrounds: { id: DesignBackground; label: string }[] = [
  { id: "white", label: "Blanco" },
  { id: "gray", label: "Gris" },
  { id: "dark", label: "Oscuro" },
  { id: "transparent", label: "Transparente" },
];

const viewports: { id: DesignViewport; label: string }[] = [
  { id: "mobile", label: "Mobile" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

export function PreviewPanel({
  code,
  onCodeChange,
  activeTab,
  onTabChange,
  background,
  onBackgroundChange,
  viewport,
  onViewportChange,
  refreshKey,
  onRefresh,
  isGenerating,
  notice,
}: PreviewPanelProps) {
  const handleDownloadHtml = () => {
    if (!code.trim()) return;
    try {
      const html = buildStandaloneHtml(code);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `nimchat-design-${stamp}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Si el código no es válido todavía, ignorar silenciosamente.
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border px-2">
        <div className="ui-mono flex h-full items-stretch">
          <TabButton active={activeTab === "preview"} onClick={() => onTabChange("preview")}>
            vista previa
          </TabButton>
          <TabButton active={activeTab === "code"} onClick={() => onTabChange("code")}>
            código
          </TabButton>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "preview" && (
            <>
              <Segmented items={backgrounds} value={background} onChange={onBackgroundChange} />
              <Segmented items={viewports} value={viewport} onChange={onViewportChange} />
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleDownloadHtml}
            disabled={!code.trim() || isGenerating}
            aria-label="Descargar diseño como HTML"
            title="Descargar como HTML autónomo"
            className="ui-mono"
          >
            <Download className="h-3.5 w-3.5" />
            html
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={onRefresh} aria-label="Refrescar vista previa">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "preview" ? (
          <ComponentRenderer
            notice={notice}
            code={code}
            background={background}
            viewport={viewport}
            refreshKey={refreshKey}
            isGenerating={isGenerating}
          />
        ) : (
          <CodeEditor code={code} onCodeChange={onCodeChange} />
        )}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-3 text-xs transition-colors",
        active ? "text-white" : "text-white/45 hover:text-white"
      )}
    >
      {children}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-nim-yellow" />}
    </button>
  );
}

function Segmented<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="ui-mono hidden items-center gap-px rounded-md border border-border p-0.5 md:flex">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "rounded px-2 py-0.5 text-[11px] transition-colors",
            value === item.id ? "bg-nim-yellow text-black" : "text-white/45 hover:text-white"
          )}
        >
          {item.label.toLowerCase()}
        </button>
      ))}
    </div>
  );
}
