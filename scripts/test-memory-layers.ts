/**
 * Pruebas locales (sin NVIDIA) de presupuesto, compactación, truncate y artifacts.
 * npx tsx scripts/test-memory-layers.ts
 */
import assert from "node:assert/strict";
import {
  applyMemoryToSystem,
  compactionReducedEnough,
  compactMessages,
  estimateTokens,
  truncateToolResultsMechanically,
  type AgentMessage,
} from "../lib/agent-context";
import { ArtifactStore } from "../lib/artifact-store";
import { getHardTruncateAt, getSoftCompactAt, getUsableInputBudget } from "../lib/model-context";

function big(n: number) {
  return "x".repeat(n);
}

async function main() {
  // Presupuesto por modelo
  const soft = getSoftCompactAt("meta/llama-3.3-70b-instruct", 4096);
  const hard = getHardTruncateAt("meta/llama-3.3-70b-instruct", 4096);
  const usable = getUsableInputBudget("meta/llama-3.3-70b-instruct", 4096);
  assert.ok(soft < hard && hard <= usable, `presupuesto incoherente soft=${soft} hard=${hard} usable=${usable}`);
  assert.ok(soft > 8_000 && soft < 28_000, `soft fuera de rango esperado: ${soft}`);

  // Artifact store
  const store = new ArtifactStore();
  const small = store.encapsulate("read_file", { path: "a.ts", content: "corto" }, { path: "a.ts" });
  assert.equal(small.artifactId, undefined);
  const large = store.encapsulate("read_file", { path: "b.ts", content: big(5_000) }, { path: "b.ts" });
  assert.ok(large.artifactId?.startsWith("art-"));
  assert.ok(large.text.includes("artifact_id"));
  const recalled = store.recall(large.artifactId!);
  assert.equal((recalled as { path?: string }).path, "b.ts");
  assert.ok(store.list().length === 1);

  // Truncate mecánico
  const messages: AgentMessage[] = [
    { role: "system", content: "sys" },
    { role: "user", content: "task" },
  ];
  for (let i = 0; i < 8; i++) {
    messages.push({
      role: "assistant",
      content: `paso ${i}`,
      tool_calls: [{ id: `t${i}`, function: { name: "read_file", arguments: "{}" } }],
    });
    messages.push({
      role: "tool",
      tool_call_id: `t${i}`,
      name: "read_file",
      content: JSON.stringify({ path: `f${i}.ts`, content: big(2_000) }),
    });
  }
  const before = estimateTokens(messages);
  const { messages: stubbed, stubbed: count } = truncateToolResultsMechanically(messages, {
    keepRecentToolResults: 3,
  });
  const after = estimateTokens(stubbed);
  assert.ok(count >= 4, `stubbed=${count}`);
  assert.ok(after < before, `truncate no redujo: ${before} → ${after}`);

  // Compactación + inyección de memoria
  const compacted = await compactMessages(messages, {
    keepTailTokens: 2_000,
    summarize: async () =>
      "1) Objetivo: demo\n2) Hecho: leídos varios archivos\n3) Falta: editar\n4) Decisiones: ninguna\n5) Rutas: f0.ts",
  });
  assert.ok(compacted, "compactMessages devolvió null");
  assert.ok(compacted!.messages[0]?.content?.includes("Memoria de trabajo"));
  assert.ok(compacted!.messages.some((m) => m.content?.includes("NO empieces por leer context_agent.md")));
  assert.ok(compactionReducedEnough(before, estimateTokens(compacted!.messages)));

  const injected = applyMemoryToSystem(
    [{ role: "system", content: "base" }, { role: "user", content: "hola" }],
    "estado previo"
  );
  assert.ok(injected[0]?.content?.includes("estado previo"));
  const reinjected = applyMemoryToSystem(injected, "estado nuevo");
  assert.equal((reinjected[0]?.content?.match(/# Memoria de trabajo/g) ?? []).length, 1);

  console.log(
    JSON.stringify(
      {
        ok: true,
        soft,
        hard,
        usable,
        before,
        afterStub: after,
        afterCompact: estimateTokens(compacted!.messages),
        artifacts: store.list().length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
