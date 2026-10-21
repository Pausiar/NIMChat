/** Almacén de resultados de herramientas fuera del prompt (capa L2). */

export const ARTIFACT_INLINE_MAX = 1_500;
export const ARTIFACT_PREVIEW_CHARS = 700;
export const ARTIFACT_RECALL_CHARS = 4_000;

export interface ArtifactMeta {
  id: string;
  tool: string;
  createdAt: number;
  bytes: number;
  preview: string;
  path?: string;
  name?: string;
}

export interface Artifact extends ArtifactMeta {
  body: string;
}

export interface ArtifactForModel {
  artifact_id: string;
  tool: string;
  path?: string;
  name?: string;
  bytes: number;
  preview: string;
  note: string;
}

export class ArtifactStore {
  private readonly items = new Map<string, Artifact>();
  private seq = 0;

  get size() {
    return this.items.size;
  }

  list(): ArtifactMeta[] {
    return [...this.items.values()].map(({ body: _body, ...meta }) => meta);
  }

  get(id: string): Artifact | undefined {
    return this.items.get(id);
  }

  /**
   * Guarda el payload completo y devuelve lo que debe ver el modelo:
   * inline si es pequeño, o referencia + preview si es grande.
   */
  encapsulate(
    tool: string,
    payload: unknown,
    meta?: { path?: string; name?: string }
  ): { text: string; artifactId?: string } {
    const body = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (body.length <= ARTIFACT_INLINE_MAX) {
      return { text: body };
    }

    const id = `art-${++this.seq}`;
    const preview =
      body.length > ARTIFACT_PREVIEW_CHARS
        ? `${body.slice(0, ARTIFACT_PREVIEW_CHARS)}\n…`
        : body;
    this.items.set(id, {
      id,
      tool,
      createdAt: Date.now(),
      bytes: body.length,
      preview,
      path: meta?.path,
      name: meta?.name,
      body,
    });

    const forModel: ArtifactForModel = {
      artifact_id: id,
      tool,
      path: meta?.path,
      name: meta?.name,
      bytes: body.length,
      preview,
      note: "Contenido completo fuera del contexto. Usa recall_artifact({ id }) o read_file/search_in_files sobre la ruta si la hay.",
    };
    return { text: JSON.stringify(forModel), artifactId: id };
  }

  recall(id: string, offset = 0, maxChars = ARTIFACT_RECALL_CHARS): unknown {
    const artifact = this.items.get(id);
    if (!artifact) {
      return {
        error: `Artifact desconocido: ${id}. Disponibles: ${this.list()
          .map((a) => a.id)
          .join(", ") || "(ninguno)"}`,
      };
    }
    const start = Math.max(0, offset);
    const slice = artifact.body.slice(start, start + maxChars);
    return {
      artifact_id: id,
      tool: artifact.tool,
      path: artifact.path,
      name: artifact.name,
      bytes: artifact.bytes,
      offset: start,
      truncated: start + slice.length < artifact.bytes,
      content: slice,
    };
  }
}

export function toolResultMeta(tool: string, payload: unknown): { path?: string; name?: string } {
  if (!payload || typeof payload !== "object") return { name: tool };
  const record = payload as Record<string, unknown>;
  const path = typeof record.path === "string" ? record.path : undefined;
  return { path, name: tool };
}
