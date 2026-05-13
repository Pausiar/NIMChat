"use client";

import { Bot, CheckCircle2, Code2, FileCode2, Play, Terminal } from "lucide-react";

const plannedFeatures = [
  { icon: <FileCode2 className="h-5 w-5" />, label: "Editor de archivos con árbol de proyecto" },
  { icon: <Play className="h-5 w-5" />, label: "Ejecución en sandbox dentro del navegador" },
  { icon: <Bot className="h-5 w-5" />, label: "Generación de código guiada por IA" },
  { icon: <Code2 className="h-5 w-5" />, label: "Refactoring asistido y explicación de cambios" },
];

export function CodeModePlaceholder() {
  return (
    <div className="lab-bg relative flex h-full min-h-0 items-center justify-center overflow-hidden bg-[#0a0a0b] px-6 pb-28 pt-12 text-white">
      <div className="relative z-10 w-full max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-10">
        <div className="mb-7 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-600 to-zinc-950 shadow-lg ring-1 ring-white/15">
          <Terminal className="h-8 w-8" />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-white/35">
          Próximamente
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
          Code Mode
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/55 md:text-lg">
          Próximamente: un entorno de desarrollo asistido por IA directamente
          en el navegador.
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {plannedFeatures.map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white">
                {feature.icon}
              </span>
              <span className="flex-1">{feature.label}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-300/70" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}