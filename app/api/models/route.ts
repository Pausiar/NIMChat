import { NextRequest } from "next/server";

export const runtime = "edge";

const NIM_MODELS_URL = "https://integrate.api.nvidia.com/v1/models";

/**
 * Devuelve los modelos que NVIDIA NIM sirve ahora mismo, para que el selector
 * no dependa de una lista fija en el código.
 */
export async function GET(req: NextRequest) {
  const apiKey =
    req.headers.get("x-nvidia-api-key") || process.env.NVIDIA_API_KEY || "";

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Falta la NVIDIA API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch(NIM_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `NIM respondió ${upstream.status}` }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = (await upstream.json()) as {
      data?: { id: string; owned_by?: string }[];
    };
    const models = (json.data ?? []).map((m) => ({
      id: m.id,
      owned_by: m.owned_by,
    }));

    return new Response(JSON.stringify({ data: models }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "No se pudo contactar con NIM" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
