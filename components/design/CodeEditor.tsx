"use client";

import { useEffect, useState } from "react";
import * as Babel from "@babel/standalone";
import { Check, Copy, Download, Edit3, Lock } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export function CodeEditor({ code, onCodeChange }: CodeEditorProps) {
  const [editable, setEditable] = useState(false);
  const [draft, setDraft] = useState(code);
  const [copied, setCopied] = useState(false);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(code);
    setSyntaxError(null);
  }, [code]);

  useEffect(() => {
    if (!editable || draft === code) return;
    const timer = window.setTimeout(() => {
      if (!draft.trim()) {
        setSyntaxError(null);
        onCodeChange("");
        return;
      }

      try {
        Babel.transform(draft, {
          filename: "GeneratedComponent.tsx",
          presets: [
            ["typescript", { isTSX: true, allExtensions: true }],
            ["react", { runtime: "classic" }],
          ],
        });
        setSyntaxError(null);
        onCodeChange(draft);
      } catch {
        setSyntaxError("El código tiene errores de sintaxis y no se aplicó al preview.");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft, editable, code, onCodeChange]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/typescript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "GeneratedComponent.tsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!code) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-white/40">
        El código generado aparecerá aquí.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d0d10]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="text-xs text-white/45">
          {editable ? "Editando con preview debounced" : "Solo lectura"}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditable((value) => !value)}
            className="h-8 gap-1.5 text-white/60 hover:text-white"
          >
            {editable ? <Lock className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
            {editable ? "Bloquear" : "Editar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-8 gap-1.5 text-white/60 hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copiar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            className="h-8 gap-1.5 text-white/60 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            .tsx
          </Button>
        </div>
      </div>

      {syntaxError && editable && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {syntaxError}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {editable ? (
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            className="h-full min-h-[520px] resize-none rounded-none border-0 bg-[#0d0d10] p-4 font-mono text-xs leading-relaxed text-white focus-visible:ring-0"
          />
        ) : (
          <SyntaxHighlighter
            language="tsx"
            style={oneDark}
            customStyle={{
              margin: 0,
              minHeight: "100%",
              background: "#0d0d10",
              fontSize: 12,
            }}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}