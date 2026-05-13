import type { Router } from "express";
import express from "express";
import simpleGit from "simple-git";
import { resolveProjectPath, safeJsonError, type ProjectState } from "../utils/security";

export function createGitRouter(state: ProjectState): Router {
  const router = express.Router();

  router.get("/status", async (_req, res) => {
    try {
      const git = simpleGit(state.root);
      const status = await git.status();
      res.json(status);
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.get("/diff", async (_req, res) => {
    try {
      const git = simpleGit(state.root);
      const diff = await git.diff(["--stat"]);
      const patch = await git.diff();
      res.json({ diff, patch });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.post("/commit", async (req, res) => {
    try {
      const { message } = req.body ?? {};
      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "Falta message." });
        return;
      }
      const git = simpleGit(state.root);
      await git.add(".");
      const result = await git.commit(message);
      res.json(result);
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  router.post("/discard", async (req, res) => {
    try {
      const { files = [], confirm = false } = req.body ?? {};
      if (!confirm) {
        res.status(409).json({ requiresConfirmation: true, action: "git_discard", files });
        return;
      }
      const fileList = Array.isArray(files) ? files.map(String) : [];
      const git = simpleGit(state.root);
      if (fileList.length === 0) {
        await git.checkout(["--", "."]);
      } else {
        for (const file of fileList) resolveProjectPath(state.root, file);
        await git.checkout(["--", ...fileList]);
      }
      res.json({ ok: true, files: fileList });
    } catch (error) {
      const { status, body } = safeJsonError(error);
      res.status(status).json(body);
    }
  });

  return router;
}
