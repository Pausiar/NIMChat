"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { composeDocument, splitDocument, type WebParts } from "./web-doc";

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
}

type Part = keyof WebParts;

const TABS: { id: Part; label: string; language: string; ext: string; mime: string }[] = [
  { id: "html", label: "html", language: "markup", ext: "html", mime: "text/html" },
  { id: "css", label: "css", language: "css", ext: "css", mime: "text/css" },
  { id: "js", label: "js", language: "javascript", ext: "js", mime: "text/javascript" },
];

/** Editor de las tres partes del diseño (HTML, CSS y JS). Los cambios se aplican solos. */
export function CodeEditor({ code, onCodeChange }: CodeEditorProps) {
  const parts = useMemo(() => (code.trim() ? splitDocument(code) : { html: "", css: "", js: "" }), [code]);
  const [active, setActive] = useState<Part>("html");
  const [draft, setDraft] = useState<WebParts>(parts);
  const [copied, setCopied] = useState(false);

  // Si el código cambia desde fuera (nueva generación) se refresca el borrador.
  useEffect(() => setDraft(parts), [parts]);

  const tab = TABS.find((t) => t.id === active)!;
  const dirty = draft[active] !== parts[active];

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => onCodeChange(composeDocument(draft)), 500);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, onCodeChange]);

  const copy = async () => {
    await navigator.clipboard.writeText(draft[active]);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([draft[active]], { type: `${tab.mime};charset=utf-8` }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `diseno.${tab.ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!code.trim()) {
    return <div className="ui-mono flex h-full items-center justify-center text-xs text-white/30">sin código todavía</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-2">
        <div className="ui-mono flex h-full items-stretch">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "relative px-3 text-xs transition-colors",
                active === t.id ? "text-white" : "text-white/45 hover:text-white"
              )}
            >
              {t.label}
              {active === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-nim-yellow" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={copy} className="ui-mono">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "copiado" : "copiar"}
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={download} aria-label={`Descargar ${tab.ext}`}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-2">
        <textarea
          value={draft[active]}
          onChange={(event) => setDraft((current) => ({ ...current, [active]: event.target.value }))}
          spellCheck={false}
          aria-label={`Código ${tab.label}`}
          className="h-full min-h-[240px] w-full resize-none border-0 border-r border-border bg-background p-3 font-mono text-[13px] leading-relaxed text-white outline-none"
        />
        <div className="hidden min-h-0 overflow-auto lg:block">
          <SyntaxHighlighter
            language={tab.language}
            style={vscDarkPlus}
            showLineNumbers
            customStyle={{ margin: 0, minHeight: "100%", background: "#0a0a0a", fontSize: 13, lineHeight: 1.6 }}
            lineNumberStyle={{ color: "rgba(255,255,255,0.25)", minWidth: "2.5em" }}
          >
            {draft[active] || " "}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
