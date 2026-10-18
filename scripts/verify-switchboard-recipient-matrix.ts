import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { identity } from "../products/switchboard/runner.ts";
import { uuid } from "../server/contracts.ts";
import { control, target } from "../server/db.ts";
const experiment = uuid(),
  run = uuid(),
  results: any[] = [];
try {
  for (let i = 1; i <= 4; i++) {
    const c = await identity(i),
      tenant = i <= 2 ? 1 : 2,
      role = i % 2 ? "owner" : "viewer";
    try {
      const ch = c
        .channel(`switch:${experiment}:scoped:${3 - tenant}`, {
          config: { private: true },
        })
        .on("broadcast", { event: "INSERT" }, () => {
          throw Error("Forbidden receipt");
        });
      const status = await new Promise<string>((resolve) => {
        const timer = setTimeout(() => resolve("TIMEOUT"), 10000);
        ch.subscribe((s) => {
          if (s === "CHANNEL_ERROR" || s === "SUBSCRIBED") {
            clearTimeout(timer);
            resolve(s);
          }
        });
      });
      assert.equal(
        status,
        "CHANNEL_ERROR",
        `identity ${i} foreign private join`,
      );
      const targets = role === "viewer" ? [tenant, 3 - tenant] : [3 - tenant];
      const writes = [];
      for (const t of targets) {
        const r = await c
          .from("switch_orders")
          .insert({
            id: uuid(),
            run_id: run,
            experiment_id: experiment,
            tenant: t,
            event_id: uuid(),
            seq: 1,
            seed: 42,
            version: 1,
            payload: "negative authorization matrix",
            transport: "broadcast",
            variant: "scoped",
          });
        assert(r.error, `identity ${i} forbidden write`);
        writes.push({ tenant: t, denied: true, error_code: r.error.code });
      }
      results.push({
        identity: `switch${i}`,
        tenant,
        role,
        foreign_private_join: status,
        writes,
      });
      await ch.unsubscribe(500);
      ch.teardown();
    } finally {
      await c.realtime.disconnect();
    }
  }
  await writeFile(
    "docs/evidence/switchboard-recipient-matrix.json",
    JSON.stringify(
      {
        actual_ordinary_supabase_auth: true,
        scope:
          "Both owner/viewer identities in each tenant; foreign private subscription and forbidden writes.",
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    "All four ordinary owner/viewer identities denied foreign private joins and forbidden writes.",
  );
} finally {
  await target.query(
    "delete from switch_orders where run_id=$1 and experiment_id=$2",
    [run, experiment],
  );
  await control.end();
  await target.end();
}
