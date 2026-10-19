import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/LegalDoc";
import { LEGAL } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Cookies y almacenamiento local — NimChat" };

const ITEMS = [
  ["nimchat:chats", "Tus conversaciones", "Hasta que las borres"],
  ["nimchat:settings", "Ajustes y clave de API", "Hasta que los borres"],
  ["nimchat:active-chat", "Último chat abierto", "Hasta que lo borres"],
  ["nimchat:active-mode", "Último modo abierto (Chat, Design, Code)", "Hasta que lo borres"],
  ["nimchat:code:state:<proyecto>", "Tarea y acciones del agente Code por proyecto", "Hasta que lo borres"],
  ["nimchat:model-catalog", "Caché de la lista de modelos", "1 hora (se renueva sola)"],
  ["Service worker / caché", "Interfaz disponible sin conexión (instalación como app)", "Hasta que se actualice o desinstales la app"],
];

export default function AlmacenamientoPage() {
  return (
    <LegalDoc title="Cookies y almacenamiento local">
      <p>
        {LEGAL.appName} <strong>no usa cookies</strong> de analítica, publicidad ni seguimiento, y no
        incluye herramientas de terceros que las instalen. Solo usa almacenamiento local del
        navegador (localStorage y la caché del service worker), imprescindible para que la
        aplicación funcione y que tú solicitas al usarla. Por ello, conforme al artículo 22.2 de la
        LSSI-CE, no requiere consentimiento mediante banner de cookies.
      </p>

      <h2>Qué se guarda</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-white">
            <tr>
              <th className="py-2 pr-4">Clave</th>
              <th className="py-2 pr-4">Finalidad</th>
              <th className="py-2">Duración</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map(([key, purpose, duration]) => (
              <tr key={key} className="border-t border-white/10">
                <td className="py-2 pr-4 font-mono text-xs">{key}</td>
                <td className="py-2 pr-4">{purpose}</td>
                <td className="py-2">{duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Cómo borrarlo</h2>
      <p>
        Borra los chats desde la barra lateral o elimina los datos del sitio desde los ajustes de
        tu navegador. Si instalaste la app, desinstálala desde el navegador o el sistema para
        eliminar también su caché. Tu clave de API estará visible para cualquier extensión o
        software con acceso a tu navegador; no uses {LEGAL.appName} en equipos compartidos.
      </p>
    </LegalDoc>
  );
}
