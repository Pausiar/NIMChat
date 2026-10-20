"use strict";
// Puente mínimo y explícito entre la interfaz y el sistema: solo diálogos nativos.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nimchatDesktop", {
  isDesktop: true,
  platform: process.platform,
  pickFolder: () => ipcRenderer.invoke("dialog:pickFolder"),
  pickFile: () => ipcRenderer.invoke("dialog:pickFile"),
  updater: {
    getState: () => ipcRenderer.invoke("updater:state"),
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    install: () => ipcRenderer.invoke("updater:install"),
    onState: (callback) => {
      const handler = (_event, state) => callback(state);
      ipcRenderer.on("updater:state", handler);
      return () => ipcRenderer.removeListener("updater:state", handler);
    },
  },
});
