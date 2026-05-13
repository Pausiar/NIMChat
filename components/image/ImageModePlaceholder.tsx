"use client";

import { ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImageModePlaceholder({ onBack }: { onBack?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-[#0a0a0b] pb-24 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-nim-yellow to-amber-600 shadow-2xl shadow-nim-yellow/20">
        <ImageIcon className="h-10 w-10 text-black" />
        <span className="absolute -right-2 -top-2 rounded-full border border-white/10 bg-black px-2 py-0.5 text-[10px] font-medium text-nim-yellow">
          Soon
        </span>
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold text-white">Modo Image</h1>
        <p className="text-sm text-white/60">
          Genera y edita imágenes con los modelos de visión de NVIDIA NIM.
          Próximamente.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
        <Feature icon={<Sparkles className="h-3 w-3" />} label="Text → Image" />
        <Feature icon={<Sparkles className="h-3 w-3" />} label="Edición guiada" />
        <Feature icon={<Sparkles className="h-3 w-3" />} label="Galería local" />
      </div>
      {onBack && (
        <Button variant="outline" size="sm" onClick={onBack} className="mt-2">
          Volver al chat
        </Button>
      )}
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
      {icon}
      {label}
    </span>
  );
}
