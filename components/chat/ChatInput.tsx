"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Square, ChevronDown, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AVAILABLE_MODELS, getModel } from "@/lib/models";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  selectedModel: string;
  onModelChange: (id: string) => void;
  disabled?: boolean;
}

function useAutoResize(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  minHeight = 56,
  maxHeight = 220
) {
  const adjust = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = `${minHeight}px`;
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
  }, [ref, minHeight, maxHeight]);

  useEffect(() => {
    adjust();
  }, [adjust]);

  return adjust;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  selectedModel,
  onModelChange,
  disabled,
}: ChatInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useAutoResize(taRef);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim()) onSend();
    }
  };

  const model = getModel(selectedModel);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-white/10 bg-[#141418] shadow-xl backdrop-blur"
      >
        <Textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter nueva línea)"
          aria-label="Mensaje al modelo"
          disabled={disabled}
          className={cn(
            "min-h-[56px] resize-none border-0 bg-transparent px-4 py-4 text-[15px] leading-relaxed text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
        />
        <div className="flex items-center justify-between gap-2 border-t border-white/5 px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-lg px-2 text-xs text-white/70 hover:bg-white/5 hover:text-white"
                aria-label="Seleccionar modelo"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-medium">{model.name}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[320px]">
              {AVAILABLE_MODELS.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={() => onModelChange(m.id)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium text-white">{m.name}</span>
                    {m.id === selectedModel && (
                      <Check className="h-4 w-4 text-emerald-400" />
                    )}
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
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isStreaming ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={onStop}
              className="h-8 gap-1.5 rounded-lg px-3"
              aria-label="Detener generación"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Detener
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onSend}
              disabled={!value.trim() || disabled}
              className="h-8 gap-1.5 rounded-lg bg-white px-3 text-black hover:bg-white/90 disabled:opacity-30"
              aria-label="Enviar mensaje"
            >
              Enviar
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
