## NimChat 1.0

Primera versión estable de la app de escritorio.

### Instalación
Descarga **NimChat-Setup-1.0.0.exe** (abajo, en *Assets*) y ejecútalo. Todo viene incluido: no hay que arrancar servidores ni usar comandos.

> Windows puede mostrar «Windows protegió su PC» (SmartScreen) porque la app aún no está firmada. Pulsa **Más información → Ejecutar de todas formas**.

### Novedades
- **Interfaz rediseñada** al estilo terminal, en negro y amarillo: una sola barra superior (chat · design · code), sin elementos flotantes.
- **Abrir carpetas y archivos** con el explorador de Windows desde el modo Code, con proyectos recientes.
- **Conectores MCP**: conecta GitHub, bases de datos PostgreSQL, sistema de archivos, Brave Search u otros servidores MCP. El agente y los subagentes usan sus herramientas. Por defecto solo de lectura.
- Selector de modelos con el catálogo en vivo de NVIDIA NIM y búsqueda.
- Modo agentes (orquestador + subagentes en paralelo) dentro de Code.
- Servidor local protegido: solo acepta peticiones de la propia app.

### Notas
- Necesitas una API key gratuita de NVIDIA NIM (build.nvidia.com).
- Los conectores por comando (`npx …`) requieren Node.js instalado.

