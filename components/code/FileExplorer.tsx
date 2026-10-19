"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  File,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileEntry } from "@/lib/server-client";
import { cn } from "@/lib/utils";

interface FileExplorerProps {
  entries: FileEntry[];
  selectedPath?: string;
  onSelectFile: (path: string) => void;
  onRefresh: () => void;
  onNewFile: (path: string) => void;
  onNewFolder: (path: string) => void;
  onRename: (from: string) => void;
  onDelete: (path: string) => void;
  onOpenTerminal: (path: string) => void;
}

export function FileExplorer({
  entries,
  selectedPath,
  onSelectFile,
  onRefresh,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onOpenTerminal,
}: FileExplorerProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["."]));
  const filtered = useMemo(() => filterEntries(entries, query), [entries, query]);

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border bg-[#0b0b0b]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="ui-mono text-[11px] uppercase tracking-wider text-white/35">explorador</span>
        <div className="flex items-center gap-0.5">
          <Button type="button" size="icon" variant="ghost" aria-label="Nuevo archivo" onClick={() => onNewFile("./nuevo-archivo.ts")} className="h-6 w-6">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Nueva carpeta" onClick={() => onNewFolder("./nueva-carpeta/.gitkeep")} className="h-6 w-6">
            <Folder className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Actualizar" onClick={onRefresh} className="h-6 w-6">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="relative border-b border-border">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="filtrar…"
          className="ui-mono h-8 w-full bg-transparent pl-8 pr-3 text-xs text-white outline-none placeholder:text-white/25"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-1.5 py-2 text-[13px]">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-white/30">No hay archivos</div>
        ) : (
          filtered.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              selectedPath={selectedPath}
              expanded={expanded}
              onToggle={(path) => {
                setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(path)) next.delete(path);
                  else next.add(path);
                  return next;
                });
              }}
              onSelectFile={onSelectFile}
              onRename={onRename}
              onDelete={onDelete}
              onOpenTerminal={onOpenTerminal}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function TreeNode({
  entry,
  depth,
  selectedPath,
  expanded,
  onToggle,
  onSelectFile,
  onRename,
  onDelete,
  onOpenTerminal,
}: {
  entry: FileEntry;
  depth: number;
  selectedPath?: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectFile: (path: string) => void;
  onRename: (from: string) => void;
  onDelete: (path: string) => void;
  onOpenTerminal: (path: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDirectory = entry.type === "directory";
  const isExpanded = expanded.has(entry.path) || depth < 1;
  const isSelected = selectedPath === entry.path;

  const handlePrimary = () => {
    if (isDirectory) onToggle(entry.path);
    else onSelectFile(entry.path);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/[0.06] hover:text-white",
          isSelected && "bg-white/10 text-white"
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuOpen(true);
        }}
      >
        <button type="button" onClick={handlePrimary} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {isDirectory ? (
            isExpanded ? <FolderOpen className="h-4 w-4 shrink-0 text-nim-yellow/80" /> : <Folder className="h-4 w-4 shrink-0 text-nim-yellow/80" />
          ) : (
            fileIcon(entry.name)
          )}
          <span className={cn("truncate", entry.gitStatus === "deleted" && "text-red-300 line-through")}>{entry.name}</span>
          {entry.gitStatus && entry.gitStatus !== "deleted" && (
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                entry.gitStatus === "untracked" || entry.gitStatus === "added" ? "bg-nim-yellow" : "bg-orange-300"
              )}
              title={entry.gitStatus}
            />
          )}
        </button>
        <button
          type="button"
          aria-label="Acciones de archivo"
          onClick={() => setMenuOpen((value) => !value)}
          className="rounded p-1 opacity-0 hover:bg-white/10 group-hover:opacity-100"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
      {menuOpen && (
        <div className="absolute right-2 top-8 z-30 w-44 overflow-hidden rounded-lg border border-white/10 bg-zinc-950 shadow-2xl">
          <MenuButton icon={<Copy className="h-3.5 w-3.5" />} label="Copiar ruta" onClick={() => copyPath(entry.path, setMenuOpen)} />
          <MenuButton icon={<Terminal className="h-3.5 w-3.5" />} label="Abrir terminal" onClick={() => { setMenuOpen(false); onOpenTerminal(entry.path); }} />
          <MenuButton icon={<FileText className="h-3.5 w-3.5" />} label="Renombrar" onClick={() => { setMenuOpen(false); onRename(entry.path); }} />
          <MenuButton danger icon={<Trash2 className="h-3.5 w-3.5" />} label="Eliminar" onClick={() => { setMenuOpen(false); onDelete(entry.path); }} />
        </div>
      )}
      {isDirectory && isExpanded && entry.children?.map((child) => (
        <TreeNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          expanded={expanded}
          onToggle={onToggle}
          onSelectFile={onSelectFile}
          onRename={onRename}
          onDelete={onDelete}
          onOpenTerminal={onOpenTerminal}
        />
      ))}
    </div>
  );
}

function MenuButton({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white", danger && "text-red-200 hover:bg-red-500/10")}
    >
      {icon}
      {label}
    </button>
  );
}

function copyPath(path: string, close: (open: boolean) => void) {
  navigator.clipboard?.writeText(path).catch(() => undefined);
  close(false);
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx") return <FileCode2 className="h-4 w-4 shrink-0 text-nim-yellow" />;
  if (ext === "json") return <FileJson className="h-4 w-4 shrink-0 text-yellow-200" />;
  if (ext === "md" || ext === "txt") return <FileText className="h-4 w-4 shrink-0 text-zinc-200" />;
  return <File className="h-4 w-4 shrink-0 text-white/45" />;
}

function filterEntries(entries: FileEntry[], query: string): FileEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return entries;
  return entries.flatMap((entry) => {
    const children = entry.children ? filterEntries(entry.children, normalized) : [];
    if (entry.name.toLowerCase().includes(normalized) || children.length > 0) {
      return [{ ...entry, children }];
    }
    return [];
  });
}
