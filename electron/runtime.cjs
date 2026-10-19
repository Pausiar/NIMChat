"use strict";
// Arranca la interfaz (Next.js standalone) y el servidor local de Code dentro
// del mismo proceso. Lo usa electron/main.cjs y también las pruebas sin Electron.
const path = require("node:path");
const net = require("node:net");
const http = require("node:http");

const SERVER_PORT = 4177; // fijo: la interfaz lo tiene como URL por defecto

function isPortFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });
}

async function findFreePort(start, attempts = 10) {
  for (let port = start; port < start + attempts; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No hay puertos libres entre ${start} y ${start + attempts - 1}.`);
}

function waitFor(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error(`Tiempo agotado esperando ${url}`));
        else setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

async function startBackends({ webDir, serverFile, projectRoot, uiPortStart = 4178 }) {
  if (!(await isPortFree(SERVER_PORT))) {
    throw new Error(
      `El puerto ${SERVER_PORT} está ocupado. Cierra otras instancias de NimChat (o el servidor de desarrollo) y vuelve a abrirlo.`
    );
  }
  const uiPort = await findFreePort(uiPortStart);

  process.env.NIMCHAT_SERVER_PORT = String(SERVER_PORT);
  process.env.NIMCHAT_PROJECT_ROOT = projectRoot;
  process.env.NIMCHAT_ALLOWED_ORIGINS = `http://127.0.0.1:${uiPort},http://localhost:${uiPort}`;
  require(serverFile);

  process.env.PORT = String(uiPort);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.NODE_ENV = "production";
  process.chdir(webDir);
  require(path.join(webDir, "server.js"));

  const uiUrl = `http://127.0.0.1:${uiPort}`;
  await waitFor(`http://127.0.0.1:${SERVER_PORT}/api/health`);
  await waitFor(`${uiUrl}/`);
  return { uiUrl, serverPort: SERVER_PORT };
}

module.exports = { startBackends, SERVER_PORT };
