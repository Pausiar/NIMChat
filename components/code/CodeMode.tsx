"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, FolderOpen, GitBranch, KeyRound, Loader2, PlugZap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppSettings } from "@/lib/chat-storage";
import { NimChatServerClient, DEFAULT_LOCAL_SERVER_URL, type FileEntry, type ProjectInfo, type ReadFileResult, type TerminalEvent } from "@/lib/server-client";
import { runAgentLoop } from "@/lib/agent-loop";
import type { AgentAction } from "@/lib/tools";
import { getModel } from "@/lib/models";
import { FileExplorer } from "./FileExplorer";
import { CodeEditor, type CodeCenterTab } from "./CodeEditor";
import { AgentPanel } from "./AgentPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { TextPromptDialog } from "./TextPromptDialog";

interface CodeModeProps {
  settings: AppSettings;
  onOpenSettings: () => void;
}

export function CodeMode({ settings, onOpenSettings }: CodeModeProps) {
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
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [summary, setSummary] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
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
    } catch (cause) {
      setConnected(false);
      setError(cause instanceof Error ? cause.message : "No se pudo conectar con nimchat-server.");
    }
  }, [client]);

  useEffect(() => {
    refreshProject();
  }, [refreshProject]);

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

  const openProject = () => {
    setPendingTextPrompt({
      title: "Abrir proyecto",
      description: "Introduce la ruta absoluta del proyecto que debe controlar el servidor local.",
      label: "Ruta del proyecto",
      initialValue: projectInfo?.path ?? "",
      confirmLabel: "Abrir",
      onConfirm: async (nextPath) => {
        setPendingTextPrompt(null);
        try {
          await client.openProject(nextPath);
          setSelectedFile(null);
          await refreshProject();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "No se pudo abrir el proyecto.");
        }
      },
    });
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

    try {
      await runAgentLoop({
        task,
        apiKey: settings.apiKey,
        model: settings.selectedModel,
        params: settings.params,
        serverUrl,
        signal: controller.signal,
        onThought: () => undefined,
        onAction: (action) => setActions((current) => [action, ...current]),
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

  const model = getModel(settings.selectedModel);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a0b] pb-24 text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#0c0c0f]/95 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <PlugZap className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{projectInfo?.name ?? "NimChat Code"}</div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className={connected ? "text-emerald-300" : "text-red-300"}>{connected ? "server online" : "server offline"}</span>
              {projectInfo?.branch && (
                <span className="inline-flex items-center gap-1"><GitBranch className="h-3 w-3" /> {projectInfo.branch}</span>
              )}
              <span>{model.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!settings.apiKey && (
            <Button type="button" size="sm" variant="outline" onClick={onOpenSettings} className="border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:text-white">
              <KeyRound className="h-3.5 w-3.5" />
              API key
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={openProject} className="border-white/10 text-white/70 hover:text-white">
            <FolderOpen className="h-3.5 w-3.5" />
            Abrir proyecto
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={refreshProject} className="text-white/60 hover:text-white" aria-label="Actualizar Code Mode">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
          {!connected && <span className="text-red-100/60">Ejecuta npm run server</span>}
        </div>
      )}

      {!projectInfo && connected && (
        <div className="flex flex-1 items-center justify-center text-white/45">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando proyecto...
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[20%_50%_30%]">
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
        />
      </div>

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
