"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ApiKeyInput } from "./ApiKeyInput";
import { ModelSelector } from "./ModelSelector";
import { AppSettings, DEFAULT_SETTINGS } from "@/lib/chat-storage";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export function SettingsModal({
  open,
  onOpenChange,
  settings,
  onSave,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajustes</DialogTitle>
          <DialogDescription className="text-white/50">
            Configura tu API key, el modelo por defecto y los parámetros de
            generación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <ApiKeyInput
            value={draft.apiKey}
            onChange={(v) => setDraft((d) => ({ ...d, apiKey: v }))}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Modelo por defecto
            </label>
            <ModelSelector
              value={draft.selectedModel}
              onChange={(id) =>
                setDraft((d) => ({ ...d, selectedModel: id }))
              }
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="system-prompt"
              className="text-sm font-medium text-white"
            >
              System prompt global
            </label>
            <Textarea
              id="system-prompt"
              value={draft.globalSystemPrompt}
              onChange={(e) =>
                setDraft((d) => ({ ...d, globalSystemPrompt: e.target.value }))
              }
              className="min-h-[100px] border-white/10 bg-black/30 text-sm text-white"
            />
            <p className="text-xs text-white/40">
              Se aplica a todos los chats nuevos. Los chats existentes
              conservan el suyo.
            </p>
          </div>

          <div className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-white">
              Parámetros de generación
            </h3>

            <ParamSlider
              label="Temperature"
              hint="Creatividad. 0 = determinista, 2 = muy creativo"
              min={0}
              max={2}
              step={0.05}
              value={draft.params.temperature}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  params: { ...d.params, temperature: v },
                }))
              }
            />
            <ParamSlider
              label="Max tokens"
              hint="Longitud máxima de la respuesta"
              min={256}
              max={4096}
              step={64}
              value={draft.params.maxTokens}
              format={(v) => v.toString()}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  params: { ...d.params, maxTokens: v },
                }))
              }
            />
            <ParamSlider
              label="Top P"
              hint="Diversidad por nucleus sampling"
              min={0}
              max={1}
              step={0.05}
              value={draft.params.topP}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  params: { ...d.params, topP: v },
                }))
              }
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setDraft(DEFAULT_SETTINGS)}
            className="text-white/60 hover:text-white"
          >
            Restablecer
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-white text-black hover:bg-white/90"
            >
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ParamSlider({
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white">{label}</span>
        <span className="font-mono text-xs text-white/70">
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
      />
      <p className="text-[11px] text-white/40">{hint}</p>
    </div>
  );
}
