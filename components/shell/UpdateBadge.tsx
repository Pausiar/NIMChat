"use client";

import { Download, Loader2, RotateCw } from "lucide-react";
import { useUpdater } from "@/lib/use-updater";

/** Aviso discreto en la barra superior cuando hay una versión nueva. */
export function UpdateBadge() {
  const { state, download, install } = useUpdater();
  if (!state) return null;

  if (state.status === "available") {
    return (
      <button
        type="button"
        onClick={() => void download()}
        title="Descargar la nueva versión"
        className="flex items-center gap-1.5 rounded border border-nim-yellow/40 px-2 py-0.5 text-nim-yellow hover:bg-nim-yellow/10"
      >
        <Download className="h-3 w-3" />
        actualizar a {state.newVersion}
      </button>
    );
  }
  if (state.status === "downloading") {
    return (
      <span className="flex items-center gap-1.5 text-nim-yellow">
        <Loader2 className="h-3 w-3 animate-spin" />
        descargando {state.percent ?? 0}%
      </span>
    );
  }
  if (state.status === "downloaded") {
    return (
      <button
        type="button"
        onClick={() => void install()}
        title="Se instalará y la app se reabrirá sola"
        className="flex items-center gap-1.5 rounded bg-nim-yellow px-2 py-0.5 font-medium text-black hover:bg-nim-yellow/90"
      >
        <RotateCw className="h-3 w-3" />
        reiniciar para actualizar
      </button>
    );
  }
  return null;
}
