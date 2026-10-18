import "dotenv/config";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  erasurePlan,
  erase,
  releaseDelayedExport,
} from "../products/erasurecheck/server.ts";
import { control, target, schema } from "../server/db.ts";
import { uuid } from "../server/contracts.ts";
const report: any[] = [];
function latch() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}
try {
  // Export holds the real account claim while deletion starts; deletion must clean its blob too.
  const a = uuid(),
    plan = await erasurePlan(a, "delayed"),
    claimed = latch(),
    release = latch();
  const exporter = releaseDelayedExport(a, plan.bucket, async () => {
    claimed.resolve();
    await release.promise;
  });
  await claimed.promise;
  const deletion = erase(a, plan);
  release.resolve();
  assert.equal(await exporter, "executed");
  const result = await deletion;
  assert(result.passed);
  assert.equal(result.actual.owned_objects.length, 0);
  report.push({ ordering: "export claims before deletion", run_id: a, result });
  // Export is released after tombstone commit but before Storage cleanup, so it must be fenced.
  const b = uuid(),
    p = await erasurePlan(b, "delayed");
  let outcome: string | undefined;
  const second = await erase(b, p, async () => {
    outcome = await releaseDelayedExport(b, p.bucket);
    assert.equal(outcome, "fenced");
  });
  assert(second.passed);
  report.push({
    ordering:
      "export released after committed tombstone and before object cleanup",
    run_id: b,
    export: outcome,
    result: second,
  });
  // Repeating cleanup must not recreate rows or objects and must preserve the control data.
  const again = await erase(b, p);
  assert(again.passed);
  report.push({ ordering: "cleanup retry", run_id: b, result: again });
  await writeFile(
    "docs/evidence/erasurecheck-concurrency.json",
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        adapter: "real Supabase Storage",
        checks: report,
      },
      null,
      2,
    ),
  );
  console.log(
    "Real Storage: both coordinated claim orderings and cleanup retry passed.",
  );
} finally {
  await control.end();
  await target.end();
}
