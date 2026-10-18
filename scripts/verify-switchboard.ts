import "dotenv/config";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { control, target, ids, tx } from "../server/db.ts";
import { evaluate, Config } from "../products/switchboard/contract.ts";
const origin = "http://127.0.0.1:4310";
let cookie = "";
async function req(path: string, body?: unknown, expected = 200) {
  const r = await fetch(origin + "/api" + path, {
    headers: { "Content-Type": "application/json", Cookie: cookie },
    ...(body !== undefined
      ? { method: "POST", body: JSON.stringify(body) }
      : {}),
  });
  assert.equal(r.status, expected, await r.clone().text());
  if (path === "/login") cookie = r.headers.get("set-cookie")!.split(";")[0];
  return r.json() as Promise<any>;
}
await req("/login", { identity: "alice" });
const boot = await req("/bootstrap"),
  project = boot.projects[0].id;
const cases = process.argv.includes("--full")
  ? ([
      [
        "scoped",
        process.argv.includes("--live") ? "live" : "baseline",
        [5, 20, 50],
      ],
    ] as const)
  : process.argv.includes("--live")
    ? ([
        [process.argv.includes("--broad") ? "broad" : "scoped", "live", [5]],
      ] as const)
    : process.argv.includes("--broad")
      ? ([["broad", "baseline", [5]]] as const)
      : ([
          ["scoped", "baseline", [5]],
          ["broad", "baseline", [5]],
          ["dropped", "baseline", [5]],
          ["starved", "baseline", [5]],
        ] as const);
const results = [];
// Reject unsupported input before any queued work or target mutation.
const before = (await control.query("select count(*) from switch_runs")).rows[0]
  .count;
await req(
  "/switchboard",
  { project_id: project, workload: "delete-arbitrary-project" },
  400,
);
assert.equal(
  (await control.query("select count(*) from switch_runs")).rows[0].count,
  before,
);
for (const [variant, mode, levels] of cases) {
  const existing = process.argv
    .find((a) => a.startsWith("--existing="))
    ?.split("=")[1];
  const { id } = existing
    ? { id: existing }
    : await req("/switchboard", {
        project_id: project,
        variant,
        mode,
        levels,
        operations: 8,
        rate: 8,
        observation_ms: 1500,
        latency_objective_ms: 1200,
      });
  console.log(
    JSON.stringify({
      event: "verification.started",
      id,
      variant,
      mode,
      levels,
    }),
  );
  const deadline = Date.now() + 780000;
  let b: any;
  while (Date.now() < deadline) {
    b = await req("/switchboard/" + id);
    if (!["queued", "running"].includes(b.run.status)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.equal(b.run.status, "completed", JSON.stringify(b.run.verdict));
  assert.equal(
    b.run.verdict.result,
    variant === "broad"
      ? "fail"
      : variant === "starved" ||
          b.experiments.some((e: any) => e.summary.quality.compromised)
        ? "inconclusive"
        : variant === "dropped"
          ? "fail"
          : "pass",
    JSON.stringify(b.run.verdict),
  );
  if (variant === "broad")
    assert(
      b.experiments.some((e: any) => e.summary.metrics.unauthorized > 0),
      "must observe actual leak",
    );
  if (variant === "dropped")
    assert(
      b.experiments.some(
        (e: any) =>
          e.config.transport === "broadcast" && e.summary.metrics.missing > 0,
      ),
    );
  if (variant === "starved")
    assert(
      b.experiments.some(
        (e: any) => e.summary.quality.event_loop_delay_max_ms > 100,
      ),
    );
  const bob = await tx(
    control,
    async (c) =>
      (await c.query("select id from switch_runs where id=$1", [id])).rows,
    ids.bob,
  );
  assert.equal(bob.length, 0);
  assert.equal(
    (
      await target.query("select count(*) from switch_orders where run_id=$1", [
        id,
      ])
    ).rows[0].count,
    "0",
  );
  const exported = await req("/switchboard/" + id + "/export");
  assert.equal(exported.receipts.length, b.receipts.length);
  await writeFile(
    `docs/evidence/switchboard-${variant}-${mode}${process.argv.includes("--full") ? "-full" : ""}.json`,
    JSON.stringify(exported, null, 2),
  );
  results.push({
    id,
    variant,
    mode,
    levels,
    result: b.run.verdict.result,
    experiments: b.experiments.length,
    receipts: b.receipts.length,
  });
  console.log(JSON.stringify(results.at(-1)));
}
await writeFile(
  `docs/evidence/switchboard-verification${process.argv.includes("--full") ? "-full" : process.argv.includes("--live") ? "-live" : ""}.json`,
  JSON.stringify(results, null, 2),
);
await control.end();
await target.end();
process.exit(0);
