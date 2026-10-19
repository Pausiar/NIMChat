"use client";

import { useEffect, useMemo, useState } from "react";
import { loadSettings } from "./chat-storage";
import {
  AVAILABLE_MODELS,
  mergeRemoteModels,
  type ModelInfo,
  type RemoteModel,
} from "./models";

const CACHE_KEY = "nimchat:model-catalog";
const TTL_MS = 60 * 60 * 1000;

export type CatalogStatus = "local" | "loading" | "live";

interface CachedCatalog {
  at: number;
  models: RemoteModel[];
}

// La caché es una comodidad por navegador: si no se puede leer o escribir,
// simplemente se vuelve a pedir la lista.
function readCache(): CachedCatalog | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedCatalog) : null;
  } catch {
    return null;
  }
}

function writeCache(models: RemoteModel[]) {
  try {
    const entry: CachedCatalog = { at: Date.now(), models };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // sin almacenamiento disponible: no pasa nada
  }
}

/**
 * Catálogo de modelos de NVIDIA NIM. Empieza con el catálogo local, pide la
 * lista viva a `/api/models` y la cachea una hora. Si NIM no responde, se usa
 * la última lista conocida o, en su defecto, el catálogo local.
 */
export function useModelCatalog(): { models: ModelInfo[]; status: CatalogStatus } {
  const [remote, setRemote] = useState<RemoteModel[] | null>(null);
  const [status, setStatus] = useState<CatalogStatus>("local");

  useEffect(() => {
    let cancelled = false;
    const cached = readCache();

    if (cached && Date.now() - cached.at < TTL_MS) {
      setRemote(cached.models);
      setStatus("live");
      return;
    }

    setStatus("loading");
    const apiKey = loadSettings().apiKey;

    fetch("/api/models", {
      headers: apiKey ? { "x-nvidia-api-key": apiKey } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ data: RemoteModel[] }>;
      })
      .then((json) => {
        if (cancelled) return;
        writeCache(json.data);
        setRemote(json.data);
        setStatus("live");
      })
      .catch(() => {
        if (cancelled) return;
        setRemote(cached?.models ?? null);
        setStatus(cached ? "live" : "local");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const models = useMemo(
    () => (remote ? mergeRemoteModels(remote) : AVAILABLE_MODELS),
    [remote]
  );

  return { models, status };
}
