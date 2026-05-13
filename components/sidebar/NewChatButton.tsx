"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewChatButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="w-full justify-start gap-2 border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
    >
      <Plus className="h-4 w-4" />
      Nuevo chat
    </Button>
  );
}
