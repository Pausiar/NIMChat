import type { Metadata } from "next";
import { LegalDoc, Owner } from "@/components/legal/LegalDoc";
import { LEGAL } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Aviso legal — NimChat" };

export default function AvisoLegalPage() {
  return (
    <LegalDoc title="Aviso legal">
      <h2>1. Titular del sitio</h2>
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la
        Información y de Comercio Electrónico (LSSI-CE), se informa de que el titular de {LEGAL.appName} es:
      </p>
      <ul>
        <li>Titular: <Owner field="ownerName" label="nombre o razón social" /></li>
        <li>NIF/CIF: <Owner field="ownerTaxId" label="NIF/CIF" /></li>
        <li>Domicilio: <Owner field="ownerAddress" label="domicilio" /></li>
        <li>Correo electrónico: <Owner field="contactEmail" label="correo de contacto" /></li>
      </ul>

      <h2>2. Objeto</h2>
      <p>
        {LEGAL.appName} es una interfaz de software que permite conversar con modelos de
        inteligencia artificial de terceros servidos por NVIDIA NIM, generar componentes de
        interfaz y, mediante un servidor local opcional, trabajar sobre proyectos de código en el
        equipo del propio usuario. El titular no desarrolla ni entrena los modelos.
      </p>

      <h2>3. Propiedad intelectual</h2>
      <p>
        El código de {LEGAL.appName} se distribuye bajo licencia MIT (<a href={LEGAL.repoUrl}>repositorio</a>).
        Los nombres y marcas de terceros (NVIDIA, Meta, Mistral AI, Alibaba, DeepSeek, Google,
        Microsoft, Moonshot AI, Z.ai y otros) pertenecen a sus titulares y se citan solo para
        identificar los modelos disponibles; no implican patrocinio ni afiliación. Cada modelo
        se rige por su propia licencia, que el usuario debe respetar.
      </p>

      <h2>4. Responsabilidad</h2>
      <ul>
        <li>Las respuestas generadas por IA pueden ser inexactas, incompletas u ofensivas. No constituyen asesoramiento profesional (jurídico, médico, financiero u otro).</li>
        <li>El titular no garantiza la disponibilidad continua del servicio ni de los servicios de terceros de los que depende (NVIDIA NIM).</li>
        <li>El modo Code puede leer, modificar y borrar archivos y ejecutar comandos en el equipo del usuario. El usuario es responsable de revisar los cambios y de mantener copias de seguridad.</li>
      </ul>

      <h2>5. Enlaces a terceros</h2>
      <p>
        {LEGAL.appName} puede enlazar a sitios de terceros (por ejemplo, build.nvidia.com para
        obtener una clave de API). El titular no controla ni responde de sus contenidos.
      </p>

      <h2>6. Legislación y jurisdicción</h2>
      <p>
        Este aviso se rige por la legislación española. Salvo norma imperativa de consumo en
        contrario, las controversias se someterán a los juzgados y tribunales del domicilio del titular.
      </p>
    </LegalDoc>
  );
}
