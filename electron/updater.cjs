"use strict";
// Actualizaciones desde la propia app: lee los releases de GitHub (latest.yml),
// avisa a la interfaz y, con permiso del usuario, descarga e instala.
const { app, ipcMain } = require("electron");

const CHECK_DELAY_MS = 20 * 1000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

/**
 * @param {() => import("electron").BrowserWindow | null} getWindow
 * @param {(event: import("electron").IpcMainInvokeEvent) => boolean} isTrusted
 */
function initUpdater(getWindow, isTrusted) {
  let state = { status: "idle", currentVersion: app.getVersion() };
  const feedOverride = process.env.NIMCHAT_UPDATE_URL; // pruebas o réplica propia de los releases
  const active = app.isPackaged || Boolean(feedOverride);

  const setState = (patch) => {
    state = { ...state, ...patch };
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send("updater:state", state);
  };

  ipcMain.handle("updater:state", (event) => {
    if (!isTrusted(event)) throw new Error("Origen no permitido");
    return state;
  });

  if (!active) {
    // En desarrollo no hay instalador que actualizar.
    state = { ...state, status: "disabled" };
    for (const channel of ["check", "download", "install"]) {
      ipcMain.handle(`updater:${channel}`, (event) => {
        if (!isTrusted(event)) throw new Error("Origen no permitido");
        return state;
      });
    }
    return;
  }

  const { autoUpdater } = require("electron-updater");
  autoUpdater.autoDownload = false; // se descarga solo cuando el usuario lo pide
  autoUpdater.autoInstallOnAppQuit = true; // si ya está descargada, se instala al cerrar
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  if (feedOverride) {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.setFeedURL({ provider: "generic", url: feedOverride });
  }

  autoUpdater.on("checking-for-update", () => setState({ status: "checking", error: undefined }));
  autoUpdater.on("update-available", (info) =>
    setState({ status: "available", newVersion: info.version, percent: undefined })
  );
  autoUpdater.on("update-not-available", () =>
    setState({ status: "not-available", newVersion: undefined, checkedAt: Date.now() })
  );
  autoUpdater.on("download-progress", (progress) =>
    setState({ status: "downloading", percent: Math.round(progress.percent) })
  );
  autoUpdater.on("update-downloaded", (info) =>
    setState({ status: "downloaded", newVersion: info.version, percent: 100 })
  );
  autoUpdater.on("error", (error) =>
    setState({ status: "error", error: error && error.message ? error.message.split("\n")[0] : String(error) })
  );

  const check = async () => {
    // No interrumpe una descarga en curso ni una actualización ya lista.
    if (["checking", "downloading", "downloaded"].includes(state.status)) return state;
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      setState({ status: "error", error: error && error.message ? error.message.split("\n")[0] : String(error) });
    }
    return state;
  };

  const guarded = (handler) => (event) => {
    if (!isTrusted(event)) throw new Error("Origen no permitido");
    return handler();
  };

  ipcMain.handle("updater:check", guarded(check));
  ipcMain.handle(
    "updater:download",
    guarded(async () => {
      if (state.status !== "available") return state;
      setState({ status: "downloading", percent: 0 });
      try {
        await autoUpdater.downloadUpdate();
      } catch (error) {
        setState({ status: "error", error: error && error.message ? error.message.split("\n")[0] : String(error) });
      }
      return state;
    })
  );
  ipcMain.handle(
    "updater:install",
    guarded(() => {
      if (state.status === "downloaded") {
        // Instalación silenciosa en la misma carpeta y reapertura de la app.
        setImmediate(() => autoUpdater.quitAndInstall(true, true));
      }
      return state;
    })
  );

  setTimeout(check, CHECK_DELAY_MS);
  setInterval(check, CHECK_INTERVAL_MS);
}

module.exports = { initUpdater };
