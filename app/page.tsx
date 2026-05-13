"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Menu, KeyRound, Settings as SettingsIcon } from "lucide-react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { Button } from "@/components/ui/button";
import {
  AppSettings,
  Chat,
  DEFAULT_SETTINGS,
  createNewChat,
  loadActiveChatId,
  loadChats,
  loadSettings,
  newMessage,
  saveActiveChatId,
  saveChats,
  saveSettings,
} from "@/lib/chat-storage";
import { streamChat } from "@/lib/nvidia-nim";
import { getModel, DEFAULT_MODEL_ID } from "@/lib/models";
import { truncateTitle } from "@/lib/utils";

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    const loadedSettings = loadSettings();
    const loadedChats = loadChats();
    const loadedActive = loadActiveChatId();
    setSettings(loadedSettings);
    setChats(loadedChats);
    setActiveId(
      loadedActive && loadedChats.find((c) => c.id === loadedActive)
        ? loadedActive
        : loadedChats[0]?.id ?? null
    );
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (hydrated) saveChats(chats);
  }, [chats, hydrated]);
  useEffect(() => {
    if (hydrated) saveActiveChatId(activeId);
  }, [activeId, hydrated]);
  useEffect(() => {
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId) ?? null,
    [chats, activeId]
  );

  const updateChat = useCallback(
    (id: string, updater: (chat: Chat) => Chat) => {
      setChats((prev) =>
        prev.map((c) => (c.id === id ? updater(c) : c))
      );
    },
    []
  );

  const handleNewChat = useCallback(() => {
    const chat = createNewChat(
      settings.selectedModel || DEFAULT_MODEL_ID,
      settings.globalSystemPrompt
    );
    setChats((prev) => [chat, ...prev]);
    setActiveId(chat.id);
    setInput("");
    setError(null);
  }, [settings.selectedModel, settings.globalSystemPrompt]);

  const handleDelete = useCallback(
    (id: string) => {
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          setActiveId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [activeId]
  );

  const handleRename = useCallback(
    (id: string, title: string) => {
      updateChat(id, (c) => ({ ...c, title, updatedAt: Date.now() }));
    },
    [updateChat]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const ensureActiveChat = useCallback((): Chat => {
    if (activeChat) return activeChat;
    const chat = createNewChat(
      settings.selectedModel || DEFAULT_MODEL_ID,
      settings.globalSystemPrompt
    );
    setChats((prev) => [chat, ...prev]);
    setActiveId(chat.id);
    return chat;
  }, [activeChat, settings.selectedModel, settings.globalSystemPrompt]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    if (!settings.apiKey) {
      setError("Configura tu NVIDIA NIM API key en Ajustes para continuar.");
      setSettingsOpen(true);
      return;
    }

    setError(null);
    const chat = ensureActiveChat();
    const chatId = chat.id;

    const userMsg = newMessage("user", text);
    const assistantMsg = newMessage("assistant", "", chat.model);

    const isFirstMsg = chat.messages.filter((m) => m.role === "user").length === 0;
    const newTitle = isFirstMsg ? truncateTitle(text) : chat.title;

    // Build the messages payload from the *current* chat state (pre-update)
    const systemPrompt = chat.systemPrompt ?? settings.globalSystemPrompt;
    const payloadMessages = [
      ...(systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }]
        : []),
      ...chat.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              title: newTitle,
              messages: [...c.messages, userMsg, assistantMsg],
              updatedAt: Date.now(),
            }
          : c
      )
    );
    setInput("");
    setIsStreaming(true);
    setStreamingMessageId(assistantMsg.id);

    const controller = new AbortController();
    abortRef.current = controller;

    let acc = "";
    try {
      await streamChat({
        apiKey: settings.apiKey,
        model: chat.model,
        messages: payloadMessages,
        params: settings.params,
        signal: controller.signal,
        onToken: (tok) => {
          acc += tok;
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsg.id ? { ...m, content: acc } : m
                    ),
                    updatedAt: Date.now(),
                  }
                : c
            )
          );
        },
      });
    } catch (e: any) {
      if (e?.name === "AbortError") {
        // Keep partial content
      } else {
        const msg = e?.message || "Error desconocido al contactar con NVIDIA NIM.";
        setError(msg);
        // Remove the empty assistant message if no content was produced
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.filter(
                    (m) => !(m.id === assistantMsg.id && !m.content)
                  ),
                }
              : c
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      abortRef.current = null;
    }
  }, [input, isStreaming, settings, ensureActiveChat]);

  const handleModelChange = useCallback(
    (id: string) => {
      setSettings((s) => ({ ...s, selectedModel: id }));
      if (activeChat) {
        updateChat(activeChat.id, (c) => ({ ...c, model: id }));
      }
    },
    [activeChat, updateChat]
  );

  const currentModel = activeChat?.model ?? settings.selectedModel;
  const modelInfo = getModel(currentModel);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0b] text-white/40">
        Cargando...
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#0a0a0b]">
      <Sidebar
        chats={chats}
        activeChatId={activeId}
        onNewChat={handleNewChat}
        onSelect={(id) => setActiveId(id)}
        onRename={handleRename}
        onDelete={handleDelete}
        onOpenSettings={() => setSettingsOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="lab-bg relative flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="z-10 flex items-center justify-between border-b border-white/5 bg-[#0a0a0b]/80 px-3 py-2 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded p-1.5 text-white/70 hover:bg-white/5 md:hidden"
              aria-label="Abrir sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm">
              <div className="font-medium text-white">
                {activeChat?.title ?? "NimChat"}
              </div>
              <div className="text-xs text-white/40">
                {modelInfo.provider} · {modelInfo.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!settings.apiKey && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSettingsOpen(true)}
                className="gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Configurar API key
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
              className="text-white/60 hover:text-white"
              aria-label="Ajustes"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* API key banner */}
        {!settings.apiKey && (
          <div className="z-10 mx-auto mt-3 w-full max-w-3xl rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100">
            Necesitas una API key gratuita de NVIDIA NIM para empezar.{" "}
            <a
              href="https://build.nvidia.com"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 hover:text-white"
            >
              Consíguela aquí
            </a>{" "}
            y pégala en{" "}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="underline underline-offset-2 hover:text-white"
            >
              Ajustes
            </button>
            .
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="z-10 mx-auto mt-3 flex w-full max-w-3xl items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-300/70 hover:text-white"
              aria-label="Cerrar error"
            >
              ×
            </button>
          </div>
        )}

        {/* Chat area */}
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
          <ChatWindow
            messages={activeChat?.messages ?? []}
            isStreaming={isStreaming}
            streamingMessageId={streamingMessageId}
          />
        </div>

        <div className="relative z-10">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
            selectedModel={currentModel}
            onModelChange={handleModelChange}
          />
        </div>
      </main>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
}
