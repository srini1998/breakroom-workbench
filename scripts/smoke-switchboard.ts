import assert from "node:assert/strict";
import { control, target, ids } from "../server/db.ts";
import { uuid, hash } from "../server/contracts.ts";
import { Config } from "../products/switchboard/contract.ts";
import { experiment } from "../products/switchboard/runner.ts";
const project = (
  await control.query("select id from projects where workspace_id=$1 limit 1", [
    ids.workspace,
  ])
).rows[0].id;
const spec = Config.parse({
    project_id: project,
    levels: [1],
    operations: 4,
    observation_ms: 1500,
    variant: process.argv[2] || "scoped",
  }),
  run = { id: uuid(), workspace_id: ids.workspace, spec };
await control.query(
  "insert into switch_runs(id,workspace_id,project_id,fixture_version,spec,config_hash,status) values($1,$2,$3,'Switchboard-v1',$4,$5,'running')",
  [run.id, run.workspace_id, project, spec, hash(spec)],
);
try {
  for (const transport of ["changes", "broadcast"] as const) {
    const exp = {
      id: uuid(),
      config: { transport, level: 1, repetition: -1, smoke: true },
    };
    await control.query(
      "insert into switch_experiments(id,run_id,workspace_id,ordinal,config,config_hash,status) values($1,$2,$3,$4,$5,$6,'running')",
      [
        exp.id,
        run.id,
        run.workspace_id,
        transport === "changes" ? 0 : 1,
        exp.config,
        hash(exp.config),
      ],
    );
    const summary = await experiment(run, exp, async () => {});
    await control.query(
      "update switch_experiments set status='completed',summary=$2 where id=$1",
      [exp.id, summary],
    );
    assert.equal(
      summary.result,
      spec.variant === "starved"
        ? "inconclusive"
        : transport === "broadcast" &&
            ["broad", "dropped"].includes(spec.variant)
          ? "fail"
          : "pass",
    );
    console.log(
      JSON.stringify({
        transport,
        result: summary.result,
        metrics: summary.metrics,
        negative: summary.negative,
        quality: summary.quality,
      }),
    );
  }
  await control.query(
    "update switch_runs set status='completed',verdict=$2 where id=$1",
    [
      run.id,
      {
        result: "inconclusive",
        reasons: ["Milestone one smoke only; not paired comparison"],
      },
    ],
  );
} catch (e) {
  await control.query(
    "update switch_runs set status='failed',verdict=$2 where id=$1",
    [run.id, { result: "inconclusive", reasons: [(e as Error).message] }],
  );
  throw e;
} finally {
  await target.query("delete from switch_orders where run_id=$1", [run.id]);
  await control.end();
  await target.end();
}
process.exit(0);
