/**
 * Diseños web «planos»: HTML + CSS + JavaScript sin compilación. El estado guarda
 * un documento HTML completo; el editor lo separa en tres partes y lo recompone.
 */
export interface WebParts {
  html: string;
  css: string;
  js: string;
}

export const EMPTY_PARTS: WebParts = { html: "", css: "", js: "" };

export function composeDocument(parts: WebParts): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NimChat Design</title>
<style>
${parts.css.trim()}
</style>
</head>
<body>
${parts.html.trim()}
<script>
${parts.js.trim()}
</script>
</body>
</html>
`;
}

export function isWebDocument(code: string): boolean {
  return /^\s*<!doctype html/i.test(code);
}

const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const INLINE_SCRIPT = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

/** Separa un documento HTML en cuerpo, estilos y scripts. */
export function splitDocument(doc: string): WebParts {
  const css: string[] = [];
  const js: string[] = [];
  let rest = doc.replace(STYLE_BLOCK, (_m, content: string) => {
    css.push(content.trim());
    return "";
  });
  rest = rest.replace(INLINE_SCRIPT, (_m, content: string) => {
    if (content.trim()) js.push(content.trim());
    return "";
  });
  const body = /<body\b[^>]*>([\s\S]*?)(?:<\/body>|$)/i.exec(rest);
  let html = body ? body[1] : rest;
  if (!body) {
    html = html
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<\/?html\b[^>]*>/gi, "")
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "");
  }
  return { html: html.trim(), css: css.join("\n\n"), js: js.join("\n\n") };
}

const FENCE = /```[ \t]*([\w+-]*)[ \t]*\r?\n([\s\S]*?)(?:```|$)/g;

/**
 * Extrae html/css/js de la respuesta del modelo: tres bloques de código, o un
 * único documento con <style> y <script> incrustados.
 */
export function extractWebParts(raw: string): WebParts {
  const blocks: { lang: string; code: string }[] = [];
  let match: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  while ((match = FENCE.exec(raw))) blocks.push({ lang: match[1].toLowerCase(), code: match[2].trim() });

  const find = (...langs: string[]) => blocks.find((b) => langs.includes(b.lang))?.code ?? "";
  let html = find("html", "htm", "xml");
  let css = find("css");
  let js = find("js", "javascript", "jsx", "mjs");

  if (!html && blocks.length === 0) {
    // Sin bloques de código: el modelo devolvió el HTML directamente.
    const start = raw.search(/<!doctype|<html|<body|<div|<main|<section|<header|<style/i);
    html = start >= 0 ? raw.slice(start).trim() : "";
  }
  if (!html && !css && !js) {
    throw new Error("El modelo no devolvió HTML. Intenta reformular el prompt.");
  }

  // El bloque html puede venir como documento completo o con <style>/<script> dentro.
  if (/<style\b|<script\b|<body\b|<html\b|<!doctype/i.test(html)) {
    const parts = splitDocument(html);
    html = parts.html;
    css = [parts.css, css].filter(Boolean).join("\n\n");
    js = [parts.js, js].filter(Boolean).join("\n\n");
  }
  if (!html.trim()) throw new Error("El modelo no devolvió HTML. Intenta reformular el prompt.");
  return { html, css, js };
}

/** Comprueba la sintaxis del JavaScript sin ejecutarlo. */
export function checkJs(js: string): string | null {
  if (!js.trim()) return null;
  try {
    // new Function solo compila: aquí el código no se ejecuta.
    new Function(js);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Puente de errores de ejecución: el iframe avisa al panel. Solo para la vista previa. */
const ERROR_BRIDGE = `<script>
(function(){
  function send(m){try{parent.postMessage({type:"nimchat-design-error",message:String(m)},"*")}catch(e){}}
  window.addEventListener("error",function(e){send(e.message||"Error de JavaScript")});
  window.addEventListener("unhandledrejection",function(e){send(e.reason&&e.reason.message?e.reason.message:e.reason)});
})();
</script>`;

export function previewDocument(doc: string): string {
  return /<head[^>]*>/i.test(doc)
    ? doc.replace(/<head([^>]*)>/i, (m) => `${m}\n${ERROR_BRIDGE}`)
    : `${ERROR_BRIDGE}\n${doc}`;
}

export function buildStandaloneHtml(code: string): string {
  return code;
}
