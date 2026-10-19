// Reúne en build/desktop todo lo que Electron necesita: la web (Next standalone
// + estáticos + public) y el servidor local de Code empaquetado en un único .cjs.
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "build", "desktop");
const standalone = path.join(root, ".next", "standalone");

if (!existsSync(path.join(standalone, "server.js"))) {
  console.error("Falta .next/standalone. Ejecuta `npm run build` antes (output: standalone).");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync(standalone, path.join(out, "web"), { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(out, "web", ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(out, "web", "public"), { recursive: true });

await build({
  entryPoints: [path.join(root, "server", "index.ts")],
  outfile: path.join(out, "server.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["bufferutil", "utf-8-validate"], // dependencias nativas opcionales de ws
  logLevel: "info",
});

console.log("Listo: build/desktop");
