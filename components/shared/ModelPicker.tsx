"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getModel } from "@/lib/models";
import { useModelCatalog } from "@/lib/use-model-catalog";
import { cn } from "@/lib/utils";

interface ModelPickerProps {
  value: string;
  onChange: (id: string) => void;
  side?: "top" | "bottom";
  align?: "start" | "end";
  className?: string;
}

export function ModelPicker({ value, onChange, side = "bottom", align = "start", className }: ModelPickerProps) {
  const { models, status } = useModelCatalog();
  const [query, setQuery] = useState("");
  const current = getModel(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => `${m.name} ${m.id} ${m.provider}`.toLowerCase().includes(q));
  }, [models, query]);

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Seleccionar modelo"
          className={cn(
            "ui-mono inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-2 text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white",
            className
          )}
        >
          <span className="truncate">{current.name}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} sideOffset={6} className="w-[340px] p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 text-white/35" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Buscar modelo…"
            className="ui-mono w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-white/30">Sin resultados</div>
          )}
          {filtered.map((m) => (
            <DropdownMenuItem
              key={m.id}
              onSelect={() => onChange(m.id)}
              className="flex items-start justify-between gap-3 rounded-md px-2 py-1.5"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] text-white">{m.name}</div>
                <div className="ui-mono truncate text-[10px] text-white/35">
                  {m.provider}
                  {m.capabilities.length > 0 && ` · ${m.capabilities.join(" · ")}`}
                </div>
              </div>
              {m.id === value && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nim-yellow" />}
            </DropdownMenuItem>
          ))}
        </div>
        <div className="ui-mono border-t border-border px-3 py-1.5 text-[10px] text-white/30">
          {status === "live"
            ? `NVIDIA NIM · ${models.length} modelos`
            : status === "loading"
              ? "Actualizando catálogo…"
              : "Catálogo local"}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
