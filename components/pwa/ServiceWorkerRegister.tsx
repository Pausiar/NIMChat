"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // En desarrollo el service worker estorba al hot reload.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // sin service worker la app sigue funcionando, solo no es instalable
    });
  }, []);

  return null;
}
