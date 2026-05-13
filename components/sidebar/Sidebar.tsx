"use client";

import { Settings, X } from "lucide-react";
import { Chat } from "@/lib/chat-storage";
import { NewChatButton } from "./NewChatButton";
import { ChatList } from "./ChatList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NimLogo } from "@/components/brand/NimLogo";

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
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
  onOpenSettings,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/5 bg-[#111113] transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-3 py-3">
          <div className="flex items-center gap-2">
            <NimLogo
              size={32}
              className="h-8 w-8 drop-shadow-[0_0_12px_rgba(250,204,21,0.22)]"
            />
            <span className="text-sm font-semibold text-white">NimChat</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/60 hover:bg-white/5 md:hidden"
            aria-label="Cerrar sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 py-3">
          <NewChatButton
            onClick={() => {
              onNewChat();
              onClose();
            }}
          />
        </div>

        <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
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

        <div className="border-t border-white/5 p-3">
          <Button
            variant="ghost"
            onClick={onOpenSettings}
            className="w-full justify-start gap-2 text-white/70 hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Ajustes
          </Button>
        </div>
      </aside>
    </>
  );
}
