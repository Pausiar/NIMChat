import express, { type Router } from "express";
import type { McpManager } from "../mcp/manager";
import { safeJsonError } from "../utils/security";

export function createMcpRouter(manager: McpManager): Router {
  const router = express.Router();

  router.get("/servers", (_req, res) => {
    res.json({ servers: manager.list() });
  });

  router.post("/servers", async (req, res) => {
    try {
      const id = await manager.upsert(req.body ?? {});
      res.json({ ok: true, id });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.delete("/servers/:id", async (req, res) => {
    try {
      await manager.remove(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.post("/servers/:id/reconnect", async (req, res) => {
    try {
      await manager.disconnect(req.params.id);
      await manager.connect(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.get("/tools", async (_req, res) => {
    try {
      res.json({ tools: await manager.toolsForAgent() });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.post("/call", async (req, res) => {
    try {
      const { serverId, tool, arguments: args } = req.body ?? {};
      if (typeof serverId !== "string" || typeof tool !== "string") {
        res.status(400).json({ error: "serverId y tool son obligatorios." });
        return;
      }
      res.json(await manager.call(serverId, tool, args && typeof args === "object" ? args : {}));
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  return router;
}
