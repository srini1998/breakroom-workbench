import { readFile, readdir } from "node:fs/promises";
import { control, target, ids } from "../server/db.ts";
import { contracts, hash, uuid } from "../server/contracts.ts";
async function main() {
  if (process.env.LOCAL_FIXTURE_AUTH !== "false") {
    for (const db of [control, target])
      await db.query(
        `do $$ begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$; create schema if not exists auth; create or replace function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid'; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
      );
  }
  await control.query(
    "create table if not exists _migrations(name text primary key)",
  );
  if (!process.argv.includes("--seed"))
    for (const file of (await readdir("supabase/migrations")).sort())
      if (
        !(
          await control.query("select 1 from _migrations where name=$1", [file])
        ).rowCount
      ) {
        const c = await control.connect();
        try {
          await c.query("begin");
          await c.query(await readFile("supabase/migrations/" + file, "utf8"));
          await c.query("insert into _migrations values($1)", [file]);
          await c.query("commit");
        } catch (e) {
          await c.query("rollback");
          throw e;
        } finally {
          c.release();
        }
      }
  if (!process.argv.includes("--migrate")) {
    await control.query(
      "insert into workspaces values($1,'Northstar Lab'),($2,'Control Tenant') on conflict do nothing",
      [ids.workspace, ids.other],
    );
    await control.query(
      "insert into memberships values($1,$2,'owner'),($3,$4,'owner') on conflict do nothing",
      [ids.workspace, ids.alice, ids.other, ids.bob],
    );
    for (const [module, contract] of Object.entries(contracts))
      await control.query(
        "insert into fixture_versions(id,module,contract,content_hash) values($1,$2,$3,$4) on conflict do nothing",
        [module + "-v1", module, contract, hash(contract)],
      );
    if (
      !(
        await control.query("select 1 from projects where workspace_id=$1", [
          ids.workspace,
        ])
      ).rowCount
    )
      await control.query(
        "insert into projects values($1,$2,'Reliability sandbox',now())",
        [uuid(), ids.workspace],
      );
  }
  console.log("Breakroom migrations and seed ready (non-destructive).");
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await control.end();
    await target.end();
  });
