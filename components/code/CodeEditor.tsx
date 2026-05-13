"use client";

import { useMemo, useState } from "react";
import { Check, Code2, Edit3, FileCode2, RotateCcw, Terminal as TerminalIcon } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import type { ReadFileResult, TerminalEvent } from "@/lib/server-client";
import { cn } from "@/lib/utils";
import { TerminalOutput } from "./TerminalOutput";
import { DiffViewer } from "./DiffViewer";

export type CodeCenterTab = "editor" | "terminal" | "git";

interface CodeEditorProps {
  activeTab: CodeCenterTab;
  onTabChange: (tab: CodeCenterTab) => void;
  file: ReadFileResult | null;
  onSaveFile: (path: string, content: string) => void;
  terminalEvents: TerminalEvent[];
  onRunCommand: (command: string) => void;
  gitPatch: string;
  gitStat: string;
  onCommit: () => void;
  onDiscard: () => void;
  disabled?: boolean;
}

export function CodeEditor({
  activeTab,
  onTabChange,
  file,
  onSaveFile,
  terminalEvents,
  onRunCommand,
  gitPatch,
  gitStat,
  onCommit,
  onDiscard,
  disabled,
}: CodeEditorProps) {
  const [editable, setEditable] = useState(false);
  const [draft, setDraft] = useState("");

  const language = useMemo(() => getLanguage(file?.path ?? ""), [file?.path]);
  const isDirty = editable && file && draft !== file.content;

  const startEdit = () => {
    if (!file) return;
    setDraft(file.content);
    setEditable(true);
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#09090b]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
          <TabButton active={activeTab === "editor"} onClick={() => onTabChange("editor")} icon={<Code2 className="h-3.5 w-3.5" />} label="Editor" />
          <TabButton active={activeTab === "terminal"} onClick={() => onTabChange("terminal")} icon={<TerminalIcon className="h-3.5 w-3.5" />} label="Terminal" />
          <TabButton active={activeTab === "git"} onClick={() => onTabChange("git")} icon={<FileCode2 className="h-3.5 w-3.5" />} label="Git Diff" />
        </div>
        {activeTab === "editor" && file && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden truncate text-xs text-white/45 md:block">{file.path}</span>
            {editable ? (
              <>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditable(false)} className="h-8 px-2 text-white/60 hover:text-white">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Rechazar
                </Button>
                <Button type="button" size="sm" onClick={() => file && onSaveFile(file.path, draft)} disabled={!isDirty || disabled} className="h-8 bg-white text-black hover:bg-white/90">
                  <Check className="h-3.5 w-3.5" />
                  Aplicar
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={startEdit} disabled={disabled} className="h-8 border-white/10 text-white/70 hover:text-white">
                <Edit3 className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "editor" && (
          <div className="h-full min-h-0 overflow-auto">
            {!file ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-white/35">
                <FileCode2 className="mb-3 h-10 w-10" />
                <div>Selecciona un archivo para abrirlo</div>
              </div>
            ) : editable ? (
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                spellCheck={false}
                className="h-full min-h-[560px] w-full resize-none bg-[#080809] p-4 font-mono text-sm leading-relaxed text-white outline-none"
              />
            ) : (
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                showLineNumbers
                customStyle={{ margin: 0, minHeight: "100%", background: "#080809", fontSize: 13, lineHeight: 1.65 }}
                lineNumberStyle={{ color: "rgba(255,255,255,0.25)", minWidth: "3em" }}
              >
                {file.content || " "}
              </SyntaxHighlighter>
            )}
          </div>
        )}
        {activeTab === "terminal" && <TerminalOutput events={terminalEvents} onRun={onRunCommand} disabled={disabled} />}
        {activeTab === "git" && (
          <DiffViewer patch={gitPatch} stat={gitStat} onCommit={onCommit} onDiscard={onDiscard} canMutate={Boolean(gitPatch.trim()) && !disabled} />
        )}
      </div>
    </section>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md px-3 text-xs text-white/50 transition-colors hover:text-white",
        active && "bg-white text-black hover:text-black"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function getLanguage(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "tsx" || ext === "ts") return "tsx";
  if (ext === "jsx" || ext === "js") return "jsx";
  if (ext === "json") return "json";
  if (ext === "md") return "markdown";
  if (ext === "css") return "css";
  if (ext === "py") return "python";
  if (ext === "rs") return "rust";
  if (ext === "go") return "go";
  return "tsx";
}
