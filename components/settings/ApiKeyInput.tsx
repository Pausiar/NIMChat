"use client";

import { useState } from "react";
import { Eye, EyeOff, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ApiKeyInputProps {
  value: string;
  onChange: (v: string) => void;
}

export function ApiKeyInput({ value, onChange }: ApiKeyInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="api-key" className="text-sm font-medium text-white">
          NVIDIA NIM API Key
        </label>
        <a
          href="https://build.nvidia.com"
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-1 text-xs text-sky-400 hover:underline"
        >
          Obtener gratis
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="relative">
        <Input
          id="api-key"
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="nvapi-..."
          className="border-white/10 bg-black/30 pr-10 font-mono text-sm text-white"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 hover:bg-white/5 hover:text-white"
          aria-label={show ? "Ocultar" : "Mostrar"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-xs text-white/40">
        La key se guarda solo en tu navegador (localStorage). Nunca se envía a
        ningún servidor que no sea NVIDIA NIM.
      </p>
    </div>
  );
}
