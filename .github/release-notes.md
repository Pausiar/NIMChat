## NimChat 1.2.0

### Instalación
Descarga **NimChat-Setup-1.2.0.exe** (abajo, en *Assets*) y ejecútalo. Todo viene incluido: no hay que arrancar servidores ni usar comandos.

> Windows puede mostrar «Windows protegió su PC» (SmartScreen) porque la app aún no está firmada. Pulsa **Más información → Ejecutar de todas formas**.

**A partir de esta versión la app se actualiza sola desde dentro**: cuando haya una versión nueva aparece un aviso arriba («actualizar a X»); se descarga y «reiniciar para actualizar» la instala. No tendrás que volver a descargar el instalador. (Esta versión hay que instalarla a mano una vez.)

### Novedades
- **Actualizaciones desde la app**, también desde *Ajustes → Actualizaciones*. No descarga nada sin que lo pidas. Instalador más ligero (~110 MB).
- **Code, organizado como Claude Code:** proyectos con sus sesiones a la izquierda, chat (o vista de código con el chat pequeño debajo) en el centro y pestañas de Agentes, Contexto y Conectores a la derecha.
- **Agente que no se queda a medias:** botón *Continuar* sin perder el contexto; compactación automática del contexto en `context_agent.md`; subagente explorador de solo lectura; pausa configurable entre peticiones y reintento automático ante límites de la API (429).
- **Design en HTML, CSS y JavaScript** (sin compilar), con vista previa aislada y editor por pestañas. Corrige el error de React.
- **Prompt de sistema renovado** (mantiene `context_agent.md`, no expone claves).
- Ventana con barra de título oscura integrada y arreglos de elementos que se salían de la pantalla.

### Notas
- Necesitas una API key gratuita de NVIDIA NIM (build.nvidia.com).
- Los conectores MCP por comando (`npx …`) requieren Node.js instalado.
