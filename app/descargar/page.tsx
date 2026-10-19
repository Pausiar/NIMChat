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

export default function DescargarPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-white">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        ← Volver a NimChat
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">
        Instala <span className="text-nim-yellow">NimChat</span>
      </h1>
      <p className="mt-3 text-white/70">
        NimChat se instala como aplicación desde el navegador: se abre en su
        propia ventana, con su icono y disponible sin conexión para la interfaz.
        Tus chats y tu API key se guardan solo en tu dispositivo.
      </p>

      <section className="mt-8 space-y-4">
        {STEPS.map((s) => (
          <div key={s.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="font-medium">{s.title}</h2>
            <p className="mt-1 text-sm text-white/60">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-medium">Modo Code (agente local)</h2>
        <p className="mt-2 text-sm text-white/60">
          El modo Code necesita el servidor local para leer archivos y ejecutar
          comandos en tu equipo:
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
        Instaladores nativos (.exe, .dmg) todavía no disponibles: requieren
        firma de código oficial.
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
