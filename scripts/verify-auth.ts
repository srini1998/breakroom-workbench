import "dotenv/config";
import assert from "node:assert/strict";
import { accessSession } from "../products/accessproof/supabase.ts";
import { control, target, ids, tx } from "../server/db.ts";
import { prepareAccess, probeAccess } from "../products/accessproof/server.ts";
import { uuid } from "../server/contracts.ts";
import { writeFile } from "node:fs/promises";
try {
  for (const name of ["alice", "bob"]) {
    const c = await accessSession(name);
    const { data, error } = await c.auth.getUser();
    assert(!error);
    assert.equal(data.user!.id, ids[name as "alice" | "bob"]);
    const rows = await tx(
      control,
      async (p) => (await p.query("select * from projects")).rows,
      data.user!.id,
    );
    assert(
      rows.every(
        (r) =>
          r.workspace_id === (name === "alice" ? ids.workspace : ids.other),
      ),
    );
  }
  const run = uuid();
  await prepareAccess(run, "clean");
  const member = await accessSession("member");
  const changed = await member.auth.updateUser({
    data: { role: "owner", tenant: "b" },
  });
  assert(!changed.error);
  assert.equal(
    (
      await probeAccess(run, {
        tool: "probe_access",
        identity: "member",
        operation: "read_foreign",
      })
    ).actual,
    false,
  );
  assert.equal(
    (
      await probeAccess(run, {
        tool: "probe_access",
        identity: "member",
        operation: "update",
      })
    ).actual,
    false,
  );
  await writeFile(
    "docs/evidence/supabase-auth.json",
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        provider: "real local Supabase GoTrue",
        identities: ["alice", "bob"],
        checks: [
          "signInWithPassword",
          "getUser validates issued session",
          "ordinary authenticated SQL role sees only member workspace",
          "user-editable Supabase Auth metadata cannot grant tenant membership or document update",
        ],
        result: "pass",
      },
      null,
      2,
    ),
  );
  console.log("Real Supabase Auth sessions and workspace isolation passed.");
} finally {
  await control.end();
  await target.end();
  process.exit();
}
