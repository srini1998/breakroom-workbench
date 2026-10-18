import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import { control, target, ids } from "../server/db.ts";
import { contracts, ExperimentSpec, hash, uuid } from "../server/contracts.ts";
import { runClaimed } from "../server/runtime.ts";
const module = process.argv[2] as keyof typeof contracts;
if (!contracts[module]) throw Error("Pass a product name");
const scenarios = process.argv[3]
  ? [process.argv[3]]
  : [...contracts[module].scenarios];
const modes = (
  process.argv.includes("--baseline-only") ? ["baseline"] : ["baseline", "live"]
) as ("baseline" | "live")[];
const out: any[] = [];
try {
  const project = (
    await control.query(
      "select id from projects where workspace_id=$1 order by created_at limit 1",
      [ids.workspace],
    )
  ).rows[0]?.id;
  if (!project) throw Error("Seed project missing");
  for (const scenario of scenarios)
    for (const mode of modes) {
      const id = uuid();
      const spec = ExperimentSpec.parse({
        version: 1,
        project_id: project,
        contract_hash: hash(contracts[module]),
        fixture_version: module + "-v1",
        seed: 17,
        supported_parameters: { module, scenario, mode },
        limits: {
          steps: 16,
          milliseconds: 120000,
          tokens: 16000,
          estimated_spend: 0,
        },
      });
      const r = (
        await control.query(
          "insert into runs(id,workspace_id,project_id,fixture_version,spec,config_hash,status,lease_until) values($1,$2,$3,$4,$5,$6,'running',now()+interval '10 minutes') returning *",
          [id, ids.workspace, project, spec.fixture_version, spec, hash(spec)],
        )
      ).rows[0];
      const started = Date.now();
      await runClaimed(r);
      let a = (
        await control.query("select * from approvals where run_id=$1", [id])
      ).rows[0];
      if (a) {
        await control.query(
          "update approvals set approved_by=$1,approved_at=now() where id=$2",
          [ids.alice, a.id],
        );
        r.deadline_at = new Date(Date.now() + 120000);
        await runClaimed(r);
      }
      const saved = (
        await control.query("select * from runs where id=$1", [id])
      ).rows[0];
      const calls = (
        await control.query(
          "select action,result from tool_calls where run_id=$1 order by created_at",
          [id],
        )
      ).rows;
      const entry = {
        module,
        scenario,
        mode,
        id,
        status: saved.status,
        verdict: saved.verdict,
        tool_count: calls.length,
        inference: calls
          .filter((x) => x.result.structured_observations.model_usage)
          .map((x) => x.result.structured_observations.model_usage),
        milliseconds: Date.now() - started,
      };
      out.push(entry);
      console.log(
        JSON.stringify({
          module,
          scenario,
          mode,
          status: entry.status,
          verdict: entry.verdict?.result,
          milliseconds: entry.milliseconds,
        }),
      );
    }
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    `docs/evidence/${module.toLowerCase()}-evaluation${process.argv[3] ? "-" + process.argv[3] : ""}.json`,
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        environment:
          "real local Supabase Auth/PostgREST/Postgres/Storage; local Ollama qwen2.5:3b",
        results: out,
      },
      null,
      2,
    ),
  );
  if (
    out.some(
      (x) =>
        x.status !== "completed" ||
        ["inconclusive", "unsupported", "not_evaluated"].includes(
          x.verdict?.result,
        ),
    )
  )
    process.exitCode = 1;
} finally {
  await control.end();
  await target.end();
  process.exit(process.exitCode || 0);
}
