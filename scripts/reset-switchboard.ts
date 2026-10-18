import { z } from "zod";
import { control, target } from "../server/db.ts";
const id = z.string().uuid().parse(process.argv[2]);
try {
  const r = (
    await control.query("select id,status from switch_runs where id=$1", [id])
  ).rows[0];
  if (!r || !["completed", "failed", "cancelled"].includes(r.status))
    throw Error("Known finished Switchboard run required");
  const removed = await target.query(
    "delete from switch_orders where run_id=$1",
    [id],
  );
  console.log(
    JSON.stringify({
      run_id: id,
      removed_target_rows: removed.rowCount,
      control_evidence: "preserved",
    }),
  );
} finally {
  await control.end();
  await target.end();
}
