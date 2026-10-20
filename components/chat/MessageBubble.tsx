"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Message } from "@/lib/chat-storage";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { getModel } from "@/lib/models";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  if (isUser) {
    return (
      <div className="group flex gap-3">
        <span className="ui-mono mt-px select-none text-nim-yellow">&gt;</span>
        <div className="min-w-0 flex-1">
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-white">
            {message.content}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="ui-mono mt-1 flex items-center gap-1 text-[11px] text-white/35 opacity-0 transition-opacity hover:text-white/80 group-hover:opacity-100"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "copiado" : "copiar"}
          </button>
        </div>
      </div>
    );
  }

  const modelInfo = message.model ? getModel(message.model) : null;

  return (
    <div className="group flex gap-3">
      <span className="ui-mono mt-0.5 select-none text-nim-yellow">●</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {modelInfo && (
          <div className="ui-mono text-[11px] text-white/30">{modelInfo.name}</div>
        )}
        <div className="relative">
          <MarkdownRenderer content={message.content || (isStreaming ? "​" : "")} />
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-nim-yellow/80 align-middle" />
          )}
        </div>
        {!isStreaming && message.content && (
          <button
            type="button"
            onClick={handleCopy}
            className="ui-mono mt-1 flex w-fit items-center gap-1 text-[11px] text-white/35 opacity-0 transition-opacity hover:text-white/80 group-hover:opacity-100"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "copiado" : "copiar respuesta"}
          </button>
        )}
      </div>
    </div>
  );
}
