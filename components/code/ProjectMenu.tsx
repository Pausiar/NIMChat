"use client";

import { ChevronDown, Clock, FileText, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RecentProject } from "@/lib/recent-projects";

interface ProjectMenuProps {
  projectName: string;
  recents: RecentProject[];
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onOpenRecent: (project: RecentProject) => void;
}

/** Selector de proyecto: abre carpetas y archivos desde el explorador del sistema. */
export function ProjectMenu({ projectName, recents, onOpenFolder, onOpenFile, onOpenRecent }: ProjectMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ui-mono flex h-7 max-w-[260px] items-center gap-1.5 rounded-md px-2 text-xs text-white hover:bg-white/5"
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-nim-yellow" />
          <span className="truncate">{projectName}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-72">
        <DropdownMenuItem onSelect={onOpenFolder} className="gap-2 text-[13px]">
          <FolderOpen className="h-3.5 w-3.5" />
          Abrir carpeta…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenFile} className="gap-2 text-[13px]">
          <FileText className="h-3.5 w-3.5" />
          Abrir archivo…
        </DropdownMenuItem>
        {recents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="ui-mono text-[10px] font-normal uppercase tracking-wider text-white/30">
              Recientes
            </DropdownMenuLabel>
            {recents.map((project) => (
              <DropdownMenuItem key={project.path} onSelect={() => onOpenRecent(project)} className="gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-white/35" />
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-white">{project.name}</div>
                  <div className="ui-mono truncate text-[10px] text-white/35">{project.path}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
