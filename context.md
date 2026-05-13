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
  models.ts         Catálogo de modelos NIM
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
| Agents   | Próximamente | Orquestación de varios agentes especializados.                         |
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

- Modo Agents: orquestador multi-agente con planificación y delegación.
- Modo Image: generación con modelos NIM de imagen.
- Editor con Shiki y terminal con xterm en Code Mode.
- Modo supervisado/autónomo + diff-before-apply para el agente.
