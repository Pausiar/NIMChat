import fs from "node:fs/promises";
import path from "node:path";
import type { Router } from "express";
import express from "express";
import simpleGit from "simple-git";
import {
  getPathKind,
  isIgnoredEntry,
  resolveProjectPath,
  safeJsonError,
  ServerError,
  toProjectPath,
  type ProjectState,
} from "../utils/security";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: number;
  gitStatus?: "modified" | "added" | "deleted" | "renamed" | "untracked";
  children?: FileEntry[];
}

export function createFilesRouter(state: ProjectState): Router {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const requestedPath = String(req.query.path ?? ".");
      const recursive = req.query.recursive === "true";
      const target = resolveProjectPath(state.root, requestedPath);
      const gitStatus = await getGitStatusMap(state.root);
      const entries = await listEntries(state.root, target, recursive, gitStatus);
      res.json({ root: state.root, path: toProjectPath(state.root, target), entries });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.get("/read", async (req, res) => {
    try {
      const requestedPath = String(req.query.path ?? "");
      if (!requestedPath) throw new ServerError(400, "Falta path.");
      const target = resolveProjectPath(state.root, requestedPath);
      const stats = getPathKind(target);
      if (!stats.isFile) throw new ServerError(400, "La ruta no es un archivo.");
      const content = await fs.readFile(target, "utf8");
      res.json({ path: toProjectPath(state.root, target), content, modifiedAt: stats.modifiedAt, size: stats.size });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.post("/write", async (req, res) => {
    try {
      const { path: requestedPath, content = "" } = req.body ?? {};
      if (!requestedPath || typeof requestedPath !== "string") throw new ServerError(400, "Falta path.");
      if (typeof content !== "string") throw new ServerError(400, "content debe ser string.");
      const target = resolveProjectPath(state.root, requestedPath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const previous = await fs.readFile(target, "utf8").catch(() => null);
      await fs.writeFile(target, content, "utf8");
      res.json({ path: toProjectPath(state.root, target), previous, content });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.post("/edit", async (req, res) => {
    try {
      const { path: requestedPath, startLine, endLine, newContent = "" } = req.body ?? {};
      if (!requestedPath || typeof requestedPath !== "string") throw new ServerError(400, "Falta path.");
      if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) {
        throw new ServerError(400, "startLine y endLine deben ser enteros.");
      }
      if (startLine < 1 || endLine < startLine) throw new ServerError(400, "Rango de lineas invalido.");
      if (typeof newContent !== "string") throw new ServerError(400, "newContent debe ser string.");

      const target = resolveProjectPath(state.root, requestedPath);
      const previous = await fs.readFile(target, "utf8");
      const lines = previous.split(/\r?\n/);
      lines.splice(startLine - 1, endLine - startLine + 1, ...newContent.split(/\r?\n/));
      const content = lines.join("\n");
      await fs.writeFile(target, content, "utf8");
      res.json({ path: toProjectPath(state.root, target), previous, content, startLine, endLine });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.post("/rename", async (req, res) => {
    try {
      const { from, to } = req.body ?? {};
      if (!from || typeof from !== "string") throw new ServerError(400, "Falta from.");
      if (!to || typeof to !== "string") throw new ServerError(400, "Falta to.");
      const source = resolveProjectPath(state.root, from);
      const target = resolveProjectPath(state.root, to);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.rename(source, target);
      res.json({ ok: true, from: toProjectPath(state.root, source), to: toProjectPath(state.root, target) });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.delete("/", async (req, res) => {
    try {
      const requestedPath = String(req.query.path ?? "");
      const confirmed = req.query.confirm === "true";
      if (!requestedPath) throw new ServerError(400, "Falta path.");
      if (!confirmed) {
        res.status(409).json({ requiresConfirmation: true, action: "delete_file", path: requestedPath });
        return;
      }
      const target = resolveProjectPath(state.root, requestedPath);
      const stats = getPathKind(target);
      if (stats.isDirectory) {
        const children = await fs.readdir(target);
        if (children.length > 0) throw new ServerError(409, "No se elimina una carpeta no vacia desde el agente.", "NON_EMPTY_DIRECTORY");
        await fs.rmdir(target);
      } else {
        await fs.unlink(target);
      }
      res.json({ ok: true, path: toProjectPath(state.root, target) });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  return router;
}

async function listEntries(root: string, target: string, recursive: boolean, gitStatus: Map<string, FileEntry["gitStatus"]>) {
  const stats = getPathKind(target);
  if (!stats.isDirectory) throw new ServerError(400, "La ruta no es un directorio.");
  const dirents = await fs.readdir(target, { withFileTypes: true });
  const entries: FileEntry[] = [];

  for (const dirent of dirents) {
    if (isIgnoredEntry(dirent.name)) continue;
    const absolutePath = path.join(target, dirent.name);
    const kind = getPathKind(absolutePath);
    const projectPath = toProjectPath(root, absolutePath);
    const entry: FileEntry = {
      name: dirent.name,
      path: projectPath,
      type: kind.isDirectory ? "directory" : "file",
      size: kind.size,
      modifiedAt: kind.modifiedAt,
      gitStatus: gitStatus.get(projectPath.replace(/^\.\//, "")),
    };
    if (recursive && kind.isDirectory) {
      entry.children = await listEntries(root, absolutePath, true, gitStatus);
    }
    entries.push(entry);
  }

  return entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function getGitStatusMap(root: string) {
  const map = new Map<string, FileEntry["gitStatus"]>();
  try {
    const status = await simpleGit(root).status();
    for (const file of status.files) {
      const value = file.index === "D" || file.working_dir === "D"
        ? "deleted"
        : file.index === "A" || file.working_dir === "?"
          ? file.working_dir === "?" ? "untracked" : "added"
          : file.index === "R" ? "renamed" : "modified";
      map.set(file.path.replace(/\\/g, "/"), value);
    }
  } catch {
    // Project might not be a git repository.
  }
  return map;
}
