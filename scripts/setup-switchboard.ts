import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { control, target } from "../server/db.ts";
import { hash } from "../server/contracts.ts";
import { contract } from "../products/switchboard/contract.ts";
const url = process.env.SUPABASE_URL!;
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw Error("Local only");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (let i = 1; i <= 4; i++) {
  const id = `20000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
  const found = await admin.auth.admin.getUserById(id);
  const r = found.data.user
    ? await admin.auth.admin.updateUserById(id, {
        password: process.env.FIXTURE_PASSWORD!,
      })
    : await admin.auth.admin.createUser({
        id,
        email: `switch${i}@breakroom.test`,
        password: process.env.FIXTURE_PASSWORD!,
        email_confirm: true,
      });
  if (r.error) throw r.error;
}
execFileSync(
  "docker",
  [
    "exec",
    "-i",
    "supabase_db_supa1",
    "psql",
    "-U",
    "supabase_admin",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
  ],
  {
    input: readFileSync("products/switchboard/target.sql"),
    env: {
      ...process.env,
      ...(process.env.DOCKER_HOST
        ? { DOCKER_HOST: process.env.DOCKER_HOST }
        : existsSync(homedir() + "/.colima/breakroom/docker.sock")
          ? {
              DOCKER_HOST:
                "unix://" + homedir() + "/.colima/breakroom/docker.sock",
            }
          : {}),
    },
    stdio: ["pipe", "pipe", "pipe"],
  },
);
await control.query(
  "insert into fixture_versions(id,module,contract,content_hash) values($1,$2,$3,$4) on conflict do nothing",
  ["Switchboard-v1", "Switchboard", contract, hash(contract)],
);
console.log(
  "Switchboard: four ordinary Auth identities, RLS, publication, private trigger and topic policies installed.",
);
await control.end();
await target.end();
