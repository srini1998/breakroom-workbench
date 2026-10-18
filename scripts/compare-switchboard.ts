import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const load = async (name: string) =>
  JSON.parse(await readFile("docs/evidence/" + name, "utf8"));
const a = await load("switchboard-scoped-baseline-full.json"),
  b = await load("switchboard-scoped-live-full.json"),
  badA = await load("switchboard-broad-baseline.json"),
  badB = await load("switchboard-broad-live.json");
const keys = [
  "levels",
  "repetitions",
  "operations",
  "rate",
  "payload_bytes",
  "warmup_ms",
  "observation_ms",
  "latency_objective_ms",
  "coverage_objective",
  "seed",
  "variant",
];
const workload = (r: any) =>
  Object.fromEntries(keys.map((k) => [k, r.run.spec[k]]));
assert.deepEqual(workload(a), workload(b));
assert.deepEqual(workload(badA), workload(badB));
assert.equal(a.experiments.length, b.experiments.length);
assert.equal(badA.experiments.length, badB.experiments.length);
assert.equal(a.run.verdict.result, "pass");
assert.equal(b.run.verdict.result, "inconclusive");
assert(
  b.experiments.some(
    (e: any) => e.summary.quality.event_loop_delay_max_ms > 100,
  ),
);
assert.equal(badA.run.verdict.result, "fail");
assert.equal(badB.run.verdict.result, "fail");
const summarize = (r: any) => ({
  run_id: r.run.id,
  mode: r.run.spec.mode,
  result: r.run.verdict.result,
  experiments_used: r.experiments.length,
  valid_conclusions: r.run.verdict.valid_conclusions,
  missed_seeded_failures:
    r.run.spec.variant === "broad" && r.run.verdict.missed_seeded_failure
      ? 1
      : 0,
  total_limit_seconds:
    (new Date(r.run.deadline_at).getTime() -
      new Date(r.run.created_at).getTime()) /
    1000,
  elapsed_seconds:
    (new Date(r.run.updated_at).getTime() -
      new Date(r.run.created_at).getTime()) /
    1000,
  unauthorized_receipts: r.experiments.reduce(
    (n: number, e: any) => n + (e.summary?.metrics.unauthorized || 0),
    0,
  ),
  missing_pairs: r.experiments.reduce(
    (n: number, e: any) => n + (e.summary?.metrics.missing || 0),
    0,
  ),
  compromised_experiments: r.experiments
    .filter((e: any) => e.summary?.quality.compromised)
    .map((e: any) => ({
      id: e.id,
      config: e.config,
      quality: e.summary.quality,
    })),
  model_choices: r.evidence
    .filter((e: any) => e.kind === "schedule_experiment")
    .map((e: any) => (e.content.structured_observations || e.content).decision)
    .filter((d: any) => d.planner === "live model")
    .map((d: any) => ({ model: d.model, index: d.index, usage: d.usage })),
  load_group_order: [
    ...new Set(
      r.experiments
        .filter((e: any) => !e.config.smoke)
        .map((e: any) => e.config.level),
    ),
  ],
});
const report = {
  verified_at: new Date().toISOString(),
  scope:
    "One named synthetic workload per fixture, same experiment and total time budgets. Not a general agent benchmark.",
  workload: workload(a),
  clean: { baseline: summarize(a), live: summarize(b) },
  seeded_broad_authorization: {
    baseline: summarize(badA),
    live: summarize(badB),
  },
  conclusion:
    "The fixed matrix reached a passing clean conclusion; the live clean comparison was inconclusive due measured coordinator event-loop delay above the same 100 ms gate. Both detected the seeded authorization failure under equal budgets. No agent superiority established; model selects group order only.",
  cost: "unknown local inference",
};
await writeFile(
  "docs/evidence/switchboard-planner-comparison.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
