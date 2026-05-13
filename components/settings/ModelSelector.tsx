"use client";

import { Check, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AVAILABLE_MODELS, getModel } from "@/lib/models";

interface ModelSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const current = getModel(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between border-white/10 bg-black/30 text-white hover:bg-white/5"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            {current.name}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[360px]">
        {AVAILABLE_MODELS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onSelect={() => onChange(m.id)}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-medium text-white">{m.name}</span>
              {m.id === value && <Check className="h-4 w-4 text-emerald-400" />}
            </div>
            <div className="text-[11px] text-white/50">
              {m.provider} · {m.size}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {m.capabilities.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-white/40">{m.description}</p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
