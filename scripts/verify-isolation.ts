import "dotenv/config";
import pg from "pg";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { control, target } from "../server/db.ts";
try {
  const roles = [];
  for (const db of [control, target]) {
    const r = (
      await db.query(
        "select current_user,rolsuper,rolbypassrls from pg_roles where rolname=current_user",
      )
    ).rows[0];
    assert.equal(r.rolsuper, false);
    assert.equal(r.rolbypassrls, false);
    roles.push(r);
  }
  assert.notEqual(roles[0].current_user, roles[1].current_user);
  const foreign = new URL(process.env.TARGET_DATABASE_URL!);
  foreign.pathname = "/breakroom_control";
  const client = new pg.Client(foreign.toString());
  await assert.rejects(client.connect(), /permission denied for database/);
  await client.end().catch(() => {});
  await writeFile(
    "docs/evidence/credential-isolation.json",
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        roles,
        target_credential_cannot_connect_to_control: true,
        result: "pass",
      },
      null,
      2,
    ),
  );
  console.log(
    "Separate restricted credentials and cross-database denial passed.",
  );
} finally {
  await control.end();
  await target.end();
}
