import type { Metadata } from "next";
import { LegalDoc, Owner } from "@/components/legal/LegalDoc";
import { LEGAL } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Términos de uso — NimChat" };

export default function TerminosPage() {
  return (
    <LegalDoc title="Términos de uso">
      <h2>1. Aceptación</h2>
      <p>Al usar {LEGAL.appName} aceptas estos términos. Si no estás de acuerdo, no lo uses.</p>

      <h2>2. Servicio</h2>
      <p>
        {LEGAL.appName} es una interfaz gratuita para acceder a modelos de IA de terceros mediante
        tu propia clave de NVIDIA NIM. El uso de esa clave se rige por los términos de NVIDIA
        (cuotas, límites y condiciones del programa de APIs), que debes cumplir.
      </p>

      <h2>3. Uso aceptable</h2>
      <p>No puedes usar el servicio para:</p>
      <ul>
        <li>actividades ilegales o que vulneren derechos de terceros;</li>
        <li>generar malware, atacar sistemas ajenos o eludir medidas de seguridad;</li>
        <li>suplantar identidades, generar desinformación o contenido que infrinja la ley;</li>
        <li>tratar datos personales de terceros sin base legítima;</li>
        <li>incumplir la licencia o política de uso del modelo que selecciones.</li>
      </ul>

      <h2>4. Contenido generado por IA</h2>
      <ul>
        <li>Las salidas pueden contener errores, sesgos o información desactualizada; verifícalas antes de usarlas.</li>
        <li>Tú eres responsable del uso que hagas del contenido generado y de comprobar que no infringe derechos de terceros.</li>
        <li>El código generado se ofrece sin garantía de ningún tipo; pruébalo antes de usarlo en producción.</li>
      </ul>

      <h2>5. Modo Code y modo agentes</h2>
      <p>
        Estos modos permiten que un agente de IA lea y modifique archivos y ejecute comandos en tu
        equipo, y que varios agentes trabajen en paralelo. Acciones potencialmente destructivas
        piden confirmación, pero esa protección no es infalible. Trabaja sobre proyectos con
        control de versiones, revisa los cambios y mantén copias de seguridad. Lo haces bajo tu
        responsabilidad.
      </p>

      <h2>6. Clave de API</h2>
      <p>
        Eres responsable de tu clave y del consumo asociado. No la compartas. Si sospechas que está
        comprometida, revócala en build.nvidia.com.
      </p>

      <h2>7. Limitación de responsabilidad</h2>
      <p>
        El software se ofrece «tal cual», sin garantías (licencia MIT). En la medida permitida por
        la ley, el titular no responde de daños indirectos, pérdida de datos o lucro cesante
        derivados del uso del servicio. Esto no limita derechos irrenunciables de los
        consumidores ni la responsabilidad por dolo o negligencia grave.
      </p>

      <h2>8. Modificaciones y contacto</h2>
      <p>
        Podemos actualizar estos términos; la fecha de última actualización figura arriba. Contacto:{" "}
        <Owner field="contactEmail" label="correo de contacto" />.
      </p>

      <h2>9. Ley aplicable</h2>
      <p>Legislación española. Los consumidores conservan el fuero que les reconozca la normativa aplicable.</p>
    </LegalDoc>
  );
}
