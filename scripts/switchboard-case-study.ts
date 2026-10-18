import { readFile, writeFile } from "node:fs/promises";
const a = JSON.parse(
  await readFile("docs/evidence/switchboard-scoped-baseline-full.json", "utf8"),
);
const fmt = (v: number) => v.toFixed(1);
const rows = [5, 20, 50].map((level) => {
  const paths = ["changes", "broadcast"].map((t) =>
    a.experiments.filter(
      (e: any) =>
        !e.config.smoke && e.config.level === level && e.config.transport === t,
    ),
  );
  const values = paths.map((es) => es.map((e: any) => e.summary.metrics.p95));
  const ratios = paths.map((es) => {
    const denominator = es.reduce(
        (n: number, e: any) => n + e.summary.metrics.denominator,
        0,
      ),
      onTime = es.reduce(
        (n: number, e: any) => n + e.summary.metrics.on_time,
        0,
      );
    return `${onTime}/${denominator}`;
  });
  return `| ${level} | ${values[0].map(fmt).join(", ")} | ${values[1].map(fmt).join(", ")} | ${ratios.join(" / ")} |`;
});
let text = `# Switchboard case study\n\nBuilt October 17, 2026, as lab 06 in Breakroom.\n\n## Question\nCan the supported two-tenant INSERT/UPDATE order workload move from Postgres Changes to database-triggered private Broadcast without changing the permitted audience, while meeting an explicitly configured local delivery objective?\n\n## Evidence\nRun ${a.run.id}, deterministic planner: 20 actual experiments, three alternating pairs at each of 5/20/50 subscribers, ${a.receipts.length} persisted receipts. Both paths use ordinary real Supabase Auth sessions. The workbench control database and target credentials are separate. Every operation records its expected audience before writes.\n\nConfigured on-time objective: ${a.run.spec.latency_objective_ms} ms and ${(a.run.spec.coverage_objective * 100).toFixed(0)}% intended recipient coverage, with ${a.run.spec.observation_ms} ms observation window per operation. ${a.run.spec.operations} operations per measured experiment, ${a.run.spec.rate} target writes/second, ${a.run.spec.payload_bytes}-byte payload.\n\n| Subscribers | Changes per-repetition p95 (ms) | Broadcast per-repetition p95 (ms) | On-time pairs: A / B |\n|---|---|---|---|\n${rows.join("\n")}\n\nThese are actual per-experiment nearest-rank p95 values, not pooled percentiles or hosted capacity predictions. Timing is observed write-start-to-receipt on one coordinator monotonic clock, including coordination overhead. Missing pairs stay in coverage; p99 is marked unstable for small samples.\n\n## Failure checks\nA deliberately broad private-topic policy produced actual wrong-tenant observations and failed regardless of latency. Dropping an observer reduced intended recipient coverage and failed. Deliberately starving the coordinator returned inconclusive. Actual SIGKILL and lease reclaim preserved interrupted operation/receipt accounting; it could not turn into a passing measurement. Cancellation preserved partial evidence and removed owned target rows.\n\n## Implementation decision discovered in testing\nA channel join is not necessarily confirmation that Postgres Changes is ready. The first unconfirmed smoke missed its events. The runner now waits for the installed SDK's explicit CDC confirmation option before any timed writes. This was a harness correction using an existing supported feature, not an upstream bug fix.\n\n## Agent boundaries\nA real local Qwen model selects the next permitted load group. It cannot issue SQL, modify policies, replace the independent oracle or declare a verdict. The fixed planner runs the same matrix and total budget. See switchboard-planner-comparison.json for actual planner evaluation; no model advantage is assumed. No training or customer data was used.\n\n## Limits and hiring relevance\nLocal Supabase/Colima only. Fixed memberships, INSERT/UPDATE only. No DELETE, reconnect/replay delivery, revocation, arbitrary schema migration, server resource attribution or production guarantee. Interrupted comparisons remain inconclusive. The repository includes raw ledgers, hashes, actual versions, reproduction commands and ordinary-user authorization checks. This is evidence of integration and experimental engineering; a focused reviewed upstream contribution would add stronger evidence of collaborative open-source work.\n\n## Reproduce\nFollow the root README local setup, run app and worker, open /switchboard and select the full matrix. Use the broad, dropped and starved fixtures to inspect the negative cases. Export retains raw evidence. Lifecycle verification owns its processes and requires the ordinary worker to be stopped. Nothing was publicly deployed.\n`;
const comparison = JSON.parse(
  await readFile("docs/evidence/switchboard-planner-comparison.json", "utf8"),
);
text +=
  "\n## Actual planner comparison\n\n" +
  comparison.conclusion +
  " The clean planners each used 20 experiments and a 720-second limit. The live planner used the order 50/20/5 and recorded three real Qwen decisions. Its largest coordinator delay was 106.9 ms against the 100 ms gate; all 1,804 expected receipts were observed, with no unauthorized receipts, but that does not remove the quality failure. Both seeded-defect runs used eight experiments and detected actual unauthorized receipt. The deterministic seeded-defect rerun also recorded 20 missed intended pairs; those failures are retained in its raw bundle rather than dropped from coverage.\n";
await writeFile("docs/switchboard-case-study.md", text);
console.log("Case study generated from actual full-matrix export.");
