"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const { startBackends, SERVER_PORT } = require("./runtime.cjs");

const REPO_URL = "https://github.com/Pausiar/NIMChat";
let mainWindow = null;
let uiUrl = "";

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(boot).catch(fail);
  app.on("window-all-closed", () => app.quit());
}

function fail(error) {
  dialog.showErrorBox("NimChat no pudo iniciarse", error instanceof Error ? error.message : String(error));
  app.quit();
}

function resolveAssets() {
  // Empaquetado: resources/{web,server.cjs}. En desarrollo: build/desktop/.
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..", "build", "desktop");
  return { webDir: path.join(base, "web"), serverFile: path.join(base, "server.cjs") };
}

function defaultProjectsDir() {
  // Carpeta propia en Documentos: el agente no tiene acceso a todo el disco por defecto.
  const dir = path.join(app.getPath("documents"), "NimChat Projects");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function boot() {
  const { webDir, serverFile } = resolveAssets();
  const started = await startBackends({ webDir, serverFile, projectRoot: defaultProjectsDir() });
  uiUrl = started.uiUrl;
  buildMenu();
  createWindow();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "NimChat",
    backgroundColor: "#0a0a0b",
    autoHideMenuBar: false,
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  // Enlaces externos al navegador; la ventana nunca sale de la app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(uiUrl)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.loadURL(uiUrl);
}

async function openProjectFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Abrir carpeta de proyecto",
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return;
  try {
    const res = await fetch(`http://127.0.0.1:${SERVER_PORT}/api/project/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: result.filePaths[0] }),
    });
    if (!res.ok) throw new Error(await res.text());
    mainWindow?.webContents.reload();
  } catch (error) {
    dialog.showErrorBox("No se pudo abrir la carpeta", error instanceof Error ? error.message : String(error));
  }
}

function buildMenu() {
  const goto = (route) => () => mainWindow?.loadURL(`${uiUrl}${route}`);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Archivo",
        submenu: [
          { label: "Abrir carpeta de proyecto…", accelerator: "CmdOrCtrl+O", click: openProjectFolder },
          { label: "Inicio", click: goto("/") },
          { type: "separator" },
          { role: "quit", label: "Salir" },
        ],
      },
      {
        label: "Ver",
        submenu: [
          { role: "reload", label: "Recargar" },
          { role: "zoomIn", label: "Acercar" },
          { role: "zoomOut", label: "Alejar" },
          { role: "resetZoom", label: "Tamaño original" },
          { role: "togglefullscreen", label: "Pantalla completa" },
          { role: "toggleDevTools", label: "Herramientas de desarrollo" },
        ],
      },
      {
        label: "Ayuda",
        submenu: [
          { label: "Aviso legal", click: goto("/legal/aviso-legal") },
          { label: "Privacidad", click: goto("/legal/privacidad") },
          { label: "Términos de uso", click: goto("/legal/terminos") },
          { label: "Almacenamiento local", click: goto("/legal/almacenamiento") },
          { type: "separator" },
          { label: "Repositorio en GitHub", click: () => shell.openExternal(REPO_URL) },
        ],
      },
    ])
  );
}
