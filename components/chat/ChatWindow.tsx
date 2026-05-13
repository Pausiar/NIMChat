"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/chat-storage";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { Bot } from "lucide-react";

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
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-white/60">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Bot className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-semibold text-white">¿En qué te ayudo hoy?</h2>
        <p className="max-w-md text-sm">
          NimChat es tu interfaz para los modelos open-source de NVIDIA NIM.
          Selecciona un modelo y empieza a conversar.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <Bot className="h-4 w-4 text-white/70" />
            </div>
            <TypingIndicator />
          </div>
        )}
      <div ref={bottomRef} />
    </div>
  );
}
