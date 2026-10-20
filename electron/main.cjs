"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const { startBackends, SERVER_PORT } = require("./runtime.cjs");

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
  registerDialogs();
  Menu.setApplicationMenu(null);
  createWindow();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "NimChat",
    backgroundColor: "#0a0a0a",
    // Barra de título integrada en la interfaz (negra) con los botones de ventana del sistema.
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#0a0a0a", symbolColor: "#d4d4d4", height: 40 },
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
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
  setupShortcuts(mainWindow);
  mainWindow.loadURL(uiUrl);
}

function registerDialogs() {
  // Solo responde a nuestra propia interfaz, nunca a otra página cargada en la ventana.
  const trusted = (event) => Boolean(event.senderFrame && event.senderFrame.url.startsWith(uiUrl));
  const pick = async (event, options) => {
    if (!trusted(event)) throw new Error("Origen no permitido");
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  };
  ipcMain.handle("dialog:pickFolder", (event) =>
    pick(event, { title: "Abrir carpeta de proyecto", properties: ["openDirectory", "createDirectory"] })
  );
  ipcMain.handle("dialog:pickFile", (event) =>
    pick(event, { title: "Abrir archivo", properties: ["openFile"] })
  );
}

/** Sin barra de menú nativa (era blanca y desentonaba): atajos básicos a mano. */
function setupShortcuts(win) {
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const ctrl = input.control || input.meta;
    const key = input.key.toLowerCase();
    if (key === "f12" || (ctrl && input.shift && key === "i")) {
      win.webContents.toggleDevTools();
    } else if (ctrl && key === "r") {
      win.webContents.reload();
    } else if (ctrl && (key === "=" || key === "+")) {
      win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5);
    } else if (ctrl && key === "-") {
      win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5);
    } else if (ctrl && key === "0") {
      win.webContents.setZoomLevel(0);
    } else if (key === "f11") {
      win.setFullScreen(!win.isFullScreen());
    } else {
      return;
    }
    event.preventDefault();
  });
}
