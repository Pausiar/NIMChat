"use client";

import React, { useState } from "react";
import { Bot, Copy, Check, User } from "lucide-react";
import { Message } from "@/lib/chat-storage";
import { cn } from "@/lib/utils";
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
      <div className="flex justify-end">
        <div className="group flex max-w-[80%] flex-col items-end gap-1">
          <div className="rounded-2xl rounded-br-md bg-[#1e1e2e] px-4 py-2.5 text-[15px] text-white whitespace-pre-wrap">
            {message.content}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-white/40 opacity-0 transition-opacity hover:text-white/80 group-hover:opacity-100"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
    );
  }

  const modelInfo = message.model ? getModel(message.model) : null;

  return (
    <div className="group flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Bot className="h-4 w-4 text-white/70" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {modelInfo && (
          <div className="text-xs text-white/40">
            {modelInfo.provider} · {modelInfo.name}
          </div>
        )}
        <div className="relative">
          <MarkdownRenderer content={message.content || (isStreaming ? "​" : "")} />
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-white/60 align-middle" />
          )}
        </div>
        {!isStreaming && message.content && (
          <button
            type="button"
            onClick={handleCopy}
            className="mt-1 flex w-fit items-center gap-1 text-xs text-white/40 opacity-0 transition-opacity hover:text-white/80 group-hover:opacity-100"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copiado" : "Copiar respuesta"}
          </button>
        )}
      </div>
    </div>
  );
}

// Avoid unused-import warning when User is referenced elsewhere
export const _user = User;
