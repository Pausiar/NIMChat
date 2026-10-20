"use client";

import { Plus } from "lucide-react";

export function NewChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-mono flex h-8 flex-1 items-center gap-2 rounded-md px-2 text-xs text-nim-yellow transition-colors hover:bg-nim-yellow/10"
    >
      <Plus className="h-3.5 w-3.5" />
      nuevo chat
    </button>
  );
}
