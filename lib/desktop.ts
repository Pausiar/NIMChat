export type UpdaterStatus =
  | "idle"
  | "disabled"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdaterState {
  status: UpdaterStatus;
  currentVersion: string;
  newVersion?: string;
  percent?: number;
  error?: string;
  checkedAt?: number;
}

interface UpdaterBridge {
  getState: () => Promise<UpdaterState>;
  check: () => Promise<UpdaterState>;
  download: () => Promise<UpdaterState>;
  install: () => Promise<UpdaterState>;
  onState: (callback: (state: UpdaterState) => void) => () => void;
}

/** Puente con la app de escritorio (Electron). En el navegador no existe. */
interface DesktopBridge {
  updater: UpdaterBridge;
  isDesktop: true;
  platform: string;
  pickFolder: () => Promise<string | null>;
  pickFile: () => Promise<string | null>;
}

export function getDesktop(): DesktopBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { nimchatDesktop?: DesktopBridge }).nimchatDesktop;
}

/** Separa «C:\\a\\b\\f.ts» o «/a/b/f.ts» en carpeta y nombre de archivo. */
export function splitPath(fullPath: string): { dir: string; base: string } {
  const index = Math.max(fullPath.lastIndexOf("/"), fullPath.lastIndexOf("\\"));
  if (index < 0) return { dir: ".", base: fullPath };
  return { dir: fullPath.slice(0, index) || fullPath.slice(0, index + 1), base: fullPath.slice(index + 1) };
}
