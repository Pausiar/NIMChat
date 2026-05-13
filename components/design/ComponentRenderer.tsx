"use client";

import { useEffect, useMemo, useState } from "react";
import * as Babel from "@babel/standalone";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignBackground, DesignViewport } from "./types";

const backgroundClass: Record<DesignBackground, string> = {
  white: "bg-white",
  gray: "bg-zinc-100",
  dark: "bg-zinc-950",
  transparent:
    "bg-[linear-gradient(45deg,#d4d4d8_25%,transparent_25%),linear-gradient(-45deg,#d4d4d8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d4d4d8_75%),linear-gradient(-45deg,transparent_75%,#d4d4d8_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]",
};

const viewportClass: Record<DesignViewport, string> = {
  mobile: "w-[375px]",
  tablet: "w-[768px]",
  desktop: "w-full",
};

interface ComponentRendererProps {
  code: string;
  background: DesignBackground;
  viewport: DesignViewport;
  refreshKey: number;
  isGenerating: boolean;
}

export function ComponentRenderer({
  code,
  background,
  viewport,
  refreshKey,
  isGenerating,
}: ComponentRendererProps) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    setRuntimeError(null);
  }, [code, refreshKey]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "nimchat-design-error") {
        setRuntimeError(String(event.data.message ?? "Error de runtime"));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const compiled = useMemo(() => {
    if (!code.trim()) return { source: "", componentName: "", error: null as string | null };
    try {
      const { stripped, componentName } = stripExportDefault(code);
      Babel.transform(stripped, {
        filename: "GeneratedComponent.tsx",
        presets: [
          ["typescript", { isTSX: true, allExtensions: true }],
          ["react", { runtime: "classic" }],
        ],
      });
      return { source: stripped, componentName, error: null };
    } catch (error) {
      return {
        source: "",
        componentName: "",
        error:
          error instanceof Error
            ? error.message
            : "El modelo no devolvió código válido. Intenta reformular el prompt.",
      };
    }
  }, [code]);

  const srcDoc = useMemo(() => {
    if (!compiled.source) return "";
    return buildSrcDoc(compiled.source, compiled.componentName);
  }, [compiled.source, compiled.componentName, refreshKey]);

  if (!code.trim()) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
        <div>
          <RefreshCw className={cn("mx-auto mb-3 h-7 w-7 text-white/25", isGenerating && "animate-spin")} />
          <p className="text-sm font-medium text-white/65">
            {isGenerating ? "Generando interfaz..." : "Preview listo"}
          </p>
          {!isGenerating && (
            <p className="mt-1 max-w-sm text-xs text-white/35">
              Escribe una descripción y genera un componente para verlo aquí.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (compiled.error && isGenerating) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
        <div className="h-28 w-full max-w-sm animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (compiled.error) {
    return <RenderError message={compiled.error} />;
  }

  return (
    <div className={cn("relative h-full min-h-[420px] overflow-auto rounded-2xl p-4", backgroundClass[background])}>
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-sm">
          <div className="rounded-full border border-white/15 bg-zinc-950/80 px-4 py-2 text-sm text-white/70">
            Generando interfaz...
          </div>
        </div>
      )}
      {runtimeError && <RenderError message={runtimeError} floating />}
      <div className={cn("mx-auto h-full min-h-[560px] overflow-hidden rounded-xl shadow-2xl transition-all", viewportClass[viewport])}>
        <iframe
          key={`${refreshKey}-${compiled.source.length}`}
          title="Preview del componente generado"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          onLoad={() => setRuntimeError(null)}
          className="h-full min-h-[560px] w-full border-0 bg-transparent"
        />
      </div>
    </div>
  );
}

function RenderError({ message, floating }: { message: string; floating?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100",
        floating && "absolute left-6 right-6 top-6 z-20 backdrop-blur"
      )}
    >
      <div className="mb-1 flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        El modelo no devolvió código válido
      </div>
      <p className="text-red-100/75">{message}</p>
    </div>
  );
}

function stripExportDefault(code: string): { stripped: string; componentName: string } {
  let match = code.match(/export\s+default\s+function\s+([A-Z][\w$]*)/);
  if (match) {
    return {
      stripped: code.replace(/export\s+default\s+function\s+([A-Z][\w$]*)/, "function $1"),
      componentName: match[1],
    };
  }

  match = code.match(/export\s+default\s+([A-Z][\w$]*)\s*;?/);
  if (match) {
    return {
      stripped: code.replace(/export\s+default\s+([A-Z][\w$]*)\s*;?/, ""),
      componentName: match[1],
    };
  }

  if (/export\s+default\s+function\s*\(/.test(code)) {
    return {
      stripped: code.replace(/export\s+default\s+function\s*\(/, "function __NimChatGenerated__("),
      componentName: "__NimChatGenerated__",
    };
  }

  if (/export\s+default\s+/.test(code)) {
    return {
      stripped: code.replace(/export\s+default\s+/, "const __NimChatGenerated__ = "),
      componentName: "__NimChatGenerated__",
    };
  }

  match = code.match(/\bfunction\s+([A-Z][\w$]*)\s*\(/);
  if (match) {
    return { stripped: code, componentName: match[1] };
  }

  throw new Error("No se encontró un componente React exportable.");
}

function buildSrcDoc(source: string, componentName: string) {
  const sourceLiteral = JSON.stringify(source);
  const nameLiteral = JSON.stringify(componentName);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone@7.25.6/babel.min.js"></script>
    <script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.js"></script>
    <style>
      html, body, #root { min-height: 100%; margin: 0; }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .nimchat-error { margin:16px;padding:16px;border:1px solid rgba(239,68,68,.35);border-radius:16px;background:rgba(239,68,68,.08);color:#b91c1c;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;line-height:1.6; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function () {
        function reportError(err) {
          var msg = String(err && err.message ? err.message : err);
          try { parent.postMessage({ type: "nimchat-design-error", message: msg }, "*"); } catch (e) {}
          var root = document.getElementById("root");
          if (root) {
            var pre = document.createElement("pre");
            pre.className = "nimchat-error";
            pre.textContent = msg;
            root.innerHTML = "";
            root.appendChild(pre);
          }
        }

        window.addEventListener("error", function (event) { reportError(event.error || event.message); });
        window.addEventListener("unhandledrejection", function (event) { reportError(event.reason); });

        try {
          if (!window.React || !window.ReactDOM || !window.Babel) {
            throw new Error("No se pudieron cargar React/Babel desde la CDN. Revisa tu conexión.");
          }

          var lucideIconNames = (window.lucide && window.lucide.icons) ? Object.keys(window.lucide.icons) : [];
          var iconCache = {};
          function makeIconComponent(name) {
            if (iconCache[name]) return iconCache[name];
            var data = window.lucide && window.lucide.icons && window.lucide.icons[name];
            var Comp = function (props) {
              props = props || {};
              var size = props.size || 24;
              var stroke = props.color || "currentColor";
              var strokeWidth = props.strokeWidth != null ? props.strokeWidth : 2;
              var children = [];
              if (data && Array.isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                  var node = data[i];
                  if (Array.isArray(node) && node.length >= 2) {
                    children.push(React.createElement(node[0], Object.assign({ key: i }, node[1])));
                  }
                }
              }
              return React.createElement("svg", {
                xmlns: "http://www.w3.org/2000/svg",
                width: size,
                height: size,
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: stroke,
                strokeWidth: strokeWidth,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                className: props.className,
                style: props.style,
              }, children);
            };
            Comp.displayName = name;
            iconCache[name] = Comp;
            return Comp;
          }

          function pascalToKebab(name) {
            return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
          }
          var lucideKebabSet = {};
          for (var k = 0; k < lucideIconNames.length; k++) lucideKebabSet[lucideIconNames[k]] = true;

          var iconGlobals = {};
          for (var i = 0; i < lucideIconNames.length; i++) {
            var kebab = lucideIconNames[i];
            var pascal = kebab.split("-").map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join("");
            iconGlobals[pascal] = makeIconComponent(kebab);
          }

          var motionShim = new Proxy({}, {
            get: function (_, key) {
              return function (props) {
                props = props || {};
                var clean = {};
                for (var p in props) {
                  if (p === "initial" || p === "animate" || p === "exit" || p === "transition" || p === "variants" || p === "whileHover" || p === "whileTap" || p === "whileInView" || p === "viewport" || p === "layout" || p === "layoutId") continue;
                  clean[p] = props[p];
                }
                return React.createElement(String(key), clean, props.children);
              };
            },
          });

          var globals = Object.assign({}, iconGlobals, {
            React: React,
            ReactDOM: ReactDOM,
            Fragment: React.Fragment,
            useState: React.useState,
            useEffect: React.useEffect,
            useMemo: React.useMemo,
            useRef: React.useRef,
            useCallback: React.useCallback,
            useReducer: React.useReducer,
            useLayoutEffect: React.useLayoutEffect,
            useId: React.useId,
            motion: motionShim,
            AnimatePresence: function (props) { return React.createElement(React.Fragment, null, props && props.children); },
            Link: function (props) {
              props = props || {};
              return React.createElement("a", Object.assign({}, props, { href: props.href }), props.children);
            },
            Image: function (props) {
              props = props || {};
              return React.createElement("img", {
                alt: props.alt || "",
                src: props.src,
                className: props.className,
                width: props.width,
                height: props.height,
                style: props.style,
              });
            },
          });

          var compiled = window.Babel.transform(${sourceLiteral}, {
            filename: "GeneratedComponent.tsx",
            presets: [
              ["typescript", { isTSX: true, allExtensions: true }],
              ["react", { runtime: "classic" }],
            ],
          }).code;

          var argNames = Object.keys(globals);
          var argValues = argNames.map(function (n) { return globals[n]; });
          var componentName = ${nameLiteral};
          var body = compiled + "\\n;return typeof " + componentName + " !== 'undefined' ? " + componentName + " : null;";
          var factory = new Function(argNames.join(","), body);
          var Component = factory.apply(null, argValues);

          if (typeof Component !== "function") {
            throw new Error("El componente generado no es una función React válida.");
          }

          var root = ReactDOM.createRoot(document.getElementById("root"));
          root.render(React.createElement(Component));
        } catch (err) {
          reportError(err);
        }
      })();
    </script>
  </body>
</html>`;
}