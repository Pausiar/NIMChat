"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Code2, GitBranch, MessageSquare, PanelLeft, PanelRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppSettings } from "@/lib/chat-storage";
import {
  NimChatServerClient,
  DEFAULT_LOCAL_SERVER_URL,
  type FileEntry,
  type McpServerInfo,
  type ProjectInfo,
  type ReadFileResult,
  type TerminalEvent,
} from "@/lib/server-client";
import {
  compactTranscriptNow,
  getSoftCompactAt,
  runAgentLoop,
  transcriptTokens,
  type ArtifactMeta,
} from "@/lib/agent-loop";
import { wantsAgents, type AgentInfo, type AgentMessageEvent } from "@/lib/agents";
import {
  deleteTranscript,
  loadActiveSessionId,
  loadSessions,
  loadTranscript,
  newSession,
  saveActiveSessionId,
  saveSessions,
  saveTranscript,
  titleFromPrompt,
  upsertAction,
  type CodeSession,
} from "@/lib/code-sessions";
import { useModelCatalog } from "@/lib/use-model-catalog";
import { resolveMaxTokens } from "@/lib/token-policy";
import { getDesktop, splitPath } from "@/lib/desktop";
import { loadRecentProjects, rememberProject, type RecentProject } from "@/lib/recent-projects";
import { uid } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { FileExplorer } from "./FileExplorer";
import { CodeEditor, type CodeCenterTab } from "./CodeEditor";
import { CodeChat } from "./CodeChat";
import { ProjectSidebar } from "./ProjectSidebar";
import { SidePanel } from "./SidePanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { TextPromptDialog } from "./TextPromptDialog";

interface CodeModeProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onModelChange: (id: string) => void;
}

type View = "chat" | "code";
const VIEW_KEY = "nimchat:code:view";
const CONTINUE_TEXT = "Continúa donde lo dejaste y termina la tarea. No repitas lo que ya está hecho.";

export function CodeMode({ settings, onOpenSettings, onModelChange }: CodeModeProps) {
  const client = useMemo(() => new NimChatServerClient(DEFAULT_LOCAL_SERVER_URL), []);
  const { models: catalogModels } = useModelCatalog();

  // Proyecto y archivos (servidor local)
  const [connected, setConnected] = useState(false);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<ReadFileResult | null>(null);
  const [activeTab, setActiveTab] = useState<CodeCenterTab>("editor");
  const [terminalEvents, setTerminalEvents] = useState<TerminalEvent[]>([]);
  const [gitPatch, setGitPatch] = useState("");
  const [gitStat, setGitStat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentProject[]>([]);

  // Sesiones (chats por proyecto)
  const [sessions, setSessions] = useState<CodeSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsReady, setSessionsReady] = useState(false);
  const [input, setInput] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [contextTokens, setContextTokens] = useState(0);
  const [artifacts, setArtifacts] = useState<ArtifactMeta[]>([]);
  const [compacting, setCompacting] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [connectedConnectors, setConnectedConnectors] = useState(0);
  const transcriptRef = useRef<ReturnType<typeof loadTranscript>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);

  // Distribución
  const [view, setView] = useState<View>("chat");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const [pendingTextPrompt, setPendingTextPrompt] = useState<{
    title: string;
    description?: string;
    label: string;
    initialValue: string;
    confirmLabel?: string;
    onConfirm: (value: string) => void | Promise<void>;
  } | null>(null);

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeSessionId) ?? null, [sessions, activeSessionId]);
  const running = runningId !== null;
  const codeMaxTokens = resolveMaxTokens({ settings, mode: "code" });
  const compactAt = getSoftCompactAt(settings.selectedModel, codeMaxTokens);

  // ---------- Proyecto ----------

  const refreshProject = useCallback(async () => {
    try {
      await client.health();
      setConnected(true);
      const [info, tree, diff] = await Promise.all([
        client.getProjectInfo(),
        client.listFiles(".", true),
        client.gitDiff().catch(() => ({ diff: "", patch: "" })),
      ]);
      setProjectInfo(info);
      setEntries(tree.entries);
      setGitStat(diff.diff);
      setGitPatch(diff.patch);
      setError(null);
      client
        .listMcpServers()
        .then((list) => setConnectedConnectors(list.filter((server) => server.status === "connected").length))
        .catch(() => undefined);
      return info;
    } catch (cause) {
      setConnected(false);
      setError(cause instanceof Error ? cause.message : "No se pudo conectar con el servidor local.");
      return null;
    }
  }, [client]);

  useEffect(() => {
    void refreshProject();
  }, [refreshProject]);

  useEffect(() => {
    if (!connected) return;
    const socket = client.createTerminalSocket((event) => {
      setTerminalEvents((current) => [...current.slice(-300), event]);
    });
    return () => socket.close();
  }, [client, connected]);

  // ---------- Carga inicial de sesiones y distribución ----------

  useEffect(() => {
    setRecents(loadRecentProjects());
    setSessions(loadSessions());
    setActiveSessionId(loadActiveSessionId());
    setSessionsReady(true);
    try {
      const savedView = localStorage.getItem(VIEW_KEY);
      if (savedView === "chat" || savedView === "code") setView(savedView);
    } catch {
      // sin almacenamiento: vista por defecto
    }
    if (window.innerWidth < 1250) setRightOpen(false);
    if (window.innerWidth < 900) setLeftOpen(false);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // nada
    }
  }, [view]);

  useEffect(() => {
    if (!sessionsReady) return;
    const timer = window.setTimeout(() => saveSessions(sessions), 400);
    return () => window.clearTimeout(timer);
  }, [sessions, sessionsReady]);

  useEffect(() => {
    if (sessionsReady) saveActiveSessionId(activeSessionId);
  }, [activeSessionId, sessionsReady]);

  useEffect(() => {
    if (projectInfo?.path) setRecents(rememberProject({ path: projectInfo.path, name: projectInfo.name }));
  }, [projectInfo?.path, projectInfo?.name]);

  // Al abrir: sesión activa del proyecto actual (o una nueva).
  useEffect(() => {
    if (!sessionsReady || !projectInfo || initializedRef.current) return;
    initializedRef.current = true;
    const current = sessions.find((s) => s.id === activeSessionId);
    if (current && current.projectPath === projectInfo.path) return;
    const latest = sessions
      .filter((s) => s.projectPath === projectInfo.path)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latest) {
      setActiveSessionId(latest.id);
    } else {
      const created = newSession(projectInfo.path, projectInfo.name);
      setSessions((prev) => [...prev, created]);
      setActiveSessionId(created.id);
    }
  }, [sessionsReady, projectInfo, sessions, activeSessionId]);

  // Conversación del agente de la sesión activa
  useEffect(() => {
    if (!activeSessionId) return;
    transcriptRef.current = loadTranscript(activeSessionId);
    setContextTokens(transcriptTokens(transcriptRef.current));
    setInput("");
  }, [activeSessionId]);

  const updateSession = useCallback((id: string, updater: (session: CodeSession) => CodeSession) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
  }, []);

  // ---------- Archivos ----------

  const openFile = async (path: string) => {
    try {
      const file = await client.readFile(path);
      setSelectedFile(file);
      setActiveTab("editor");
      setView("code");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo leer el archivo.");
    }
  };

  const saveFile = async (path: string, content: string) => {
    try {
      const result = await client.writeFile(path, content);
      setSelectedFile({ path: result.path, content: result.content, modifiedAt: Date.now(), size: result.content.length });
      await refreshProject();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el archivo.");
    }
  };

  const runCommand = async (command: string) => {
    try {
      setActiveTab("terminal");
      await client.runCommand(command, ".", "user");
      await refreshProject();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo ejecutar el comando.");
    }
  };

  const createFile = (path: string) => {
    setPendingTextPrompt({
      title: "Nuevo archivo",
      label: "Ruta relativa",
      initialValue: path,
      confirmLabel: "Crear",
      onConfirm: async (target) => {
        setPendingTextPrompt(null);
        await saveFile(target, "");
        await openFile(target);
      },
    });
  };

  const createFolder = (path: string) => {
    setPendingTextPrompt({
      title: "Nueva carpeta",
      label: "Ruta relativa",
      initialValue: path.replace(/\/\.gitkeep$/, ""),
      confirmLabel: "Crear",
      onConfirm: async (target) => {
        setPendingTextPrompt(null);
        await saveFile(`${target.replace(/\/$/, "")}/.gitkeep`, "");
      },
    });
  };

  const requestRename = (from: string) => {
    setPendingTextPrompt({
      title: "Renombrar",
      label: "Nueva ruta",
      initialValue: from,
      confirmLabel: "Renombrar",
      onConfirm: async (to) => {
        setPendingTextPrompt(null);
        if (to === from) return;
        try {
          const result = await client.renameFile(from, to);
          if (selectedFile?.path === from) await openFile(result.to);
          await refreshProject();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "No se pudo renombrar.");
        }
      },
    });
  };

  const deleteFile = (path: string) => {
    setPendingConfirm({
      title: "Eliminar archivo",
      description: `Se eliminará ${path}. Esta acción necesita confirmación explícita.`,
      onConfirm: async () => {
        setPendingConfirm(null);
        try {
          await client.deleteFile(path, true);
          if (selectedFile?.path === path) setSelectedFile(null);
          await refreshProject();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
        }
      },
    });
  };

  const commitWithAi = async () => {
    if (!gitPatch.trim()) return;
    let message = "chore: update project with NimChat Code";
    if (settings.apiKey) {
      try {
        message = await generateCommitMessage(settings.apiKey, settings.selectedModel, gitPatch);
      } catch {
        // mensaje de respaldo
      }
    }
    setPendingTextPrompt({
      title: "Commit con mensaje IA",
      label: "Mensaje",
      initialValue: message,
      confirmLabel: "Commit",
      onConfirm: async (confirmed) => {
        setPendingTextPrompt(null);
        try {
          await client.gitCommit(confirmed);
          await refreshProject();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "No se pudo crear el commit.");
        }
      },
    });
  };

  const discardChanges = () => {
    setPendingConfirm({
      title: "Descartar cambios",
      description: "Se descartarán los cambios del working tree mediante git checkout. Revisa el diff antes de confirmar.",
      onConfirm: async () => {
        setPendingConfirm(null);
        try {
          await client.gitDiscard([], true);
          setSelectedFile(null);
          await refreshProject();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "No se pudieron descartar los cambios.");
        }
      },
    });
  };

  // ---------- Proyectos y sesiones ----------

  const blockedWhileRunning = () => {
    if (!running) return false;
    setError("Detén el agente antes de cambiar de proyecto.");
    return true;
  };

  /** Cambia el proyecto activo del servidor local; no toca las sesiones. */
  const switchProject = async (dir: string): Promise<ProjectInfo | null> => {
    if (blockedWhileRunning()) return null;
    try {
      await client.openProject(dir);
      setSelectedFile(null);
      setTerminalEvents([]);
      return await refreshProject();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el proyecto.");
      return null;
    }
  };

  const startSession = (path: string, name: string) => {
    const created = newSession(path, name);
    setSessions((prev) => [...prev, created]);
    setActiveSessionId(created.id);
    setView("chat");
  };

  /** Tras abrir una carpeta: vuelve a su última sesión o crea una. */
  const enterProject = (info: ProjectInfo) => {
    const latest = sessions.filter((s) => s.projectPath === info.path).sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latest) setActiveSessionId(latest.id);
    else startSession(info.path, info.name);
  };

  const selectSession = async (session: CodeSession) => {
    if (session.projectPath !== projectInfo?.path) {
      const info = await switchProject(session.projectPath);
      if (!info) return;
    }
    setActiveSessionId(session.id);
  };

  const requestNewSession = async (project: RecentProject) => {
    if (project.path !== projectInfo?.path) {
      const info = await switchProject(project.path);
      if (!info) return;
    } else if (activeSession && activeSession.projectPath === project.path && activeSession.feed.length === 0) {
      return; // ya hay una sesión vacía abierta
    }
    startSession(project.path, project.name);
  };

  const deleteSession = (session: CodeSession) => {
    if (session.id === runningId) {
      setError("Detén el agente antes de borrar esta sesión.");
      return;
    }
    deleteTranscript(session.id);
    const remaining = sessions.filter((s) => s.id !== session.id);
    setSessions(remaining);
    if (session.id === activeSessionId) {
      const sameProject = remaining.filter((s) => s.projectPath === session.projectPath).sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (sameProject) setActiveSessionId(sameProject.id);
      else startSession(session.projectPath, session.projectName);
    }
  };

  const askForPath = (title: string, label: string, onPath: (value: string) => void) => {
    setPendingTextPrompt({
      title,
      description: "Introduce la ruta absoluta.",
      label,
      initialValue: projectInfo?.path ?? "",
      confirmLabel: "Abrir",
      onConfirm: (value) => {
        setPendingTextPrompt(null);
        onPath(value.trim());
      },
    });
  };

  const openFolder = async () => {
    const open = async (dir: string) => {
      const info = await switchProject(dir);
      if (info) enterProject(info);
    };
    const desktop = getDesktop();
    if (desktop) {
      const dir = await desktop.pickFolder();
      if (dir) await open(dir);
      return;
    }
    askForPath("Abrir carpeta", "Ruta de la carpeta", (value) => void open(value));
  };

  const openFileFromDisk = async () => {
    const handle = async (fullPath: string) => {
      if (!fullPath) return;
      const root = (projectInfo?.path ?? "").replace(/\\/g, "/").replace(/\/$/, "");
      const normalized = fullPath.replace(/\\/g, "/");
      if (root && normalized.startsWith(`${root}/`)) {
        await openFile(normalized.slice(root.length + 1));
        return;
      }
      // Fuera del proyecto actual: se abre su carpeta como proyecto.
      const { dir, base } = splitPath(fullPath);
      const info = await switchProject(dir);
      if (info) {
        enterProject(info);
        await openFile(base);
      }
    };
    const desktop = getDesktop();
    if (desktop) {
      const picked = await desktop.pickFile();
      if (picked) await handle(picked);
      return;
    }
    askForPath("Abrir archivo", "Ruta del archivo", (value) => void handle(value));
  };

  // ---------- Agente ----------

  const runAgent = async (text: string, isContinue = false) => {
    if (!settings.apiKey) {
      onOpenSettings();
      return;
    }
    const session = activeSession;
    const task = text.trim();
    if (!session || !task || running) return;

    const id = session.id;
    const useAgents = wantsAgents(task) || (isContinue && Boolean(session.agentsMode));
    const controller = new AbortController();
    abortRef.current = controller;
    setRunningId(id);
    setStatus(null);
    setError(null);
    setArtifacts([]);
    setInput("");
    updateSession(id, (s) => ({
      ...s,
      title: s.title === "Nueva sesión" ? titleFromPrompt(task) : s.title,
      stopReason: undefined,
      agentsMode: useAgents || s.agentsMode,
      updatedAt: Date.now(),
      feed: [...s.feed, { id: uid("u"), kind: "user", text: isContinue ? "Continuar" : task, at: Date.now() }],
    }));

    try {
      const result = await runAgentLoop({
        task,
        resume: transcriptRef.current.length > 0 ? transcriptRef.current : undefined,
        apiKey: settings.apiKey,
        model: settings.selectedModel,
        params: { ...settings.params, maxTokens: codeMaxTokens },
        serverUrl: DEFAULT_LOCAL_SERVER_URL,
        maxIterations: settings.agentMaxIterations,
        requestDelayMs: Math.max(0, settings.requestDelaySeconds) * 1000,
        compactAtTokens: compactAt,
        signal: controller.signal,
        onAction: (action) =>
          updateSession(id, (s) => ({ ...s, feed: upsertAction(s.feed, action), updatedAt: Date.now() })),
        onStatus: setStatus,
        onArtifacts: setArtifacts,
        onMessages: (messages) => {
          transcriptRef.current = messages;
          saveTranscript(id, messages);
          setContextTokens(transcriptTokens(messages));
        },
        onAgentUpdate: (agent: AgentInfo) =>
          updateSession(id, (s) => ({
            ...s,
            agents: s.agents.some((a) => a.name === agent.name)
              ? s.agents.map((a) => (a.name === agent.name ? agent : a))
              : [...s.agents, agent],
          })),
        agents: useAgents
          ? {
              models: catalogModels,
              onAgentMessage: (message: AgentMessageEvent) =>
                updateSession(id, (s) => ({ ...s, agentMessages: [...s.agentMessages, message] })),
            }
          : undefined,
      });

      transcriptRef.current = result.messages;
      saveTranscript(id, result.messages);
      setContextTokens(transcriptTokens(result.messages));
      updateSession(id, (s) => ({
        ...s,
        stopReason: result.stopReason,
        updatedAt: Date.now(),
        feed:
          result.stopReason === "done"
            ? s.feed
            : [
                ...s.feed,
                {
                  id: uid("n"),
                  kind: "notice",
                  at: Date.now(),
                  tone: result.stopReason === "error" ? "error" : result.stopReason === "aborted" ? "info" : "warn",
                  text: result.summary,
                },
              ],
      }));
      await refreshProject();
      if (selectedFile) await openFile(selectedFile.path).catch(() => undefined);
      setRefreshSignal((value) => value + 1);
    } finally {
      setRunningId(null);
      setStatus(null);
      abortRef.current = null;
    }
  };

  const stopAgent = () => abortRef.current?.abort();

  const compactNow = async () => {
    if (!settings.apiKey || !activeSession || running) return;
    setCompacting(true);
    try {
      const compacted = await compactTranscriptNow({
        transcript: transcriptRef.current,
        apiKey: settings.apiKey,
        model: settings.selectedModel,
        params: { ...settings.params, maxTokens: resolveMaxTokens({ settings, mode: "code" }) },
        serverUrl: DEFAULT_LOCAL_SERVER_URL,
      });
      const id = activeSession.id;
      if (compacted) {
        transcriptRef.current = compacted.messages;
        saveTranscript(id, compacted.messages);
        setContextTokens(transcriptTokens(compacted.messages));
        updateSession(id, (s) => ({
          ...s,
          feed: [...s.feed, { id: uid("n"), kind: "notice", tone: "info", at: Date.now(), text: "Contexto compactado. Resumen guardado en context_agent.md." }],
        }));
        setRefreshSignal((value) => value + 1);
        await refreshProject();
      } else {
        setError("No hay suficiente conversación para compactar.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo compactar el contexto.");
    } finally {
      setCompacting(false);
    }
  };

  const canContinue =
    Boolean(activeSession?.stopReason) && activeSession?.stopReason !== "done" && transcriptRef.current.length > 0;

  const chat = (compact: boolean) => (
    <CodeChat
      feed={activeSession?.feed ?? []}
      input={input}
      onInputChange={setInput}
      onSend={() => void runAgent(input)}
      onStop={stopAgent}
      onContinue={() => void runAgent(CONTINUE_TEXT, true)}
      running={running}
      status={status}
      canContinue={canContinue}
      disabled={!connected || !activeSession}
      model={settings.selectedModel}
      onModelChange={onModelChange}
      compact={compact}
    />
  );

  return (
    <div className="flex h-full min-h-0 bg-background text-white">
      {leftOpen && (
        <div className="w-[250px] shrink-0">
          <ProjectSidebar
            sessions={sessions}
            recents={recents}
            activeSessionId={activeSessionId}
            activeProjectPath={projectInfo?.path}
            runningSessionId={runningId}
            onSelectSession={(session) => void selectSession(session)}
            onNewSession={(project) => void requestNewSession(project)}
            onDeleteSession={deleteSession}
            onOpenFolder={() => void openFolder()}
            onOpenFile={() => void openFileFromDisk()}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-2">
          <div className="flex min-w-0 items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setLeftOpen((v) => !v)} aria-label="Mostrar u ocultar proyectos">
              <PanelLeft className="h-4 w-4" />
            </Button>
            <span className="truncate text-[13px] text-white/85">{activeSession?.title ?? projectInfo?.name ?? "NimChat Code"}</span>
            {projectInfo?.branch && (
              <span className="ui-mono hidden shrink-0 items-center gap-1 text-[11px] text-white/35 md:inline-flex">
                <GitBranch className="h-3 w-3" />
                {projectInfo.branch}
                {projectInfo.changedFiles > 0 && ` · ${projectInfo.changedFiles}`}
              </span>
            )}
            {!connected && <span className="ui-mono shrink-0 text-[11px] text-red-300">servidor sin conexión</span>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="ui-mono flex items-center gap-px rounded-md border border-border p-0.5 text-[11px]">
              {(
                [
                  { id: "chat", label: "chat", icon: <MessageSquare className="h-3 w-3" /> },
                  { id: "code", label: "código", icon: <Code2 className="h-3 w-3" /> },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 transition-colors",
                    view === item.id ? "bg-nim-yellow text-black" : "text-white/50 hover:text-white"
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
            <Button size="icon" variant="ghost" onClick={() => void refreshProject()} aria-label="Actualizar">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setRightOpen((v) => !v)} aria-label="Mostrar u ocultar agentes, contexto y conectores">
              <PanelRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {error && (
          <div className="mx-3 mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1 break-words">{error}</div>
            <button type="button" onClick={() => setError(null)} className="text-red-100/60 hover:text-white" aria-label="Cerrar">
              ×
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1">
          {view === "chat" ? (
            chat(false)
          ) : (
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(280px,40%)]">
              <div className="grid min-h-0 grid-cols-[200px_minmax(0,1fr)] border-b border-border">
                <FileExplorer
                  entries={entries}
                  selectedPath={selectedFile?.path}
                  onSelectFile={openFile}
                  onRefresh={() => void refreshProject()}
                  onNewFile={createFile}
                  onNewFolder={createFolder}
                  onRename={requestRename}
                  onDelete={deleteFile}
                  onOpenTerminal={(path) => {
                    setActiveTab("terminal");
                    void runCommand(`cd ${JSON.stringify(path)}`);
                  }}
                />
                <CodeEditor
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  file={selectedFile}
                  onSaveFile={saveFile}
                  terminalEvents={terminalEvents}
                  onRunCommand={runCommand}
                  gitPatch={gitPatch}
                  gitStat={gitStat}
                  onCommit={commitWithAi}
                  onDiscard={discardChanges}
                  disabled={!connected || running}
                />
              </div>
              {chat(true)}
            </div>
          )}
        </div>
      </div>

      {rightOpen && (
        <div className="w-[320px] shrink-0">
          <SidePanel
            client={client}
            projectKey={projectInfo?.path ?? ""}
            agents={activeSession?.agents ?? []}
            agentMessages={activeSession?.agentMessages ?? []}
            running={running}
            contextTokens={contextTokens}
            compactAt={compactAt}
            artifacts={artifacts}
            compacting={compacting}
            onCompact={() => void compactNow()}
            onOpenContextFile={() => void openFile("context_agent.md")}
            connectedCount={connectedConnectors}
            onConnectorsChange={(servers: McpServerInfo[]) => setConnectedConnectors(servers.filter((s) => s.status === "connected").length)}
            refreshSignal={refreshSignal}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title ?? "Confirmar"}
        description={pendingConfirm?.description ?? ""}
        onConfirm={() => pendingConfirm?.onConfirm()}
        onCancel={() => setPendingConfirm(null)}
      />
      <TextPromptDialog
        open={Boolean(pendingTextPrompt)}
        title={pendingTextPrompt?.title ?? ""}
        description={pendingTextPrompt?.description}
        label={pendingTextPrompt?.label ?? "Valor"}
        initialValue={pendingTextPrompt?.initialValue ?? ""}
        confirmLabel={pendingTextPrompt?.confirmLabel}
        onConfirm={(value) => pendingTextPrompt?.onConfirm(value)}
        onCancel={() => setPendingTextPrompt(null)}
      />
    </div>
  );
}

async function generateCommitMessage(apiKey: string, model: string, patch: string) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-nvidia-api-key": apiKey },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0.2,
      max_tokens: 80,
      messages: [
        { role: "system", content: "Return only one concise conventional commit message in English." },
        { role: "user", content: patch.slice(0, 8000) },
      ],
    }),
  });
  if (!response.ok) throw new Error("No commit message");
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim()?.split("\n")[0] || "chore: update project";
}
