import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function truncateTitle(text: string, words = 6): string {
  const clean = text.trim().replace(/\s+/g, " ");
  const parts = clean.split(" ").slice(0, words);
  let title = parts.join(" ");
  if (title.length > 60) title = title.slice(0, 57) + "...";
  return title || "Nuevo chat";
}
