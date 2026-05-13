import fs from "node:fs";
import path from "node:path";

export interface ProjectState {
  root: string;
}

export class ServerError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function normalizeRoot(root: string) {
  const resolved = path.resolve(root);
  if (!fs.existsSync(resolved)) {
    throw new ServerError(404, "El directorio del proyecto no existe.");
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new ServerError(400, "La ruta del proyecto debe ser un directorio.");
  }
  return resolved;
}

export function resolveProjectPath(root: string, inputPath = ".") {
  const decoded = decodeURIComponent(inputPath || ".");
  const target = path.resolve(root, decoded);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ServerError(403, "Ruta fuera del proyecto bloqueada.", "PATH_TRAVERSAL");
  }
  return target;
}

export function toProjectPath(root: string, absolutePath: string) {
  const relative = path.relative(root, absolutePath).replace(/\\/g, "/");
  return relative ? `./${relative}` : ".";
}

export function getPathKind(absolutePath: string) {
  const stats = fs.statSync(absolutePath);
  return {
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    size: stats.size,
    modifiedAt: stats.mtimeMs,
  };
}

export function isIgnoredEntry(name: string) {
  return name === "node_modules" || name === ".git" || name === ".next" || name === "dist" || name === "build" || name === "opencode";
}

export function isDangerousCommand(command: string) {
  const normalized = command.toLowerCase().replace(/\s+/g, " ").trim();
  const patterns = [
    /(^|\s)(rm|del|erase)\s+.*(-r|-rf|\/s|\/q)/,
    /(^|\s)rmdir\s+.*(\/s|-r)/,
    /remove-item\s+.*(-recurse|-force)/,
    /git\s+reset\s+--hard/,
    /git\s+clean\s+(-f|-xfd|-fd)/,
    /drop\s+database/,
    /drop\s+table/,
    /format\s+[a-z]:/,
    /shutdown\b/,
    /mkfs\b/,
  ];
  return patterns.some((pattern) => pattern.test(normalized));
}

export function safeJsonError(error: unknown) {
  if (error instanceof ServerError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }
  const message = error instanceof Error ? error.message : "Error desconocido";
  return { status: 500, body: { error: message } };
}
