"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { relativeTime, type CodeSession } from "@/lib/code-sessions";
import type { RecentProject } from "@/lib/recent-projects";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  sessions: CodeSession[];
  recents: RecentProject[];
  activeSessionId: string | null;
  activeProjectPath?: string;
  runningSessionId: string | null;
  onSelectSession: (session: CodeSession) => void;
  onNewSession: (project: RecentProject) => void;
  onDeleteSession: (session: CodeSession) => void;
  onOpenFolder: () => void;
  onOpenFile: () => void;
}

interface ProjectGroup extends RecentProject {
  sessions: CodeSession[];
  lastActivity: number;
}

export function ProjectSidebar({
  sessions,
  recents,
  activeSessionId,
  activeProjectPath,
  runningSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenFolder,
  onOpenFile,
}: ProjectSidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const groups = useMemo<ProjectGroup[]>(() => {
    const map = new Map<string, ProjectGroup>();
    for (const project of recents) {
      map.set(project.path, { ...project, sessions: [], lastActivity: 0 });
    }
    for (const session of sessions) {
      const group = map.get(session.projectPath) ?? {
        path: session.projectPath,
        name: session.projectName,
        sessions: [],
        lastActivity: 0,
      };
      group.sessions.push(session);
      group.lastActivity = Math.max(group.lastActivity, session.updatedAt);
      map.set(session.projectPath, group);
    }
    return [...map.values()]
      .map((g) => ({ ...g, sessions: g.sessions.sort((a, b) => b.updatedAt - a.updatedAt) }))
      .sort((a, b) => (a.path === activeProjectPath ? -1 : b.path === activeProjectPath ? 1 : b.lastActivity - a.lastActivity));
  }, [sessions, recents, activeProjectPath]);

  const toggle = (path: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col border-r border-border bg-[#0b0b0b]">
      <div className="ui-mono flex h-9 shrink-0 items-center px-3 text-[11px] uppercase tracking-wider text-white/35">proyectos</div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {groups.length === 0 && (
          <div className="px-3 py-8 text-center text-xs leading-relaxed text-white/35">
            Abre una carpeta para empezar. Cada proyecto tendrá sus propias sesiones de chat.
          </div>
        )}
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.path);
          const isActiveProject = group.path === activeProjectPath;
          return (
            <div key={group.path} className="mb-1">
              <div className="group flex items-center gap-0.5 rounded-md hover:bg-white/5">
                <button
                  type="button"
                  onClick={() => toggle(group.path)}
                  title={group.path}
                  className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1.5 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 shrink-0 text-white/35" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0 text-white/35" />
                  )}
                  {isCollapsed ? (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-white/50" />
                  ) : (
                    <FolderOpen className={cn("h-3.5 w-3.5 shrink-0", isActiveProject ? "text-nim-yellow" : "text-white/50")} />
                  )}
                  <span className={cn("truncate text-[13px]", isActiveProject ? "text-white" : "text-white/70")}>{group.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNewSession(group)}
                  aria-label={`Nueva sesión en ${group.name}`}
                  title="Nueva sesión"
                  className="mr-1 rounded p-1 text-white/35 opacity-0 transition-opacity hover:bg-white/10 hover:text-nim-yellow focus:opacity-100 group-hover:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {!isCollapsed && (
                <div className="ml-3 border-l border-border pl-1">
                  {group.sessions.length === 0 && (
                    <button
                      type="button"
                      onClick={() => onNewSession(group)}
                      className="ui-mono w-full rounded-md px-2 py-1 text-left text-[11px] text-white/35 hover:text-nim-yellow"
                    >
                      + nueva sesión
                    </button>
                  )}
                  {group.sessions.map((session) => {
                    const active = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        className={cn(
                          "group/session flex items-center gap-1 rounded-md border-l-2 text-[13px] transition-colors",
                          active ? "border-nim-yellow bg-white/5 text-white" : "border-transparent text-white/55 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <button type="button" onClick={() => onSelectSession(session)} className="min-w-0 flex-1 px-2 py-1.5 text-left">
                          <div className="flex items-center gap-1.5">
                            {session.id === runningSessionId && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-nim-yellow" />}
                            <span className="truncate">{session.title}</span>
                          </div>
                        </button>
                        {confirmDelete === session.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteSession(session);
                              setConfirmDelete(null);
                            }}
                            onBlur={() => setConfirmDelete(null)}
                            autoFocus
                            className="ui-mono mr-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300"
                          >
                            borrar
                          </button>
                        ) : (
                          <>
                            <span className="ui-mono mr-1.5 shrink-0 text-[10px] text-white/25 group-hover/session:hidden">
                              {relativeTime(session.updatedAt)}
                            </span>
                            <button
                              type="button"
                              aria-label="Eliminar sesión"
                              onClick={() => setConfirmDelete(session.id)}
                              className="mr-1 hidden rounded p-1 text-white/35 hover:text-red-400 group-hover/session:block"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 space-y-0.5 border-t border-border p-1.5">
        <button
          type="button"
          onClick={onOpenFolder}
          className="ui-mono flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-nim-yellow hover:bg-nim-yellow/10"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          abrir carpeta…
        </button>
        <button
          type="button"
          onClick={onOpenFile}
          className="ui-mono flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/55 hover:bg-white/5 hover:text-white"
        >
          <FileText className="h-3.5 w-3.5" />
          abrir archivo…
        </button>
      </div>
    </aside>
  );
}
