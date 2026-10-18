import "dotenv/config";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { control, target, ids, schema } from "../server/db.ts";
import { contracts, ExperimentSpec, hash, uuid } from "../server/contracts.ts";
import {
  prepareImport,
  validateImport,
  commitImport,
  mappingFor,
} from "../products/importrescue/server.ts";
const report: any[] = [];
async function fixture() {
  const id = uuid(),
    project = (
      await control.query(
        "select id from projects where workspace_id=$1 limit 1",
        [ids.workspace],
      )
    ).rows[0].id;
  const spec = ExperimentSpec.parse({
    version: 1,
    project_id: project,
    contract_hash: hash(contracts.ImportRescue),
    fixture_version: "ImportRescue-v1",
    seed: 17,
    supported_parameters: {
      module: "ImportRescue",
      scenario: "supplier-a",
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
    "insert into runs(id,workspace_id,project_id,fixture_version,spec,config_hash,status) values($1,$2,$3,$4,$5,$6,'completed')",
    [id, ids.workspace, project, spec.fixture_version, spec, hash(spec)],
  );
  await prepareImport(id);
  return id;
}
try {
  const id = await fixture();
  const plan = await validateImport(
    id,
    '"sku","units","receipt"\r\n"BOLT","12","R-1"\r\n"NUT","6","R-2"',
    mappingFor("supplier-a"),
  );
  assert(plan.ready);
  const approval = uuid();
  await control.query(
    "insert into approvals(id,workspace_id,run_id,action_hash,plan,approved_by,approved_at) values($1,$2,$3,$4,$5,$6,now())",
    [approval, ids.workspace, id, hash(plan), plan, ids.alice],
  );
  const results = await Promise.all([
    commitImport(id, approval, ids.alice),
    commitImport(id, approval, ids.alice),
  ]);
  assert.equal(results.filter((r) => r.committed).length, 1);
  assert.equal(results.filter((r) => r.idempotent_replay).length, 1);
  assert.deepEqual(results[1].stock, [
    { sku: "BOLT", stock: 12 },
    { sku: "NUT", stock: 6 },
  ]);
  report.push({
    case: "quoted CSV and concurrent replay",
    run_id: id,
    results,
  });
  for (const csv of [
    "sku,units,receipt\nBOLT,12,R-1\nNUT,-1,R-2",
    'sku,units,receipt\n"BOLT,12,R-1',
    "sku,sku,receipt\nBOLT,12,R-1",
    "sku,units,receipt\nBOLT,9007199254740992,R-1",
  ]) {
    const run = await fixture(),
      p = await validateImport(run, csv, mappingFor("supplier-a"));
    assert(!p.ready);
    assert.equal(
      (
        await target.query(
          `select sum(stock)::int n from ${schema(run)}.catalog`,
        )
      ).rows[0].n,
      0,
    );
    report.push({
      case: "atomic rejection",
      errors: p.errors,
      stock_unchanged: true,
    });
  }
  await writeFile(
    "docs/evidence/importrescue-atomicity.json",
    JSON.stringify(
      { verified_at: new Date().toISOString(), checks: report },
      null,
      2,
    ),
  );
  console.log(
    "Quoted CSV, concurrent replay and malformed/invalid batch rejection passed.",
  );
} finally {
  await control.end();
  await target.end();
}
