"use strict";
// Puente mínimo y explícito entre la interfaz y el sistema: solo diálogos nativos.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nimchatDesktop", {
  isDesktop: true,
  platform: process.platform,
  pickFolder: () => ipcRenderer.invoke("dialog:pickFolder"),
  pickFile: () => ipcRenderer.invoke("dialog:pickFile"),
});
