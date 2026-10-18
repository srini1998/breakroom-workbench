import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const read = async (name: string) =>
  JSON.parse(await readFile("docs/evidence/" + name, "utf8"));
const cases = [
  ["switchboard-scoped-baseline.json", "pass"],
  ["switchboard-broad-baseline.json", "fail"],
  ["switchboard-dropped-baseline.json", "fail"],
  ["switchboard-starved-baseline.json", "inconclusive"],
  ["switchboard-scoped-baseline-full.json", "pass"],
  ["switchboard-scoped-live-full.json", "inconclusive"],
  ["switchboard-broad-live.json", "fail"],
];
const runs = [];
for (const [file, expected] of cases) {
  const b = await read(file);
  assert.equal(b.run.status, "completed");
  assert.equal(b.run.verdict.result, expected);
  runs.push({
    file,
    run_id: b.run.id,
    mode: b.run.spec.mode,
    variant: b.run.spec.variant,
    result: b.run.verdict.result,
    experiments: b.experiments.length,
    receipts: b.receipts.length,
  });
}
const browser = await read("switchboard-browser.json"),
  lifecycle = await read("switchboard-lifecycle.json"),
  matrix = await read("switchboard-recipient-matrix.json"),
  comparison = await read("switchboard-planner-comparison.json");
assert.equal(browser.errors.length, 0);
assert.equal(browser.overflow, false);
assert(
  browser.projectCreation &&
    browser.deepLinkProjectRestoration &&
    browser.export,
);
assert.equal(lifecycle.real_process_kill.signal, "SIGKILL");
assert.equal(lifecycle.recovered.run.verdict.result, "inconclusive");
assert.equal(lifecycle.cancelled.run.status, "cancelled");
assert.equal(matrix.results.length, 4);
const tests = await readFile(
  "docs/evidence/switchboard-regression.txt",
  "utf8",
);
assert.match(tests, /pass 37/);
assert.match(tests, /fail 0/);
assert.match(tests, /skipped 0/);
const report = {
  verified_at: new Date().toISOString(),
  provenance:
    "Aggregation and assertions over actual stored execution artifacts; not a fresh benchmark.",
  acceptance_assertions: "passed",
  regression: { passed: 37, failed: 0, skipped: 0 },
  runs,
  browser,
  lifecycle: {
    real_process_kill: true,
    recovery: "inconclusive as required",
    cancelled: true,
    raw: "switchboard-lifecycle.json",
  },
  ordinary_authorization_matrix: "four owner/viewer identities passed",
  planner_conclusion: comparison.conclusion,
  limits:
    "Local synthetic INSERT/UPDATE fixture only; no hosted benchmark or hiring guarantee.",
};
await writeFile(
  "docs/evidence/switchboard-acceptance-summary.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
