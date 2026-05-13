export const DEFAULT_LOCAL_SERVER_URL = "http://localhost:4177";

export type FileKind = "file" | "directory";
export type GitFileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked";

export interface FileEntry {
  name: string;
  path: string;
  type: FileKind;
  size: number;
  modifiedAt: number;
  gitStatus?: GitFileStatus;
  children?: FileEntry[];
}

export interface ProjectInfo {
  name: string;
  path: string;
  branch: string | null;
  isGitRepository: boolean;
  changedFiles: number;
  language: string;
}

export interface ReadFileResult {
  path: string;
  content: string;
  modifiedAt: number;
  size: number;
}

export interface CommandResult {
  id: string;
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

export interface GitDiffResult {
  diff: string;
  patch: string;
}

export interface TerminalEvent {
  id: string;
  type: "start" | "stdout" | "stderr" | "exit" | "error";
  source: "agent" | "user";
  command: string;
  cwd: string;
  data?: string;
  exitCode?: number | null;
  timestamp: number;
}

export class LocalServerError extends Error {
  status: number;
  details: unknown;
  requiresConfirmation: boolean;

  constructor(status: number, message: string, details: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.requiresConfirmation = Boolean((details as { requiresConfirmation?: boolean })?.requiresConfirmation);
  }
}

export class NimChatServerClient {
  baseUrl: string;

  constructor(baseUrl = DEFAULT_LOCAL_SERVER_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async health() {
    return this.request<{ ok: boolean; root: string; port: number }>("/api/health");
  }

  async getProjectInfo() {
    return this.request<ProjectInfo>("/api/project/info");
  }

  async openProject(path: string) {
    return this.request<{ ok: true; root: string; name: string }>("/api/project/open", {
      method: "POST",
      body: JSON.stringify({ path }),
    });
  }

  async listFiles(path = ".", recursive = false) {
    const params = new URLSearchParams({ path, recursive: String(recursive) });
    return this.request<{ root: string; path: string; entries: FileEntry[] }>(`/api/files?${params}`);
  }

  async readFile(path: string) {
    const params = new URLSearchParams({ path });
    return this.request<ReadFileResult>(`/api/files/read?${params}`);
  }

  async writeFile(path: string, content: string) {
    return this.request<{ path: string; previous: string | null; content: string }>("/api/files/write", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    });
  }

  async editFile(path: string, startLine: number, endLine: number, newContent: string) {
    return this.request<{ path: string; previous: string; content: string; startLine: number; endLine: number }>("/api/files/edit", {
      method: "POST",
      body: JSON.stringify({ path, startLine, endLine, newContent }),
    });
  }

  async renameFile(from: string, to: string) {
    return this.request<{ ok: true; from: string; to: string }>("/api/files/rename", {
      method: "POST",
      body: JSON.stringify({ from, to }),
    });
  }

  async deleteFile(path: string, confirm = false) {
    const params = new URLSearchParams({ path, confirm: String(confirm) });
    return this.request<{ ok: true; path: string }>(`/api/files?${params}`, { method: "DELETE" });
  }

  async runCommand(command: string, cwd = ".", source: "agent" | "user" = "user", confirm = false) {
    return this.request<CommandResult>("/api/terminal/exec", {
      method: "POST",
      body: JSON.stringify({ command, cwd, source, confirm }),
    });
  }

  async gitStatus() {
    return this.request<any>("/api/git/status");
  }

  async gitDiff() {
    return this.request<GitDiffResult>("/api/git/diff");
  }

  async gitCommit(message: string) {
    return this.request<any>("/api/git/commit", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  async gitDiscard(files: string[] = [], confirm = false) {
    return this.request<{ ok: true; files: string[] }>("/api/git/discard", {
      method: "POST",
      body: JSON.stringify({ files, confirm }),
    });
  }

  createTerminalSocket(onEvent: (event: TerminalEvent) => void) {
    const wsUrl = this.baseUrl.replace(/^http/, "ws") + "/ws/terminal";
    const socket = new WebSocket(wsUrl);
    socket.addEventListener("message", (event) => {
      try {
        onEvent(JSON.parse(event.data));
      } catch {
        // Ignore malformed terminal events.
      }
    });
    return socket;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    const parsed = text ? safeParseJson(text) : null;
    if (!response.ok) {
      const message = (parsed as { error?: string })?.error || response.statusText || "Error del servidor local";
      throw new LocalServerError(response.status, message, parsed);
    }
    return parsed as T;
  }
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
