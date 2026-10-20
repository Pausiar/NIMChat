# NimChat

Una interfaz web local, moderna y funcional para los mejores modelos open‑source de LLM, servidos a través de la API gratuita de **NVIDIA NIM** (compatible con OpenAI). Pensada como alternativa gratuita a ChatGPT / Claude.ai.

![stack](https://img.shields.io/badge/Next.js-15-black) ![ts](https://img.shields.io/badge/TypeScript-5-blue) ![tailwind](https://img.shields.io/badge/TailwindCSS-3-06b6d4)

---

## ✨ Funcionalidades

- **Chat con streaming token a token** y memoria completa de conversación.
- **Multi‑modelo con catálogo en vivo**: el selector lee la lista actual de NVIDIA NIM (con caché y fallback local).
- **Modo Code con agentes**: pide «usa agentes» y un orquestador reparte el trabajo entre subagentes en paralelo, cada uno con su modelo.
- **Instalable (PWA)** y página `/descargar`.
- **Información legal** en `/legal/*` (rellena tus datos en `lib/legal-config.ts`).
- **Gestión de chats** persistente en `localStorage`: crear, renombrar (doble clic), eliminar (con confirmación). Auto‑título a partir del primer mensaje.
- **System prompt** configurable global y por chat.
- **Parámetros de generación** ajustables: `temperature`, `max_tokens`, `top_p`.
- **Renderizado Markdown** con syntax highlighting y botón de copiar bloques de código.
- **Botón de detener** la generación en curso (`AbortController`).
- **Responsive** con sidebar colapsable.
- **Tema oscuro** moderno (`#0a0a0b` / `#111113`).
- **Sin base de datos**: todo vive en el cliente; el endpoint `/api/chat` solo hace de proxy.

---

## 🧑‍💻 Modo Code

Organizado como Claude Code: a la izquierda tus **proyectos con sus sesiones** de chat (cada proyecto, con su carpeta), en el centro el **chat** del agente —con una vista de **código** que muestra el explorador, el editor, la terminal y los cambios con el chat más pequeño debajo— y a la derecha las pestañas **Agentes**, **Contexto** y **Conectores**.

- **Continuar:** si el agente se detiene (límite de pasos, error de la API o cancelación) aparece el botón *Continuar*, que sigue con la misma conversación sin empezar de cero.
- **Contexto:** cuando la conversación crece, el agente la compacta solo (resumen) y lo guarda en `context_agent.md`, que además mantiene al trabajar. Desde la pestaña *Contexto* puedes verlo y compactar a mano.
- **Explorador:** el agente puede delegar en un subagente de solo lectura que lee los archivos y le dice cuáles tocar, para mantener su contexto pequeño.
- **Límites de la API:** pausa configurable entre peticiones (Ajustes) y reintentos automáticos ante errores 429.

## 🎨 Modo Design

Genera interfaces en **HTML, CSS y JavaScript** (sin compilar), las muestra en un iframe aislado y deja editar cada parte por separado.

## 🔌 Conectores MCP

En el modo **Code** (botón *conectores*) puedes añadir servidores [MCP](https://modelcontextprotocol.io) por comando local (stdio) o por URL (http): GitHub, bases de datos PostgreSQL, sistema de archivos, Brave Search, memoria o cualquier otro. El agente (y los subagentes) usan sus herramientas como `mcp__<conector>__<herramienta>`.

- Por defecto solo se ofrecen las herramientas marcadas como **solo lectura**; las de escritura hay que permitirlas por conector.
- La configuración (con tus claves) se guarda en `~/.nimchat/mcp.json` con permisos solo para tu usuario.
- Los conectores por comando (`npx …`) necesitan Node.js instalado; los remotos (URL) no.

## 📂 Abrir proyectos y archivos

En Code, el selector de proyecto (arriba a la izquierda) abre **carpetas y archivos** con el explorador de Windows (app de escritorio) y recuerda los proyectos recientes.

## 🖥️ App de escritorio (Windows)

Descarga `NimChat-Setup-x.y.z.exe` desde [Releases](https://github.com/Pausiar/NIMChat/releases/latest) e instálala. Incluye la interfaz y el servidor local de Code: no hay que arrancar nada a mano. Los proyectos por defecto viven en `Documentos/NimChat Projects` y puedes abrir otra carpeta con **Archivo → Abrir carpeta de proyecto**.

> Windows puede mostrar un aviso de SmartScreen porque la app aún no está firmada.

**Actualizaciones desde la app:** NimChat comprueba solo si hay una versión nueva en [Releases](https://github.com/Pausiar/NIMChat/releases) (al abrir y cada pocas horas). Cuando la hay, aparece un aviso arriba: pulsa *actualizar*, se descarga y *reiniciar para actualizar* la instala y reabre la app. También puedes buscarlas a mano en Ajustes. Para que una versión llegue a los usuarios, el release debe incluir `latest.yml` (lo sube el workflow).

Para generarla tú mismo: `npm install && npm run desktop:dist` (instalador en `release/`). Para probarla sin empaquetar: `npm run desktop`. El instalador de Windows también lo construye GitHub Actions (`.github/workflows/desktop-release.yml`) y lo adjunta al publicar un release.

## 🚀 Instalación (versión web)

```bash
# 1. Instala dependencias
npm install

# 2. Arranca el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

> Requiere Node.js **18.18+** o **20+**.

### Build de producción

```bash
npm run build
npm start
```

---

## 🔑 Cómo conseguir una API key de NVIDIA NIM (gratis)

1. Entra en [https://build.nvidia.com](https://build.nvidia.com).
2. Crea una cuenta (sirve cualquier email; también con GitHub o Google).
3. Elige cualquier modelo (p. ej. `meta/llama-3.3-70b-instruct`).
4. Pulsa **"Get API Key"** en el panel de la derecha.
5. Copia la key (empieza por `nvapi-...`).
6. En NimChat: pulsa **Configurar API key** o ve a **Ajustes** y pégala.

> La key se guarda **solo en tu navegador** (`localStorage`) y se envía en cada petición vía la cabecera `x-nvidia-api-key` al endpoint local `/api/chat`, que la reenvía a NVIDIA. Como alternativa, puedes definir `NVIDIA_API_KEY` en `.env.local` y omitir la del cliente.

NVIDIA ofrece **1.000 créditos gratis** al registrarte y un cupo mensual generoso para uso personal.

---

## 🧠 Modelos recomendados

| Modelo | Mejor para |
| ------ | ---------- |
| `meta/llama-3.3-70b-instruct` | Uso general, conversación, multilingüe |
| `qwen/qwen2.5-72b-instruct` | Código, matemáticas, razonamiento |
| `deepseek-ai/deepseek-r1` | Razonamiento profundo, problemas complejos |
| `mistralai/mistral-7b-instruct-v0.3` | Respuestas rápidas, baja latencia |
| `microsoft/phi-3-mini-128k-instruct` | Contexto muy largo (128k) en un modelo pequeño |

Puedes editar la lista en [`lib/models.ts`](lib/models.ts).

---

## 📂 Estructura

```
app/
├── page.tsx                    # Layout principal con sidebar + chat
├── layout.tsx
├── globals.css
└── api/chat/route.ts           # Proxy streaming a NVIDIA NIM (Edge Runtime)

components/
├── ui/                         # shadcn primitives (button, dialog, slider...)
├── chat/
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   ├── ChatInput.tsx
│   └── TypingIndicator.tsx
├── sidebar/
│   ├── Sidebar.tsx
│   ├── ChatList.tsx
│   └── NewChatButton.tsx
├── settings/
│   ├── SettingsModal.tsx
│   ├── ApiKeyInput.tsx
│   └── ModelSelector.tsx
└── shared/
    └── MarkdownRenderer.tsx

lib/
├── nvidia-nim.ts               # Cliente que llama a /api/chat
├── chat-storage.ts             # Tipos + helpers de localStorage
├── models.ts                   # Catálogo estático de modelos
└── utils.ts
```

---

## ⌨️ Atajos

- `Enter` → Enviar
- `Shift + Enter` → Nueva línea
- `Doble clic` en un chat → Renombrar

---

## 🔒 Notas de seguridad

- La API key vive en `localStorage`. Cualquier extensión maliciosa o XSS podría leerla — no compartas tu navegador.
- El endpoint `/api/chat` es un simple proxy sin caching. Para uso multi‑usuario, mueve la key a una variable de entorno y elimina el header `x-nvidia-api-key`.

---

## 📝 Licencia

MIT
