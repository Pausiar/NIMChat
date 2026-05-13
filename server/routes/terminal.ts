import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { Router } from "express";
import express from "express";
import { WebSocketServer, type WebSocket } from "ws";
import {
  isDangerousCommand,
  resolveProjectPath,
  safeJsonError,
  type ProjectState,
} from "../utils/security";

interface TerminalEvent {
  id: string;
  type: "start" | "stdout" | "stderr" | "exit" | "error";
  source: "agent" | "user";
  command: string;
  cwd: string;
  data?: string;
  exitCode?: number | null;
  timestamp: number;
}

const clients = new Set<WebSocket>();

export function attachTerminalWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/terminal" });
  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
  });
}

export function createTerminalRouter(state: ProjectState): Router {
  const router = express.Router();

  router.post("/exec", async (req, res) => {
    try {
      const { command, cwd = ".", source = "user", confirm = false } = req.body ?? {};
      if (!command || typeof command !== "string") {
        res.status(400).json({ error: "Falta command." });
        return;
      }
      if (isDangerousCommand(command) && !confirm) {
        res.status(409).json({ requiresConfirmation: true, action: "run_command", command });
        return;
      }
      const safeCwd = resolveProjectPath(state.root, String(cwd || "."));
      const result = await executeCommand(command, safeCwd, source === "agent" ? "agent" : "user");
      res.json(result);
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  return router;
}

function publish(event: TerminalEvent) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === client.OPEN) client.send(message);
  }
}

function executeCommand(command: string, cwd: string, source: "agent" | "user") {
  const id = randomUUID();
  const started = Date.now();
  let stdout = "";
  let stderr = "";

  publish({ id, type: "start", source, command, cwd, timestamp: started });

  return new Promise<{ id: string; command: string; cwd: string; stdout: string; stderr: string; exitCode: number | null; durationMs: number }>((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: process.env,
      windowsHide: true,
    });

    child.stdout?.on("data", (chunk) => {
      const data = chunk.toString();
      stdout += data;
      publish({ id, type: "stdout", source, command, cwd, data, timestamp: Date.now() });
    });

    child.stderr?.on("data", (chunk) => {
      const data = chunk.toString();
      stderr += data;
      publish({ id, type: "stderr", source, command, cwd, data, timestamp: Date.now() });
    });

    child.on("error", (error) => {
      const data = error.message;
      stderr += data;
      publish({ id, type: "error", source, command, cwd, data, timestamp: Date.now() });
    });

    child.on("close", (exitCode) => {
      publish({ id, type: "exit", source, command, cwd, exitCode, timestamp: Date.now() });
      resolve({ id, command, cwd, stdout: limitOutput(stdout), stderr: limitOutput(stderr), exitCode, durationMs: Date.now() - started });
    });
  });
}

function limitOutput(value: string, max = 60_000) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n...[output truncado]`;
}
