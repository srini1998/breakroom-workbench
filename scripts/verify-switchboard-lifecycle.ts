import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { control, target } from "../server/db.ts";
const base = "http://127.0.0.1:4310/api";
let cookie = "";
async function api(path: string, body?: unknown) {
  const r = await fetch(base + path, {
    headers: { "Content-Type": "application/json", cookie },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  if (path === "/login") cookie = r.headers.get("set-cookie")!.split(";")[0];
  assert.equal(r.status, 200, await r.clone().text());
  return r.json() as Promise<any>;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => Promise<boolean>, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await sleep(100);
  }
  throw Error("Lifecycle verification deadline");
}
function worker() {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/run-switch-once.ts"],
    { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (b) => (output += b));
  child.stderr.on("data", (b) => (output += b));
  const exit = new Promise<{ code: number | null; signal: string | null }>(
    (resolve) => child.on("exit", (code, signal) => resolve({ code, signal })),
  );
  return { child, exit, output: () => output };
}
await api("/login", { identity: "alice" });
const project = (await api("/bootstrap")).projects[0].id;
const created = await api("/switchboard", {
  project_id: project,
  levels: [1],
  operations: 8,
  rate: 2,
  observation_ms: 1000,
  latency_objective_ms: 1000,
});
const first = worker();
await until(
  async () =>
    Number(
      (
        await control.query(
          "select count(*) from switch_operations where run_id=$1",
          [created.id],
        )
      ).rows[0].count,
    ) >= 1,
);
first.child.kill("SIGKILL");
const killed = await first.exit;
assert.equal(killed.signal, "SIGKILL");
const partial = await api("/switchboard/" + created.id);
const operationIds = partial.operations.map((o: any) => o.event_id);
assert(operationIds.length > 0);
console.log(
  JSON.stringify({
    event: "restart.worker_killed",
    run_id: created.id,
    persisted_operations: operationIds.length,
  }),
);
await sleep(32000);
const replacement = worker();
const replacementExit = await replacement.exit;
assert.equal(replacementExit.code, 0, replacement.output());
const recovered = await api("/switchboard/" + created.id);
assert.equal(recovered.run.status, "completed");
assert.equal(recovered.run.verdict.result, "inconclusive");
assert(recovered.experiments.some((e: any) => e.status === "interrupted"));
assert(recovered.evidence.some((e: any) => e.kind === "recovery"));
for (const id of operationIds)
  assert(
    recovered.operations.some((o: any) => o.event_id === id),
    "durable intent preserved",
  );
assert.equal(
  new Set(recovered.operations.map((o: any) => o.experiment_id + o.event_id))
    .size,
  recovered.operations.length,
);
assert.equal(
  (
    await target.query("select count(*) from switch_orders where run_id=$1", [
      created.id,
    ])
  ).rows[0].count,
  "0",
);
const cancel = await api("/switchboard", {
  project_id: project,
  levels: [1],
  operations: 20,
  rate: 1,
  observation_ms: 1000,
});
const cancelWorker = worker();
await until(
  async () =>
    Number(
      (
        await control.query(
          "select count(*) from switch_operations where run_id=$1",
          [cancel.id],
        )
      ).rows[0].count,
    ) >= 1,
);
await api("/switchboard/" + cancel.id + "/cancel", {});
assert.equal((await cancelWorker.exit).code, 0, cancelWorker.output());
const cancelled = await api("/switchboard/" + cancel.id);
assert.equal(cancelled.run.status, "cancelled");
assert.equal(cancelled.run.verdict.result, "inconclusive");
assert(cancelled.operations.length > 0);
assert.equal(
  (
    await target.query("select count(*) from switch_orders where run_id=$1", [
      cancel.id,
    ])
  ).rows[0].count,
  "0",
);
for (const b of [recovered, cancelled])
  assert(
    b.receipts.every(
      (r: any) =>
        r.run_id === b.run.id &&
        b.experiments.some((e: any) => e.id === r.experiment_id),
    ),
  );
await writeFile(
  "docs/evidence/switchboard-lifecycle.json",
  JSON.stringify(
    {
      real_process_kill: killed,
      partial_operation_ids: operationIds,
      recovered,
      cancelled,
    },
    null,
    2,
  ),
);
console.log(
  "Switchboard actual process kill/reclaim and cancellation passed; interrupted accounting retained, no receipt mixing, no target rows left.",
);
await control.end();
await target.end();
process.exit(0);
