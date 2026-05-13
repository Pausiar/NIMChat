"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./CodeEditor";
import { ComponentRenderer } from "./ComponentRenderer";
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
}: PreviewPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#0a0a0b] p-4">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
          <TabButton active={activeTab === "preview"} onClick={() => onTabChange("preview")}>
            Preview
          </TabButton>
          <TabButton active={activeTab === "code"} onClick={() => onTabChange("code")}>
            Code
          </TabButton>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onRefresh}
          className="h-8 w-8 text-white/60 hover:text-white"
          aria-label="Refrescar preview"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "preview" ? (
          <ComponentRenderer
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

      {activeTab === "preview" && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
            {backgrounds.map((item) => (
              <SmallButton
                key={item.id}
                active={background === item.id}
                onClick={() => onBackgroundChange(item.id)}
              >
                {item.label}
              </SmallButton>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
            {viewports.map((item) => (
              <SmallButton
                key={item.id}
                active={viewport === item.id}
                onClick={() => onViewportChange(item.id)}
              >
                {item.label}
              </SmallButton>
            ))}
          </div>
        </div>
      )}
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
        "rounded-lg px-3 py-1.5 text-sm transition",
        active ? "bg-white text-black" : "text-white/55 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function SmallButton({
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
        "rounded-lg px-2.5 py-1 text-xs transition",
        active ? "bg-white text-black" : "text-white/45 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}