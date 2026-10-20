"use client";

import { X } from "lucide-react";
import { Chat } from "@/lib/chat-storage";
import { NewChatButton } from "./NewChatButton";
import { ChatList } from "./ChatList";
import { cn } from "@/lib/utils";

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-[#0b0b0b] transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-2 pt-2">
          <NewChatButton
            onClick={() => {
              onNewChat();
              onClose();
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/60 hover:bg-white/5 md:hidden"
            aria-label="Cerrar conversaciones"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="ui-mono px-3 pb-1 pt-4 text-[10px] uppercase tracking-wider text-white/30">
          Conversaciones
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          <ChatList
            chats={chats}
            activeChatId={activeChatId}
            onSelect={(id) => {
              onSelect(id);
              onClose();
            }}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      </aside>
    </>
  );
}
