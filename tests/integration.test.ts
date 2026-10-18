import test, { after } from "node:test";
import assert from "node:assert/strict";
import { control, target, tx, ids, schema } from "../server/db.ts";
import {
  Action,
  ExperimentSpec,
  contracts,
  hash,
  uuid,
  baseline,
  type AgentAction,
} from "../server/contracts.ts";
import { prepareAccess, probeAccess } from "../products/accessproof/server.ts";
import {
  recoverEvents,
  prepareEvents,
  processEvent,
} from "../products/eventmedic/server.ts";
import { dryImport, commitImport } from "../products/importrescue/server.ts";
import { economy } from "../products/economybreaker/server.ts";
import { claim, runClaimed, executeTool } from "../server/runtime.ts";
import { erasurePlan, erase } from "../products/erasurecheck/server.ts";
const owned: string[] = [];
function fixture() {
  const id = uuid();
  owned.push(id);
  return id;
}
async function makeRun(
  module: keyof typeof contracts = "AccessProof",
  scenario = "clean",
  changes: Record<string, unknown> = {},
) {
  const id = fixture();
  const project = (
    await control.query(
      "select id from projects where workspace_id=$1 limit 1",
      [ids.workspace],
    )
  ).rows[0].id;
  const spec = ExperimentSpec.parse({
    version: 1,
    project_id: project,
    contract_hash: hash(contracts[module]),
    fixture_version: module + "-v1",
    seed: 17,
    supported_parameters: { module, scenario, mode: "baseline" },
    limits: {
      steps: 16,
      milliseconds: 120000,
      tokens: 8000,
      estimated_spend: 0,
    },
  });
  return (
    await control.query(
      "insert into runs(id,workspace_id,project_id,fixture_version,spec,config_hash) values($1,$2,$3,$4,$5,$6) returning *",
      [id, ids.workspace, project, spec.fixture_version, spec, hash(spec)],
    )
  ).rows[0];
}
after(async () => {
  for (const id of owned)
    await target.query(`drop schema if exists ${schema(id)} cascade`);
  await control.end();
  await target.end();
});
test("ordinary database sessions enforce cross-workspace SELECT and INSERT denial", async () => {
  const own = await tx(
    control,
    async (c) => (await c.query("select * from projects")).rows,
    ids.alice,
  );
  assert(own.length > 0);
  assert(own.every((r) => r.workspace_id === ids.workspace));
  const foreign = await tx(
    control,
    async (c) =>
      (
        await c.query("select * from projects where workspace_id=$1", [
          ids.workspace,
        ])
      ).rows,
    ids.bob,
  );
  assert.equal(foreign.length, 0);
  await assert.rejects(
    tx(
      control,
      async (c) =>
        c.query("insert into projects(id,workspace_id,name) values($1,$2,$3)", [
          uuid(),
          ids.workspace,
          "Forbidden",
        ]),
      ids.bob,
    ),
    /row-level security/,
  );
});
test("invalid or module-inappropriate model actions cannot execute", async () => {
  assert.throws(() => Action.parse({ tool: "shell", command: "rm -rf /" }));
  assert.throws(() =>
    Action.parse({ tool: "inspect_contract", sql: "select secret" }),
  );
  assert.throws(() =>
    Action.parse({
      tool: "probe_access",
      identity: "service_role",
      operation: "read_own",
    }),
  );
  const run = await makeRun();
  await assert.rejects(
    executeTool(run, { tool: "verify_economy" }),
    /not allowed/,
  );
});
test("AccessProof clean permission matrix including owner writes", async () => {
  const run = fixture();
  await prepareAccess(run, "clean");
  for (const a of baseline("AccessProof"))
    if (a.tool === "probe_access")
      assert.equal((await probeAccess(run, a)).passed, true, a.operation);
});
const expected = [
  "read_foreign",
  "update",
  "reassign",
  "attachment",
  "unassigned",
];
for (let i = 0; i < 5; i++)
  test(`AccessProof candidate-${i + 1} produces exactly its isolated forbidden behavior`, async () => {
    const run = fixture();
    await prepareAccess(run, "candidate-" + (i + 1));
    const failed = [];
    for (const a of baseline("AccessProof"))
      if (a.tool === "probe_access") {
        const r = await probeAccess(run, a);
        if (!r.passed) failed.push(r.operation);
      }
    assert.deepEqual(
      failed,
      i === 1 ? ["profile_escalation", "update"] : [expected[i]],
    );
  });
for (const scenario of ["ordered", "duplicate", "reordered", "interrupted"])
  test(
    "EventMedic " + scenario + " preserves ledger and one effect per operation",
    async () => {
      const run = fixture();
      const result = await recoverEvents(run, scenario);
      assert(result.passed);
      assert.equal(result.ledger.length, scenario === "duplicate" ? 4 : 2);
      assert(result.history.length >= 4);
      if (scenario === "reordered")
        assert(result.history.some((r) => r.outcome === "waiting_dependency"));
      if (scenario === "interrupted")
        assert(result.history.some((r) => r.outcome === "duplicate"));
    },
  );
test("EventMedic new process delivery reconciles committed operation after lost acknowledgement", async () => {
  const run = fixture();
  await prepareEvents(run, "interrupted");
  await assert.rejects(processEvent(run, 1, true), /AFTER_COMMIT/);
  assert.equal(await processEvent(run, 1), "duplicate");
  assert((await recoverEvents(run, "interrupted")).passed);
});
for (const scenario of ["supplier-a", "supplier-b", "supplier-c"])
  test(
    "ImportRescue " + scenario + " stages declared conversion and commits once",
    async () => {
      const run = await makeRun("ImportRescue", scenario);
      const plan = await dryImport(run.id, scenario);
      assert(plan.ready);
      const approval = uuid();
      await control.query(
        "insert into approvals(id,workspace_id,run_id,action_hash,plan,approved_by,approved_at) values($1,$2,$3,$4,$5,$6,now())",
        [approval, ids.workspace, run.id, hash(plan), plan, ids.alice],
      );
      const first = await commitImport(run.id, approval, ids.alice),
        second = await commitImport(run.id, approval, ids.alice);
      assert(first.committed);
      assert(second.idempotent_replay);
      assert.deepEqual(second.stock, [
        { sku: "BOLT", stock: 12 },
        { sku: "NUT", stock: 6 },
      ]);
    },
  );
for (const scenario of ["missing-pack", "invalid-row", "conflict"])
  test(
    "ImportRescue " + scenario + " abstains or rejects the full batch",
    async () => {
      const run = fixture(),
        plan = await dryImport(run, scenario);
      assert.equal(plan.ready, false);
      assert(plan.errors.length);
      if (scenario === "missing-pack") assert(plan.abstain);
      const stock = (
        await target.query(
          `select sum(stock)::int n from ${schema(run)}.catalog`,
        )
      ).rows[0].n;
      assert.equal(stock, 0);
    },
  );
test("ImportRescue refuses stale approval after pack definition changes", async () => {
  const run = await makeRun("ImportRescue", "supplier-b"),
    plan = await dryImport(run.id, "supplier-b"),
    approval = uuid();
  await control.query(
    "insert into approvals(id,workspace_id,run_id,action_hash,plan,approved_by,approved_at) values($1,$2,$3,$4,$5,$6,now())",
    [approval, ids.workspace, run.id, hash(plan), plan, ids.alice],
  );
  await target.query(
    `update ${schema(run.id)}.packs set multiplier=12 where sku='BOLT' and unit='box'`,
  );
  await assert.rejects(
    commitImport(run.id, approval, ids.alice),
    /Stale approval/,
  );
  assert.equal(
    (
      await target.query(
        `select sum(stock)::int n from ${schema(run.id)}.catalog`,
      )
    ).rows[0].n,
    0,
  );
});
for (const scenario of ["withdrawal", "craft", "transfer"])
  test(
    "EconomyBreaker " +
      scenario +
      " breaks seeded variant and passes correction with same trace",
    async () => {
      const r = await economy(fixture(), scenario);
      assert.equal(r.experiments.length, 2);
      assert.equal(r.experiments[0].passed, false);
      assert.equal(r.experiments[1].passed, true);
      const minimized = (r.experiments[0] as any).minimized_reproduction;
      assert(minimized);
      assert.equal(minimized.action_count, scenario === "transfer" ? 1 : 2);
      assert.equal(minimized.corrected_replay.passed, true);
      assert(minimized.trials.slice(0, -1).every((t: any) => t.passed));
    },
  );
test("EconomyBreaker clean fixtures allow legitimate crafting", async () => {
  const r = await economy(fixture(), "clean");
  assert(r.passed);
  assert.equal(r.experiments.length, 3);
});
test("worker persists a full AccessProof run, finding, evidence hashes and verdict independently", async () => {
  const run = await makeRun("AccessProof", "candidate-4");
  await runClaimed(run);
  const saved = (
    await control.query("select * from runs where id=$1", [run.id])
  ).rows[0];
  assert.equal(saved.status, "completed");
  assert.equal(saved.verdict.result, "fail");
  const artifacts = (
    await control.query("select * from artifacts where run_id=$1", [run.id])
  ).rows;
  assert.equal(artifacts.length, 9);
  for (const a of artifacts) assert.equal(a.content_hash, hash(a.content));
  assert.equal(
    (await control.query("select * from findings where run_id=$1", [run.id]))
      .rowCount,
    1,
  );
});
test("cancellation and total deadline do not become passing runs", async () => {
  const cancelled = await makeRun();
  await control.query("update runs set cancel_requested=true where id=$1", [
    cancelled.id,
  ]);
  await runClaimed(cancelled);
  assert.equal(
    (await control.query("select status from runs where id=$1", [cancelled.id]))
      .rows[0].status,
    "cancelled",
  );
  const timeout = await makeRun();
  timeout.deadline_at = new Date(Date.now() - 1);
  await runClaimed(timeout);
  const r = (
    await control.query("select * from runs where id=$1", [timeout.id])
  ).rows[0];
  assert.equal(r.status, "failed");
  assert.equal(r.verdict.result, "inconclusive");
});
test("expired worker lease is reclaimed and persisted steps are not duplicated", async () => {
  await control.query(
    "update runs set status='cancelled' where status='queued' and id=any($1::uuid[])",
    [owned],
  );
  const run = await makeRun("EventMedic", "interrupted");
  const worker = uuid();
  const c = await claim(worker);
  assert.equal(c.id, run.id);
  await prepareEvents(run.id, "interrupted");
  await assert.rejects(processEvent(run.id, 1, true));
  await control.query(
    "update runs set lease_until=now()-interval '1 second' where id=$1",
    [run.id],
  );
  const reclaimed = await claim(uuid());
  assert.equal(reclaimed.id, run.id);
  assert.equal(reclaimed.attempts, 2);
  await runClaimed(reclaimed);
  const r = (await control.query("select * from runs where id=$1", [run.id]))
    .rows[0];
  assert.equal(r.verdict.result, "pass");
  assert.equal(
    (await control.query("select * from steps where run_id=$1", [run.id]))
      .rowCount,
    9,
  );
});

test("approved import worker phase commits and stale scenario rejects with durable evidence", async () => {
  for (const scenario of ["supplier-b", "stale-approval"]) {
    const r = await makeRun("ImportRescue", scenario);
    await runClaimed(r);
    const a = (
      await control.query("select * from approvals where run_id=$1", [r.id])
    ).rows[0];
    assert(a);
    await control.query(
      "update approvals set approved_by=$1,approved_at=now() where id=$2",
      [ids.alice, a.id],
    );
    await runClaimed(r);
    const saved = (
      await control.query("select * from runs where id=$1", [r.id])
    ).rows[0];
    assert.equal(saved.verdict.result, "pass");
    const stock = (
      await target.query(
        `select sum(stock)::int n from ${schema(r.id)}.catalog`,
      )
    ).rows[0].n;
    assert.equal(stock, scenario === "stale-approval" ? 0 : 18);
  }
});
test("missing domain verification evidence yields an inconclusive verdict", async () => {
  const r = await makeRun("EventMedic", "ordered");
  r.spec.limits.steps = 2;
  await control.query("update runs set spec=$1,config_hash=$2 where id=$3", [
    r.spec,
    hash(r.spec),
    r.id,
  ]);
  await runClaimed(r);
  const saved = (await control.query("select * from runs where id=$1", [r.id]))
    .rows[0];
  assert.equal(saved.status, "completed");
  assert.equal(saved.verdict.result, "inconclusive");
});
test(
  "real local Supabase Storage deletion and delayed export fencing",
  {
    skip: !process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY
      ? "Blocked: Docker/Supabase Storage unavailable"
      : false,
  },
  async () => {
    const run = fixture(),
      plan = await erasurePlan(run, "delayed");
    const result = await erase(run, plan);
    assert(result.passed);
  },
);
