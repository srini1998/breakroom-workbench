import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { control, target, ids } from "../server/db.ts";
import { bundle } from "../products/switchboard/service.ts";
const results = [];
for (const variant of ["scoped", "broad", "dropped", "starved"]) {
  const run = (
    await control.query(
      "select id,status from switch_runs where spec->>'variant'=$1 and status='completed' and verdict->>'scope'='Supported local INSERT/UPDATE fixture only' order by created_at desc limit 1",
      [variant],
    )
  ).rows[0];
  assert(run, variant + " not completed");
  const b = await bundle(run.id, ids.alice);
  assert.equal(
    b.run.verdict.result,
    variant === "scoped"
      ? "pass"
      : variant === "starved"
        ? "inconclusive"
        : "fail",
  );
  if (variant === "broad")
    assert(b.experiments.some((e) => e.summary.metrics.unauthorized > 0));
  if (variant === "dropped")
    assert(b.experiments.some((e) => e.summary.metrics.missing > 0));
  if (variant === "starved")
    assert(
      b.experiments.some(
        (e) => e.summary.quality.event_loop_delay_max_ms > 100,
      ),
    );
  await writeFile(
    `docs/evidence/switchboard-${variant}-baseline.json`,
    JSON.stringify(b, null, 2),
  );
  results.push({
    variant,
    id: run.id,
    result: b.run.verdict.result,
    experiments: b.experiments.length,
    receipts: b.receipts.length,
  });
}
await writeFile(
  "docs/evidence/switchboard-verification.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
await control.end();
await target.end();
