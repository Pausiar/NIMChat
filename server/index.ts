import http from "node:http";
import path from "node:path";
import express from "express";
import chokidar from "chokidar";
import simpleGit from "simple-git";
import { createFilesRouter } from "./routes/files";
import { attachTerminalWebSocket, createTerminalRouter } from "./routes/terminal";
import { createGitRouter } from "./routes/git";
import { normalizeRoot, safeJsonError, type ProjectState } from "./utils/security";

const PORT = Number(process.env.NIMCHAT_SERVER_PORT ?? 4177);
const state: ProjectState = {
  root: normalizeRoot(process.env.NIMCHAT_PROJECT_ROOT ?? process.cwd()),
};

const app = express();
const server = http.createServer(app);
attachTerminalWebSocket(server);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-nvidia-api-key");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, root: state.root, port: PORT });
});

app.get("/api/project/info", async (_req, res) => {
  try {
    const git = simpleGit(state.root);
    const branch = await git.branch().then((info) => info.current).catch(() => null);
    const status = await git.status().catch(() => null);
    res.json({
      name: path.basename(state.root),
      path: state.root,
      branch,
      isGitRepository: Boolean(status),
      changedFiles: status?.files.length ?? 0,
      language: await detectPrimaryLanguage(state.root),
    });
  } catch (error) {
    const { status, body } = safeJsonError(error);
    res.status(status).json(body);
  }
});

app.post("/api/project/open", async (req, res) => {
  try {
    const requestedPath = typeof req.body?.path === "string" && req.body.path.trim()
      ? req.body.path.trim()
      : state.root;
    state.root = normalizeRoot(requestedPath);
    res.json({ ok: true, root: state.root, name: path.basename(state.root) });
  } catch (error) {
    const { status, body } = safeJsonError(error);
    res.status(status).json(body);
  }
});

app.use("/api/files", createFilesRouter(state));
app.use("/api/terminal", createTerminalRouter(state));
app.use("/api/git", createGitRouter(state));

const watcher = chokidar.watch([], { ignoreInitial: true });
watcher.on("all", () => {
  // Reserved for future file-tree push updates. The UI currently refreshes on demand.
});

server.listen(PORT, () => {
  console.log(`NimChat local server running at http://localhost:${PORT}`);
  console.log(`Project root: ${state.root}`);
});

async function detectPrimaryLanguage(root: string) {
  const markers = [
    ["package.json", "TypeScript/JavaScript"],
    ["pyproject.toml", "Python"],
    ["requirements.txt", "Python"],
    ["Cargo.toml", "Rust"],
    ["go.mod", "Go"],
    ["pom.xml", "Java"],
  ] as const;
  const fs = await import("node:fs/promises");
  for (const [file, label] of markers) {
    try {
      await fs.access(path.join(root, file));
      return label;
    } catch {
      // continue
    }
  }
  return "Proyecto local";
}
