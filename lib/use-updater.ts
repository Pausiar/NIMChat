"use client";

import { useCallback, useEffect, useState } from "react";
import { getDesktop, type UpdaterState } from "./desktop";

/** Estado de las actualizaciones de la app de escritorio (null en el navegador). */
export function useUpdater() {
  const [state, setState] = useState<UpdaterState | null>(null);

  useEffect(() => {
    const updater = getDesktop()?.updater;
    if (!updater) return;
    let alive = true;
    updater
      .getState()
      .then((initial) => alive && setState(initial))
      .catch(() => undefined);
    const off = updater.onState((next) => alive && setState(next));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const run = useCallback((action: "check" | "download" | "install") => {
    const updater = getDesktop()?.updater;
    return updater ? updater[action]().then(setState).catch(() => undefined) : Promise.resolve();
  }, []);

  return {
    state,
    check: () => run("check"),
    download: () => run("download"),
    install: () => run("install"),
  };
}
