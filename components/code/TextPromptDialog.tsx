"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TextPromptDialogProps {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  initialValue: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function TextPromptDialog({
  open,
  title,
  description,
  label,
  initialValue,
  confirmLabel = "Aceptar",
  onConfirm,
  onCancel,
}: TextPromptDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [initialValue, open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (value.trim()) onConfirm(value.trim());
          }}
        >
          <label className="block text-sm text-white/70">
            <span className="mb-2 block text-xs uppercase tracking-wide text-white/35">{label}</span>
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-10 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25"
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
