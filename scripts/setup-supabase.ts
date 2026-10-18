import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { execFileSync } from "node:child_process";
const url = process.env.SUPABASE_URL!;
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw Error("Loopback Supabase only");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const identities = [
  ["alice", "00000000-0000-4000-8000-000000000001"],
  ["bob", "00000000-0000-4000-8000-000000000002"],
  ["owner", "10000000-0000-4000-8000-000000000001"],
  ["member", "10000000-0000-4000-8000-000000000002"],
  ["contractor", "10000000-0000-4000-8000-000000000003"],
];
for (const [name, id] of identities) {
  const found = await admin.auth.admin.getUserById(id);
  if (!found.data.user) {
    const r = await admin.auth.admin.createUser({
      id,
      email: `${name}@breakroom.test`,
      password: process.env.FIXTURE_PASSWORD!,
      email_confirm: true,
    });
    if (r.error) throw r.error;
  } else {
    const r = await admin.auth.admin.updateUserById(id, {
      password: process.env.FIXTURE_PASSWORD!,
    });
    if (r.error) throw r.error;
  }
}
const p = new pg.Client(process.env.TARGET_DATABASE_URL);
await p.connect();
const db = new URL(process.env.DATABASE_URL!).pathname.slice(1);
if (db !== "breakroom_control") throw Error("Unexpected control database");
if (
  !(await p.query("select 1 from pg_database where datname=$1", [db])).rowCount
)
  await p.query("create database breakroom_control");
const uid = (
  await p.query(
    "select pg_get_functiondef('auth.uid()'::regprocedure) definition",
  )
).rows[0].definition;
const c = new pg.Client(process.env.DATABASE_URL);
await c.connect();
await c.query("create schema if not exists auth");
await c.query(uid);
await c.query(
  "grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated",
);
await c.end();
await p.end();
execFileSync(process.execPath, ["--import", "tsx", "scripts/setup.ts"], {
  stdio: "inherit",
});
console.log("Real Supabase identities and isolated control database ready.");
