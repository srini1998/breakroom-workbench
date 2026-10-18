import { control, target, schema } from "../server/db.ts";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
const id = z.string().uuid().parse(process.argv[2]);
try {
  const run = (await control.query("select * from runs where id=$1", [id]))
    .rows[0];
  if (!run) throw Error("Unknown run; refusing unowned reset");
  if (["running", "queued"].includes(run.status))
    throw Error("Cancel and finish the run before reset");
  if (run.spec.supported_parameters.module === "ErasureCheck") {
    const url = process.env.TARGET_SUPABASE_URL || "http://127.0.0.1:54321",
      key = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw Error("Storage key required to reset this run completely");
    if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
      throw Error("Loopback only");
    const storage = createClient(url, key).storage;
    const bucket = "breakroom-" + id;
    const cleared = await storage.emptyBucket(bucket);
    if (cleared.error && !cleared.error.message.includes("not found"))
      throw cleared.error;
    await storage.deleteBucket(bucket);
  }
  await target.query(`drop schema if exists ${schema(id)} cascade`);
  console.log(
    "Removed target resources for " + id + ". Durable evidence is preserved.",
  );
} finally {
  await control.end();
  await target.end();
}
