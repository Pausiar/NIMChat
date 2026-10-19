"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/chat-storage";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface ChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  streamingMessageId: string | null;
}

export function ChatWindow({
  messages,
  isStreaming,
  streamingMessageId,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const visible = messages.filter((m) => m.role !== "system");

  if (visible.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <div className="ui-mono text-2xl text-nim-yellow">&gt;_</div>
        <h2 className="text-lg font-medium text-white">¿En qué trabajamos?</h2>
        <p className="max-w-sm text-sm text-white/40">
          Elige un modelo de NVIDIA NIM y escribe tu primer mensaje.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      {visible.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          isStreaming={isStreaming && m.id === streamingMessageId}
        />
      ))}
      {isStreaming &&
        !visible.some((m) => m.id === streamingMessageId && m.content) && (
          <div className="flex gap-3">
            <span className="ui-mono mt-0.5 text-nim-yellow">●</span>
            <TypingIndicator />
          </div>
        )}
      <div ref={bottomRef} />
    </div>
  );
}
