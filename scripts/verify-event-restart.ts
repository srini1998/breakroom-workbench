import "dotenv/config";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { control, target, ids, schema } from "../server/db.ts";
import { ExperimentSpec, contracts, hash, uuid } from "../server/contracts.ts";
const id = uuid();
let worker: ReturnType<typeof spawn> | undefined;
try {
  const project = (
    await control.query(
      "select id from projects where workspace_id=$1 limit 1",
      [ids.workspace],
    )
  ).rows[0].id;
  const spec = ExperimentSpec.parse({
    version: 1,
    project_id: project,
    contract_hash: hash(contracts.EventMedic),
    fixture_version: "EventMedic-v1",
    seed: 17,
    supported_parameters: {
      module: "EventMedic",
      scenario: "interrupted",
      mode: "baseline",
    },
    limits: {
      steps: 16,
      milliseconds: 120000,
      tokens: 16000,
      estimated_spend: 0,
    },
  });
  await control.query(
    "insert into runs(id,workspace_id,project_id,fixture_version,spec,config_hash) values($1,$2,$3,$4,$5,$6)",
    [id, ids.workspace, project, spec.fixture_version, spec, hash(spec)],
  );
  const first = spawn(
    process.execPath,
    ["--import", "tsx", "server/worker.ts"],
    { env: { ...process.env, INJECT_CRASH_FOR_RUN: id }, stdio: "ignore" },
  );
  const exit = await Promise.race([
    new Promise<number | null>((r) => first.on("exit", r)),
    new Promise<never>((_, reject) =>
      setTimeout(() => {
        first.kill();
        reject(Error("Crash failpoint deadline exceeded"));
      }, 15000).unref(),
    ),
  ]);
  assert.equal(exit, 75);
  const committed = (
    await target.query(`select * from ${schema(id)}.operations`)
  ).rows;
  assert(committed.length >= 1);
  await control.query(
    "update runs set lease_until=now()-interval '1 second' where id=$1",
    [id],
  );
  worker = spawn(process.execPath, ["--import", "tsx", "server/worker.ts"], {
    env: process.env,
    stdio: "ignore",
  });
  const deadline = Date.now() + 15000;
  let r: any;
  while (Date.now() < deadline) {
    r = (await control.query("select * from runs where id=$1", [id])).rows[0];
    if (["completed", "failed"].includes(r.status)) break;
    await new Promise((res) => setTimeout(res, 100));
  }
  assert.equal(r.status, "completed");
  assert.equal(r.verdict.result, "pass");
  const ops = (await target.query(`select * from ${schema(id)}.operations`))
    .rows;
  assert.equal(ops.length, 2);
  const stock = (await target.query(`select * from ${schema(id)}.stock`))
    .rows[0];
  assert.equal(stock.available, 4);
  assert.equal(stock.outstanding, 0);
  await writeFile(
    "docs/evidence/eventmedic-process-restart.json",
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        run_id: id,
        first_worker_exit: exit,
        restarted_worker_attempt: r.attempts,
        operations: ops.length,
        stock,
        result: "pass",
        mechanism:
          "OS process terminated at injected post-commit/pre-ack boundary, expired lease reclaimed by new process",
      },
      null,
      2,
    ),
  );
  console.log("EventMedic actual worker-process crash/restart passed.");
} finally {
  worker?.kill("SIGTERM");
  await control.end();
  await target.end();
}
