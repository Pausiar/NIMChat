"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/shared/ModelPicker";

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
  minHeight = 28,
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div className="rounded-lg border border-border bg-[#101010] transition-colors focus-within:border-nim-yellow/50">
        <div className="flex items-start gap-2 px-3 pt-3">
          <span className="ui-mono select-none pt-px text-nim-yellow">&gt;</span>
          <Textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje…"
            aria-label="Mensaje al modelo"
            disabled={disabled}
            className="min-h-[28px] resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-white placeholder:text-white/30 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <ModelPicker value={selectedModel} onChange={onModelChange} side="top" />
          {isStreaming ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onStop}
              aria-label="Detener generación"
              className="ui-mono gap-1.5 border-red-500/40 text-red-300 hover:bg-red-500/10"
            >
              <Square className="h-3 w-3 fill-current" />
              detener
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onSend}
              disabled={!value.trim() || disabled}
              aria-label="Enviar mensaje"
            >
              Enviar
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <p className="ui-mono mt-2 text-center text-[10px] text-white/25">
        Respuestas de una IA: pueden contener errores.{" "}
        <a href="/legal/privacidad" className="underline hover:text-white/50">
          privacidad
        </a>
      </p>
    </div>
  );
}
