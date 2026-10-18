import { readFile, writeFile } from "node:fs/promises";
import { contracts } from "../server/contracts.ts";
const products = [
  "AccessProof",
  "EventMedic",
  "ErasureCheck",
  "ImportRescue",
  "EconomyBreaker",
];
const cases: any[] = [];
for (const module of products) {
  const report = JSON.parse(
    await readFile(
      "docs/evidence/" + module.toLowerCase() + "-evaluation.json",
      "utf8",
    ),
  );
  for (const r of report.results) {
    const expected =
      module === "AccessProof"
        ? r.scenario === "clean"
          ? "pass"
          : "fail"
        : module === "ErasureCheck"
          ? r.scenario === "incomplete"
            ? "fail"
            : "pass"
          : module === "EconomyBreaker"
            ? r.scenario === "clean"
              ? "pass"
              : "fail"
            : "pass";
    cases.push({
      module,
      scenario: r.scenario,
      mode: r.mode,
      run_id: r.id,
      expected,
      observed: r.verdict?.result,
      matched: r.status === "completed" && r.verdict?.result === expected,
      tool_count: r.tool_count,
      inference_decisions: r.inference?.length || 0,
      milliseconds: r.milliseconds,
    });
  }
}
const summary = {
  verified_at: new Date().toISOString(),
  scope:
    "Named authored fixture set only; not an unseen/general model benchmark",
  training:
    "No custom training or fine-tuning. Synthetic experiment fixtures are runtime input, not model training data.",
  model: "qwen2.5:3b via local Ollama",
  cost: "Provider billing cost unknown; no paid API used",
  runs: cases.length,
  matched: cases.filter((c) => c.matched).length,
  baseline_runs: cases.filter((c) => c.mode === "baseline").length,
  live_runs: cases.filter((c) => c.mode === "live").length,
  cases,
};
await writeFile(
  "docs/evidence/evaluation-summary.json",
  JSON.stringify(summary, null, 2),
);
console.log(
  `${summary.matched}/${summary.runs} named runs matched expected verdicts (${summary.baseline_runs} baseline, ${summary.live_runs} live).`,
);
if (summary.matched !== summary.runs) process.exitCode = 1;
