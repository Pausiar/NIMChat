# NimChat — Contexto del proyecto

## Qué es

NimChat es una **suite local de IA para desarrolladores** construida con Next.js 15 (App Router), React 19 y TypeScript.
Usa los modelos open-source servidos por **NVIDIA NIM** (`https://integrate.api.nvidia.com/v1/...`) como motor de razonamiento.

La app se ejecuta entera en local: el frontend es un Next.js dev/prod server, y un **servidor Node auxiliar** (Express + WebSocket) actúa de puente con el sistema de archivos y la terminal del usuario para los modos avanzados.

## Stack

- Next.js 15.5.18, React 19, TypeScript 5.6 estricto.
- Tailwind CSS + shadcn/ui + lucide-react + framer-motion.
- Babel standalone para validar y renderizar componentes generados (Design Mode).
- Express 5 + ws + simple-git + chokidar + tsx para el servidor local (Code Mode).
- Storage: `localStorage` para chats/ajustes; sin base de datos.

## Arquitectura

```
app/                Next.js App Router (UI principal, /api/chat proxy a NVIDIA NIM)
components/
  chat/             Modo Chat (mensajes, input, historial)
  design/           Modo Design (prompt → JSX → preview en iframe sandbox)
  code/             Modo Code (agente local con tools)
  agents/           Placeholder — futuro modo Agentes multi-tarea
  image/            Placeholder — futuro modo Image (generación de imagen)
  dock/             Dock inferior macOS-like para cambiar de modo
  settings/         Modal de ajustes (API key, modelo, system prompt)
  shared/, ui/, sidebar/
lib/
  nvidia-nim.ts     Cliente streaming hacia /api/chat
  chat-storage.ts   Persistencia local de chats/ajustes
  models.ts         Catálogo curado + fusión con la lista viva de NIM (/api/models)
  agents.ts         Modo agentes: detección, herramientas delegate_task/send_message, buzón
  legal-config.ts   Datos del titular para las páginas /legal (rellenar)
  server-client.ts  Cliente HTTP/WS hacia el servidor local de Code Mode
  tools.ts          Definición y ejecución de herramientas del agente
  agent-loop.ts     Bucle agente con tool-calling y fallback JSON
server/             Servidor Node local (Express + WebSocket)
  index.ts          Bootstrap, /api/health, /api/project/info
  routes/files.ts   Listar/leer/escribir/editar/renombrar/borrar archivos
  routes/terminal.ts /api/terminal/exec + WS /ws/terminal
  routes/git.ts     status / diff / commit / discard
  utils/security.ts resolución de paths, ignorados, comandos peligrosos
public/             Logos NIMChat
```

## Modos

| Modo     | Estado       | Descripción                                                           |
|----------|--------------|-----------------------------------------------------------------------|
| Chat     | Activo       | Conversación clásica con NVIDIA NIM, streaming de tokens.             |
| Design   | Activo       | Genera componentes React/Tailwind y los renderiza en iframe sandbox.   |
| Code     | Activo       | Agente autónomo que lee/edita archivos y ejecuta comandos vía servidor local. |
| Agents   | Dentro de Code | Se activa cuando el usuario pide agentes en su tarea: orquestador + subagentes en paralelo (lib/agents.ts, lib/agent-loop.ts). |
| Image    | Próximamente | Generación de imágenes con modelos NIM de visión.                      |

## Cómo se ejecuta

```powershell
npm install
npm run server          # arranca servidor local en http://localhost:4177
npm run dev -- --port 3000   # en otra terminal, frontend Next.js
```

Variables opcionales:

- `NIMCHAT_SERVER_PORT` — puerto del servidor local (default 4177).
- `NIMCHAT_PROJECT_ROOT` — directorio raíz inicial del agente (default `cwd`).

La API key de NVIDIA NIM se configura en **Ajustes** dentro de la UI; se guarda en `localStorage` del navegador y nunca se envía al servidor local.

## Seguridad

- El servidor local solo escucha en `localhost`.
- `resolveProjectPath` impide path traversal fuera del root activo.
- Comandos peligrosos (`rm -rf`, `git reset --hard`, `format`, `shutdown`, …) requieren confirmación explícita.
- Los borrados de archivos requieren `confirm=true`.
- Carpetas grandes/irrelevantes (`node_modules`, `.git`, `.next`, `dist`, `build`) se ignoran al listar.

## Tema visual

NimChat usa una paleta **amarillo / negro** (NIM brand). Los tokens viven en
`app/globals.css` (variables CSS HSL) y `tailwind.config.ts` (colores `nim.*`).

## Convenciones

- Estilo Tailwind, sin CSS modules.
- Componentes cliente marcados con `"use client"`.
- Tipos compartidos junto al componente, no en un barrel global.
- No subir las carpetas adjuntas `opencode/` u `open-design/`: son material de referencia, ya están en `.gitignore`.

## Roadmap corto

- Modo Image: generación con modelos NIM de imagen.
- Editor con Shiki y terminal con xterm en Code Mode.
- Modo supervisado/autónomo + diff-before-apply para el agente.

## Modo agentes (dentro de Code)

- Se activa si la tarea menciona agentes/subagentes/orquestador (`wantsAgents`).
- El orquestador recibe `delegate_task` y `send_message`; varios `delegate_task` en un turno corren en paralelo (máx. 4 a la vez, 8 por ejecución).
- Cada subagente puede usar un modelo distinto (id del catálogo vivo; si no existe, hereda el del orquestador) y se comunica por un buzón compartido.
- La UI (AgentPanel) muestra tarjetas por agente, la conversación entre ellos y cada acción etiquetada con su agente.

## Legal

Páginas en `app/legal/*` (aviso legal, privacidad, términos, almacenamiento local). Los datos del titular se rellenan en `lib/legal-config.ts`; mientras estén vacíos se muestran como «PENDIENTE». Revisar con un profesional antes de publicar.

## App de escritorio (Electron)

- `electron/main.cjs` abre la ventana; `electron/runtime.cjs` arranca en proceso la web (Next `output: "standalone"`) y el servidor de Code (empaquetado con esbuild en `build/desktop/server.cjs`).
- `scripts/prepare-desktop.mjs` reúne todo en `build/desktop`; `electron-builder` (config en `package.json > build`) genera el instalador NSIS en `release/`.
- El servidor de Code usa el puerto fijo 4177 (la interfaz lo tiene como URL por defecto); la web usa el primer puerto libre desde 4178.
- El servidor local solo acepta peticiones sin `Origin` (la app) o de los orígenes en `NIMCHAT_ALLOWED_ORIGINS` (por defecto `localhost:3000`). Esto impide que una web ajena ejecute comandos vía localhost.
- CI: `.github/workflows/desktop-release.yml` construye el `.exe` en Windows y lo adjunta al release.

## Interfaz (v1.0)

- Estilo «terminal»: negro neutro, amarillo `#facc15` solo para acciones principales y estados activos, tipografía monoespaciada (`.ui-mono`) para la interfaz y sans para el contenido. Una única barra superior (`components/shell/TopBar.tsx`) con los modos chat · design · code; sin dock flotante.
- Selector de modelos compartido: `components/shared/ModelPicker.tsx` (con búsqueda y catálogo en vivo).

## Conectores MCP

- `server/mcp/manager.ts` (SDK oficial `@modelcontextprotocol/sdk`): conexión stdio/http(SSE de respaldo), configuración en `~/.nimchat/mcp.json` (0600), secretos enmascarados hacia la UI y conservados al editar.
- `server/routes/mcp.ts` → `/api/mcp/{servers,tools,call}`. `allowWrites=false` por defecto: solo herramientas con `readOnlyHint`.
- `lib/agent-loop.ts` añade las herramientas MCP como `mcp__<servidor>__<herramienta>` al agente, orquestador y subagentes.
- UI: `components/code/ConnectorsDialog.tsx` (plantillas GitHub, Archivos, PostgreSQL, Brave, Memoria).

## Abrir carpetas/archivos

- `electron/preload.cjs` expone `window.nimchatDesktop.{pickFolder,pickFile}` (IPC validado por origen). `lib/desktop.ts` lo consume; sin Electron se pide la ruta en un diálogo de texto.
- `components/code/ProjectMenu.tsx` + `lib/recent-projects.ts` (recientes en localStorage). Al cambiar de proyecto se limpia la tarea/acciones del anterior.
