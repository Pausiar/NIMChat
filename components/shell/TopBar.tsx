"use client";

import { Menu, Settings as SettingsIcon } from "lucide-react";
import { NimLogo } from "@/components/brand/NimLogo";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop";
import { UpdateBadge } from "./UpdateBadge";

export type AppMode = "chat" | "design" | "code";

const MODES: { id: AppMode; label: string }[] = [
  { id: "chat", label: "chat" },
  { id: "design", label: "design" },
  { id: "code", label: "code" },
];

interface TopBarProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  modelName: string;
  hasApiKey: boolean;
  onOpenSettings: () => void;
  onToggleSidebar?: () => void;
}

export function TopBar({
  activeMode,
  onModeChange,
  modelName,
  hasApiKey,
  onOpenSettings,
  onToggleSidebar,
}: TopBarProps) {
  // En la app de escritorio la barra hace de barra de título: se arrastra la ventana
  // desde ella y se deja sitio a los botones de ventana del sistema.
  const desktop = Boolean(getDesktop());
  return (
    <header
      className={cn(
        "ui-mono flex h-10 shrink-0 items-center justify-between border-b border-border bg-background px-3 text-xs",
        desktop && "[-webkit-app-region:drag] [&_button]:[-webkit-app-region:no-drag]"
      )}
      style={
        desktop
          ? { paddingRight: "calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw) + 12px)" }
          : undefined
      }
    >
      <div className="flex h-full items-center gap-5">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="rounded p-1 text-white/60 hover:bg-white/5 md:hidden"
              aria-label="Abrir conversaciones"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <NimLogo size={18} className="h-[18px] w-[18px]" />
          <span className="font-semibold text-white">nimchat</span>
        </div>
        <nav className="flex h-full items-stretch" aria-label="Modo">
          {MODES.map((mode) => {
            const active = mode.id === activeMode;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onModeChange(mode.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative px-3 transition-colors",
                  active ? "text-white" : "text-white/45 hover:text-white/80"
                )}
              >
                {mode.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-nim-yellow" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <UpdateBadge />
        {!hasApiKey && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded border border-nim-yellow/40 px-2 py-0.5 text-nim-yellow hover:bg-nim-yellow/10"
          >
            configurar API key
          </button>
        )}
        <span className="hidden max-w-[220px] truncate text-white/35 sm:inline">{modelName}</span>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded p-1 text-white/55 hover:bg-white/5 hover:text-white"
          aria-label="Ajustes"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
