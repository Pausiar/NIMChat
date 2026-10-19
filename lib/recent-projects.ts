const KEY = "nimchat:recent-projects";
const MAX = 8;

export interface RecentProject {
  path: string;
  name: string;
}

export function loadRecentProjects(): RecentProject[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.path === "string") : [];
  } catch {
    return [];
  }
}

export function rememberProject(project: RecentProject): RecentProject[] {
  const next = [project, ...loadRecentProjects().filter((p) => p.path !== project.path)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sin almacenamiento disponible: la lista simplemente no se recuerda
  }
  return next;
}
