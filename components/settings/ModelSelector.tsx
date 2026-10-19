"use client";

import { ModelPicker } from "@/components/shared/ModelPicker";

interface ModelSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <ModelPicker
      value={value}
      onChange={onChange}
      className="h-9 w-full justify-between rounded-md border border-border bg-black/30 px-3 text-white"
    />
  );
}
