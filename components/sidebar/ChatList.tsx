"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Trash2, Check, X } from "lucide-react";
import { Chat } from "@/lib/chat-storage";
import { cn } from "@/lib/utils";

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ChatList({
  chats,
  activeChatId,
  onSelect,
  onRename,
  onDelete,
}: ChatListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  const startRename = (chat: Chat) => {
    setEditingId(chat.id);
    setEditValue(chat.title);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-1 overflow-y-auto py-2">
      <AnimatePresence initial={false}>
        {sorted.map((chat) => {
          const isActive = chat.id === activeChatId;
          const isEditing = chat.id === editingId;
          const isConfirming = chat.id === confirmDelete;
          return (
            <motion.div
              key={chat.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
              {isEditing ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="min-w-0 flex-1 rounded bg-black/30 px-1 text-sm text-white outline-none ring-1 ring-white/20"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  onDoubleClick={() => startRename(chat)}
                  className="min-w-0 flex-1 truncate text-left"
                  title={chat.title}
                >
                  {chat.title}
                </button>
              )}
              {!isEditing && !isConfirming && (
                <button
                  type="button"
                  aria-label="Eliminar chat"
                  onClick={() => setConfirmDelete(chat.id)}
                  className="opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              {isConfirming && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Confirmar"
                    onClick={() => {
                      onDelete(chat.id);
                      setConfirmDelete(null);
                    }}
                    className="rounded p-0.5 text-red-400 hover:bg-red-500/20"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancelar"
                    onClick={() => setConfirmDelete(null)}
                    className="rounded p-0.5 text-white/60 hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {sorted.length === 0 && (
        <div className="px-2 py-6 text-center text-xs text-white/30">
          No hay chats todavía
        </div>
      )}
    </div>
  );
}
