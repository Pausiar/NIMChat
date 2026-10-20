"use client";

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { TopBar, type AppMode } from "@/components/shell/TopBar";
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
import { resolveMaxTokens } from "@/lib/token-policy";
import { truncateTitle } from "@/lib/utils";
import type { DesignState } from "@/components/design/types";

const DesignMode = lazy(() =>
  import("@/components/design/DesignMode").then((mod) => ({
    default: mod.DesignMode,
  }))
);

const CodeMode = lazy(() =>
  import("@/components/code/CodeMode").then((mod) => ({
    default: mod.CodeMode,
  }))
);

const ACTIVE_MODE_KEY = "nimchat:active-mode";

const DEFAULT_DESIGN_STATE: DesignState = {
  currentCode: "",
  currentPrompt: "",
  history: [],
  isGenerating: false,
  selectedBackground: "gray",
  selectedViewport: "desktop",
};

function isAppMode(value: string | null): value is AppMode {
  return (
    value === "chat" ||
    value === "design" ||
    value === "code"
  );
}

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);
  const [activeMode, setActiveMode] = useState<AppMode>("chat");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [designState, setDesignState] = useState<DesignState>(DEFAULT_DESIGN_STATE);
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
    const loadedMode = window.localStorage.getItem(ACTIVE_MODE_KEY);
    setSettings(loadedSettings);
    setChats(loadedChats);
    if (isAppMode(loadedMode)) setActiveMode(loadedMode);
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
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(ACTIVE_MODE_KEY, activeMode);
  }, [activeMode, hydrated]);

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
        params: {
          ...settings.params,
          maxTokens: resolveMaxTokens({
            settings,
            model: chat.model,
            mode: "chat",
          }),
        },
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
      <div className="flex h-screen items-center justify-center bg-background text-white/40">
        Cargando...
      </div>
    );
  }

  const handleModeChange = (mode: AppMode) => {
    setActiveMode(mode);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopBar
        activeMode={activeMode}
        onModeChange={handleModeChange}
        modelName={modelInfo.name}
        hasApiKey={Boolean(settings.apiKey)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleSidebar={activeMode === "chat" ? () => setSidebarOpen(true) : undefined}
      />

      <div className="flex min-h-0 flex-1">
        {activeMode === "chat" && (
          <>
            <Sidebar
              chats={chats}
              activeChatId={activeId}
              onNewChat={handleNewChat}
              onSelect={(id) => setActiveId(id)}
              onRename={handleRename}
              onDelete={handleDelete}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />

            <main className="relative flex min-w-0 flex-1 flex-col">
              {error && (
                <div className="mx-auto mt-3 flex w-full max-w-3xl items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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

              <div className="min-h-0 flex-1 overflow-y-auto">
                <ChatWindow
                  messages={activeChat?.messages ?? []}
                  isStreaming={isStreaming}
                  streamingMessageId={streamingMessageId}
                />
              </div>

              <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onStop={handleStop}
                isStreaming={isStreaming}
                selectedModel={currentModel}
                onModelChange={handleModelChange}
              />
            </main>
          </>
        )}

        {activeMode === "design" && (
          <main className="min-w-0 flex-1">
            <Suspense fallback={<ModeFallback label="Cargando Design…" />}>
              <DesignMode
                state={designState}
                onStateChange={setDesignState}
                settings={settings}
                onModelChange={(id) =>
                  setSettings((current) => ({ ...current, selectedModel: id }))
                }
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </Suspense>
          </main>
        )}

        {activeMode === "code" && (
          <main className="min-w-0 flex-1">
            <Suspense fallback={<ModeFallback label="Cargando Code…" />}>
              <CodeMode
                settings={settings}
                onOpenSettings={() => setSettingsOpen(true)}
                onModelChange={(id) => setSettings((current) => ({ ...current, selectedModel: id }))}
              />
            </Suspense>
          </main>
        )}
      </div>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
}

function ModeFallback({ label }: { label: string }) {
  return (
    <div className="ui-mono flex h-full items-center justify-center bg-background text-xs text-white/40">
      {label}
    </div>
  );
}
