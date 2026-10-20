"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDesktop } from "@/lib/desktop";
import { useUpdater } from "@/lib/use-updater";

/** Actualizaciones de la app de escritorio. No aparece en el navegador. */
export function UpdatesSection() {
  const { state, check, download, install } = useUpdater();
  if (!getDesktop() || !state) return null;

  const busy = state.status === "checking" || state.status === "downloading";
  let message = "";
  switch (state.status) {
    case "checking":
      message = "Buscando actualizaciones…";
      break;
    case "available":
      message = `Hay una versión nueva: ${state.newVersion}.`;
      break;
    case "not-available":
      message = "Tienes la última versión.";
      break;
    case "downloading":
      message = `Descargando ${state.newVersion ?? "la actualización"}… ${state.percent ?? 0}%`;
      break;
    case "downloaded":
      message = `La versión ${state.newVersion} está lista. Se instala al reiniciar.`;
      break;
    case "error":
      message = `No se pudo comprobar: ${state.error ?? "error desconocido"}`;
      break;
    case "disabled":
      message = "Las actualizaciones solo funcionan en la app instalada.";
      break;
    default:
      message = "Las actualizaciones se comprueban solas al abrir y cada pocas horas.";
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm text-white">Actualizaciones</div>
          <div className="ui-mono text-[11px] text-white/40">versión instalada {state.currentVersion}</div>
        </div>
        {state.status === "available" ? (
          <Button size="sm" onClick={() => void download()}>
            Descargar
          </Button>
        ) : state.status === "downloaded" ? (
          <Button size="sm" onClick={() => void install()}>
            Reiniciar e instalar
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy || state.status === "disabled"} onClick={() => void check()}>
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            Buscar
          </Button>
        )}
      </div>
      <p className={state.status === "error" ? "text-xs text-red-300" : "text-xs text-white/50"}>{message}</p>
      {state.status === "downloading" && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-nim-yellow transition-all" style={{ width: `${state.percent ?? 0}%` }} />
        </div>
      )}
    </div>
  );
}
