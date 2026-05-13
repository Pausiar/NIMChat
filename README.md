# NimChat

Una interfaz web local, moderna y funcional para los mejores modelos open‑source de LLM, servidos a través de la API gratuita de **NVIDIA NIM** (compatible con OpenAI). Pensada como alternativa gratuita a ChatGPT / Claude.ai.

![stack](https://img.shields.io/badge/Next.js-15-black) ![ts](https://img.shields.io/badge/TypeScript-5-blue) ![tailwind](https://img.shields.io/badge/TailwindCSS-3-06b6d4)

---

## ✨ Funcionalidades

- **Chat con streaming token a token** y memoria completa de conversación.
- **Multi‑modelo**: Llama 3.3 70B, Mistral 7B, Qwen 2.5 72B, DeepSeek‑R1, Phi‑3 Mini.
- **Gestión de chats** persistente en `localStorage`: crear, renombrar (doble clic), eliminar (con confirmación). Auto‑título a partir del primer mensaje.
- **System prompt** configurable global y por chat.
- **Parámetros de generación** ajustables: `temperature`, `max_tokens`, `top_p`.
- **Renderizado Markdown** con syntax highlighting y botón de copiar bloques de código.
- **Botón de detener** la generación en curso (`AbortController`).
- **Responsive** con sidebar colapsable.
- **Tema oscuro** moderno (`#0a0a0b` / `#111113`).
- **Sin base de datos**: todo vive en el cliente; el endpoint `/api/chat` solo hace de proxy.

---

## 🚀 Instalación

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
