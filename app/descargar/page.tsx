import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Descargar NimChat",
  description: "Instala NimChat como aplicación en tu ordenador o móvil.",
};

const STEPS = [
  {
    title: "Chrome o Edge (Windows, macOS, Linux)",
    body: "Abre NimChat y pulsa el icono de instalar que aparece en la barra de direcciones, o el menú ⋮ → «Instalar NimChat».",
  },
  {
    title: "Android (Chrome)",
    body: "Menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».",
  },
  {
    title: "iPhone y iPad (Safari)",
    body: "Botón Compartir → «Añadir a pantalla de inicio».",
  },
];

const INSTALLER_URL = "https://github.com/Pausiar/NIMChat/releases/latest";

export default function DescargarPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-white">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        ← Volver a NimChat
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">
        Descarga <span className="text-nim-yellow">NimChat</span>
      </h1>
      <p className="mt-3 text-white/70">
        NimChat se instala como aplicación desde el navegador: se abre en su
        propia ventana, con su icono y disponible sin conexión para la interfaz.
        Tus chats y tu API key se guardan solo en tu dispositivo.
      </p>

      <section className="mt-8 rounded-xl border border-nim-yellow/30 bg-nim-yellow/5 p-5">
        <h2 className="text-lg font-medium">Aplicación de escritorio para Windows</h2>
        <p className="mt-1 text-sm text-white/60">
          Instalador .exe con todo incluido: chat, Design y Code con agentes, sin
          servidores ni comandos. Descarga <strong>NimChat-Setup</strong> desde la última versión.
        </p>
        <a
          href={INSTALLER_URL}
          className="mt-4 inline-block rounded-lg bg-nim-yellow px-4 py-2 text-sm font-medium text-black hover:bg-nim-yellow/90"
        >
          Descargar instalador (.exe)
        </a>
        <p className="mt-3 text-xs text-white/40">
          Windows puede mostrar el aviso «Windows protegió su PC» (SmartScreen) porque la app
          todavía no tiene firma de código. Pulsa «Más información» y después «Ejecutar de todas
          formas». Descarga siempre desde este repositorio oficial.
        </p>
      </section>

      <h2 className="mt-10 text-xl font-medium">O instálala desde el navegador</h2>
      <section className="mt-4 space-y-4">
        {STEPS.map((s) => (
          <div key={s.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="font-medium">{s.title}</h2>
            <p className="mt-1 text-sm text-white/60">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-medium">Modo Code desde el navegador</h2>
        <p className="mt-2 text-sm text-white/60">
          Si usas la versión web, el modo Code necesita el servidor local para leer
          archivos y ejecutar comandos en tu equipo (la app de escritorio ya lo incluye):
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/80">
{`git clone https://github.com/Pausiar/NIMChat.git
cd NIMChat
npm install
npm run server   # servidor local en :4177
npm run dev      # interfaz en :3000`}
        </pre>
      </section>

      <p className="mt-10 text-xs text-white/40">
        Instaladores para macOS y Linux todavía no disponibles.
      </p>
      <nav aria-label="Información legal" className="mt-4 flex flex-wrap gap-x-4 text-xs text-white/40">
        <Link href="/legal/aviso-legal" className="hover:text-white">Aviso legal</Link>
        <Link href="/legal/privacidad" className="hover:text-white">Privacidad</Link>
        <Link href="/legal/terminos" className="hover:text-white">Términos</Link>
        <Link href="/legal/almacenamiento" className="hover:text-white">Almacenamiento</Link>
      </nav>
    </main>
  );
}
