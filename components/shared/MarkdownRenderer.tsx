"use client";

import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CodeBlock({
  language,
  value,
}: {
  language: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-white/10 bg-[#0d0d10]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs text-white/50">
        <span className="font-mono">{language || "text"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-0.5 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Copiar código"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copiar
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          background: "transparent",
          fontSize: "0.85rem",
          padding: "1rem",
        }}
        PreTag="div"
      >
        {value.replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const components = useMemo(
    () => ({
      code({ inline, className: cls, children, ...props }: any) {
        const match = /language-(\w+)/.exec(cls || "");
        const value = String(children ?? "");
        if (!inline && match) {
          return <CodeBlock language={match[1]} value={value} />;
        }
        if (!inline && value.includes("\n")) {
          return <CodeBlock language="" value={value} />;
        }
        return (
          <code
            className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em]"
            {...props}
          >
            {children}
          </code>
        );
      },
      a({ children, ...props }: any) {
        return (
          <a
            {...props}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sky-400 underline underline-offset-2 hover:text-sky-300"
          >
            {children}
          </a>
        );
      },
      table({ children }: any) {
        return (
          <div className="my-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        );
      },
      th({ children }: any) {
        return (
          <th className="border border-white/10 bg-white/5 px-2 py-1 text-left">
            {children}
          </th>
        );
      },
      td({ children }: any) {
        return <td className="border border-white/10 px-2 py-1">{children}</td>;
      },
    }),
    []
  );

  return (
    <div
      className={cn(
        "prose prose-invert max-w-none break-words text-[15px] leading-relaxed prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:mt-4 prose-headings:mb-2",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
