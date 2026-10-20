"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, GitBranch, Loader2, Plug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppSettings } from "@/lib/chat-storage";
import { NimChatServerClient, DEFAULT_LOCAL_SERVER_URL, type FileEntry, type ProjectInfo, type ReadFileResult, type TerminalEvent } from "@/lib/server-client";
import { runAgentLoop } from "@/lib/agent-loop";
import type { AgentAction } from "@/lib/tools";
import { wantsAgents, type AgentInfo, type AgentMessageEvent } from "@/lib/agents";
import { useModelCatalog } from "@/lib/use-model-catalog";
import { resolveMaxTokens } from "@/lib/token-policy";
import { FileExplorer } from "./FileExplorer";
import { CodeEditor, type CodeCenterTab } from "./CodeEditor";
import { AgentPanel } from "./AgentPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { TextPromptDialog } from "./TextPromptDialog";
import { ProjectMenu } from "./ProjectMenu";
import { ConnectorsDialog } from "./ConnectorsDialog";
import { getDesktop, splitPath } from "@/lib/desktop";
import { loadRecentProjects, rememberProject, type RecentProject } from "@/lib/recent-projects";

interface CodeModeProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onModelChange: (id: string) => void;
}

export function CodeMode({ settings, onOpenSettings, onModelChange }: CodeModeProps) {
  const [serverUrl] = useState(DEFAULT_LOCAL_SERVER_URL);
  const client = useMemo(() => new NimChatServerClient(serverUrl), [serverUrl]);
  const [connected, setConnected] = useState(false);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<ReadFileResult | null>(null);
  const [activeTab, setActiveTab] = useState<CodeCenterTab>("editor");
  const [terminalEvents, setTerminalEvents] = useState<TerminalEvent[]>([]);
  const [gitPatch, setGitPatch] = useState("");
  const [gitStat, setGitStat] = useState("");
  const [task, setTask] = useState("");
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentMessages, setAgentMessages] = useState<AgentMessageEvent[]>([]);
  const { models: catalogModels } = useModelCatalog();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [summary, setSummary] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const [pendingTextPrompt, setPendingTextPrompt] = useState<{
    title: string;
    description?: string;
    label: string;
    initialValue: string;
    confirmLabel?: string;
    onConfirm: (value: string) => void | Promise<void>;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [recents, setRecents] = useState<RecentProject[]>([]);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [connectedConnectors, setConnectedConnectors] = useState(0);

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
      client
        .listMcpServers()
        .then((list) => setConnectedConnectors(list.filter((server) => server.status === "connected").length))
        .catch(() => undefined);
      setEntries(tree.entries);
      setGitStat(diff.diff);
      setGitPatch(diff.patch);
      setError(null);
    } catch (cause) {
      setConnected(false);
      setError(cause instanceof Error ? cause.message : "No se pudo conectar con nimchat-server.");
    }
  }, [client]);

  useEffect(() => {
    refreshProject();
  }, [refreshProject]);

  useEffect(() => {
    setRecents(loadRecentProjects());
  }, []);

  useEffect(() => {
    if (projectInfo?.path) setRecents(rememberProject({ path: projectInfo.path, name: projectInfo.name }));
  }, [projectInfo?.path, projectInfo?.name]);

  // Restaurar estado del Code Mode (tarea, acciones, summary) por proyecto.
  useEffect(() => {
    if (!projectInfo?.path || restored) return;
    try {
      const raw = window.localStorage.getItem(`nimchat:code:state:${projectInfo.path}`);
      if (raw) {
        const data = JSON.parse(raw) as {
          task?: string;
          actions?: AgentAction[];
          summary?: string;
        };
        if (typeof data.task === "string") setTask(data.task);
        if (Array.isArray(data.actions)) setActions(data.actions);
        if (typeof data.summary === "string") setSummary(data.summary);
      }
    } catch {
      // Ignorar JSON corrupto.
    }
    setRestored(true);
  }, [projectInfo?.path, restored]);

  // Persistir en cada cambio relevante.
  useEffect(() => {
    if (!projectInfo?.path || !restored) return;
    try {
      window.localStorage.setItem(
        `nimchat:code:state:${projectInfo.path}`,
        JSON.stringify({ task, actions, summary }),
      );
    } catch {
      // Ignorar cuotas.
    }
  }, [projectInfo?.path, restored, task, actions, summary]);

  useEffect(() => {
    if (!connected) return;
    const socket = client.createTerminalSocket((event) => {
      setTerminalEvents((current) => [...current.slice(-300), event]);
    });
    return () => socket.close();
  }, [client, connected]);

  const openFile = async (path: string) => {
    try {
      const file = await client.readFile(path);
      setSelectedFile(file);
      setActiveTab("editor");
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

  /** Cambia de proyecto sin arrastrar la tarea ni las acciones del anterior. */
  const switchProject = async (dir: string) => {
    try {
      await client.openProject(dir);
      setProjectInfo(null);
      setRestored(false);
      setSelectedFile(null);
      setTask("");
      setActions([]);
      setSummary(undefined);
      setAgents([]);
      setAgentMessages([]);
      setTerminalEvents([]);
      await refreshProject();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el proyecto.");
      return false;
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
    const desktop = getDesktop();
    if (desktop) {
      const dir = await desktop.pickFolder();
      if (dir) await switchProject(dir);
      return;
    }
    askForPath("Abrir carpeta", "Ruta de la carpeta", (value) => void switchProject(value));
  };

  const openFileFromDisk = async () => {
    const handle = async (fullPath: string) => {
      if (!fullPath) return;
      const root = projectInfo?.path ?? "";
      const normalize = (value: string) => value.replace(/\\/g, "/");
      if (root && normalize(fullPath).startsWith(`${normalize(root).replace(/\/$/, "")}/`)) {
        await openFile(normalize(fullPath).slice(normalize(root).replace(/\/$/, "").length + 1));
        return;
      }
      // Fuera del proyecto actual: se abre su carpeta como proyecto.
      const { dir, base } = splitPath(fullPath);
      if (await switchProject(dir)) await openFile(base);
    };
    const desktop = getDesktop();
    if (desktop) {
      const picked = await desktop.pickFile();
      if (picked) await handle(picked);
      return;
    }
    askForPath("Abrir archivo", "Ruta del archivo", (value) => void handle(value));
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

  const renameFile = async (from: string, to: string) => {
    try {
      const result = await client.renameFile(from, to);
      if (selectedFile?.path === from) await openFile(result.to);
      await refreshProject();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo renombrar.");
    }
  };

  const requestRename = (from: string) => {
    setPendingTextPrompt({
      title: "Renombrar",
      label: "Nueva ruta",
      initialValue: from,
      confirmLabel: "Renombrar",
      onConfirm: async (to) => {
        setPendingTextPrompt(null);
        if (to !== from) await renameFile(from, to);
      },
    });
  };

  const deleteFile = async (path: string) => {
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

  const runCommand = async (command: string) => {
    try {
      setActiveTab("terminal");
      await client.runCommand(command, ".", "user");
      await refreshProject();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo ejecutar el comando.");
    }
  };

  const runAgent = async () => {
    if (!settings.apiKey) {
      onOpenSettings();
      return;
    }
    if (!task.trim() || isRunning) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setIsPaused(false);
    setSummary(undefined);
    setError(null);
    setActions([]);
    setAgents([]);
    setAgentMessages([]);

    try {
      await runAgentLoop({
        task,
        apiKey: settings.apiKey,
        model: settings.selectedModel,
        params: {
          ...settings.params,
          maxTokens: resolveMaxTokens({ settings, mode: "code" }),
        },
        serverUrl,
        signal: controller.signal,
        agents: wantsAgents(task)
          ? {
              models: catalogModels,
              onAgentUpdate: (agent) =>
                setAgents((current) =>
                  current.some((a) => a.name === agent.name)
                    ? current.map((a) => (a.name === agent.name ? agent : a))
                    : [...current, agent]
                ),
              onAgentMessage: (message) => setAgentMessages((current) => [...current, message]),
            }
          : undefined,
        onAction: (action) =>
          setActions((current) =>
            current.some((a) => a.id === action.id)
              ? current.map((a) => (a.id === action.id ? action : a))
              : [action, ...current]
          ),
        onComplete: (value) => setSummary(value),
      });
      await refreshProject();
      if (selectedFile) await openFile(selectedFile.path).catch(() => undefined);
    } catch (cause) {
      if ((cause as { name?: string })?.name !== "AbortError") {
        setError(cause instanceof Error ? cause.message : "El agente falló.");
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  };

  const cancelAgent = () => {
    abortRef.current?.abort();
    setIsRunning(false);
    setSummary("Ejecución cancelada por el usuario.");
  };

  const commitWithAi = async () => {
    if (!gitPatch.trim()) return;
    let message = "chore: update project with NimChat Code";
    if (settings.apiKey) {
      try {
        message = await generateCommitMessage(settings.apiKey, settings.selectedModel, gitPatch);
      } catch {
        // Fall back to a deterministic commit message.
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-white">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-2">
        <div className="flex min-w-0 items-center gap-2">
          <ProjectMenu
            projectName={projectInfo?.name ?? "sin proyecto"}
            recents={recents}
            onOpenFolder={openFolder}
            onOpenFile={openFileFromDisk}
            onOpenRecent={(project) => void switchProject(project.path)}
          />
          {projectInfo?.branch && (
            <span className="ui-mono hidden items-center gap-1 text-[11px] text-white/40 sm:inline-flex">
              <GitBranch className="h-3 w-3" />
              {projectInfo.branch}
              {projectInfo.changedFiles > 0 && ` · ${projectInfo.changedFiles} cambios`}
            </span>
          )}
          {!connected && <span className="ui-mono text-[11px] text-red-300">servidor sin conexión</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setConnectorsOpen(true)} className="ui-mono">
            <Plug className="h-3.5 w-3.5" />
            conectores
            {connectedConnectors > 0 && <span className="text-nim-yellow">{connectedConnectors}</span>}
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={refreshProject} aria-label="Actualizar">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {error && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
          {!connected && !getDesktop() && <span className="ui-mono text-xs text-red-100/60">npm run server</span>}
        </div>
      )}

      {!projectInfo && connected && (
        <div className="flex flex-1 items-center justify-center text-white/45">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando proyecto...
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_380px]">
        <FileExplorer
          entries={entries}
          selectedPath={selectedFile?.path}
          onSelectFile={openFile}
          onRefresh={refreshProject}
          onNewFile={createFile}
          onNewFolder={createFolder}
          onRename={requestRename}
          onDelete={deleteFile}
          onOpenTerminal={(path) => {
            setActiveTab("terminal");
            runCommand(`cd ${JSON.stringify(path)}`);
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
          disabled={!connected || isRunning}
        />
        <AgentPanel
          actions={actions}
          task={task}
          onTaskChange={setTask}
          onRun={runAgent}
          onPause={() => setIsPaused((value) => !value)}
          onCancel={cancelAgent}
          isRunning={isRunning}
          isPaused={isPaused}
          disabled={!connected}
          summary={summary}
          agents={agents}
          agentMessages={agentMessages}
          agentsMode={wantsAgents(task) || agents.length > 0}
          model={settings.selectedModel}
          onModelChange={onModelChange}
        />
      </div>

      <ConnectorsDialog
        open={connectorsOpen}
        onOpenChange={(value) => {
          setConnectorsOpen(value);
          if (!value) void refreshProject();
        }}
        client={client}
      />
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
