import type { Metadata } from "next";
import { LegalDoc, Owner } from "@/components/legal/LegalDoc";
import { LEGAL } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Política de privacidad — NimChat" };

export default function PrivacidadPage() {
  return (
    <LegalDoc title="Política de privacidad">
      <p>
        Esta política cumple el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
        {" "}{LEGAL.appName} no tiene cuentas de usuario ni base de datos propia.
      </p>

      <h2>1. Responsable</h2>
      <p>
        <Owner field="ownerName" label="nombre o razón social" />, NIF/CIF{" "}
        <Owner field="ownerTaxId" label="NIF/CIF" />, domicilio{" "}
        <Owner field="ownerAddress" label="domicilio" />, contacto{" "}
        <Owner field="contactEmail" label="correo de contacto" />.
      </p>

      <h2>2. Qué datos se tratan y dónde</h2>
      <ul>
        <li><strong>En tu navegador (localStorage):</strong> chats, ajustes, tu clave de API de NVIDIA y la caché de la lista de modelos. Se quedan en tu dispositivo; el titular no tiene acceso a ellos.</li>
        <li><strong>Mensajes enviados a la IA:</strong> el texto que escribes (y el código o archivos que el modo Code incluya) se envía a través del endpoint <code>/api/chat</code> a NVIDIA NIM para generar la respuesta. El endpoint reenvía la petición y no la almacena.</li>
        <li><strong>Clave de API:</strong> viaja en una cabecera en cada petición para autenticarte ante NVIDIA. No se guarda en el servidor.</li>
        <li><strong>Registros técnicos del alojamiento:</strong> el proveedor donde se despliegue la web puede registrar datos técnicos (IP, fecha, ruta) por seguridad y funcionamiento.</li>
        <li><strong>Servidor local (modo Code):</strong> escucha solo en tu equipo (localhost) y no envía datos al titular.</li>
      </ul>

      <h2>3. Finalidad y base jurídica</h2>
      <ul>
        <li>Prestarte el servicio que solicitas, es decir, procesar tus mensajes con el modelo elegido (art. 6.1.b RGPD).</li>
        <li>Seguridad y correcto funcionamiento técnico (interés legítimo, art. 6.1.f RGPD).</li>
      </ul>

      <h2>4. Destinatarios y transferencias internacionales</h2>
      <p>
        Tus mensajes los recibe <strong>NVIDIA</strong> como proveedor de los modelos, bajo sus propias
        condiciones y política de privacidad (consúltalas en nvidia.com). NVIDIA puede tratar datos
        fuera del Espacio Económico Europeo, amparándose en los mecanismos de transferencia que
        ella determine. No introduzcas datos personales sensibles, secretos, credenciales ni
        información confidencial de terceros si no quieres que lleguen a ese proveedor.
      </p>

      <h2>5. Conservación</h2>
      <p>
        Los datos locales se conservan hasta que los borres (borrando los chats o los datos del
        sitio en tu navegador). El titular no conserva el contenido de tus conversaciones.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y
        portabilidad escribiendo a <Owner field="contactEmail" label="correo de contacto" />. Dado que
        el titular no conserva tus conversaciones, la mayoría de datos puedes gestionarlos tú
        directamente en tu navegador. Si consideras vulnerados tus derechos, puedes reclamar ante
        la Agencia Española de Protección de Datos (<a href="https://www.aepd.es">aepd.es</a>).
      </p>

      <h2>7. Menores</h2>
      <p>El servicio no está dirigido a menores de 14 años. Si eres menor, no lo uses sin el consentimiento de tus progenitores o tutores.</p>

      <h2>8. Decisiones automatizadas e IA</h2>
      <p>
        Estás interactuando con sistemas de inteligencia artificial, no con una persona. El
        servicio no toma decisiones con efectos jurídicos sobre ti.
      </p>
    </LegalDoc>
  );
}
