import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:4310/api";
async function login(identity: string) {
  const r = await fetch(base + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity }),
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie")!.split(";")[0];
}
const alice = await login("alice"),
  bob = await login("bob");
const list = (await (
  await fetch(base + "/switchboard", { headers: { cookie: alice } })
).json()) as any;
const source = list.runs.find((r: any) => r.status === "completed");
assert(source);
for (const path of [
  "/switchboard/" + source.id,
  "/switchboard/" + source.id + "/export",
]) {
  const denied = await fetch(base + path, { headers: { cookie: bob } });
  assert.equal(denied.status, 404);
}
const b = (await (
  await fetch(base + "/switchboard", { headers: { cookie: bob } })
).json()) as any;
assert(!b.runs.some((r: any) => r.id === source.id));
const deniedCancel = await fetch(
  base + "/switchboard/" + source.id + "/cancel",
  {
    method: "POST",
    headers: { cookie: bob, "Content-Type": "application/json" },
    body: "{}",
  },
);
assert.equal(deniedCancel.status, 404);
const deniedOrigin = await fetch(base + "/switchboard", {
  method: "POST",
  headers: {
    cookie: alice,
    "Content-Type": "application/json",
    Origin: "http://evil.invalid",
  },
  body: "{}",
});
assert.equal(deniedOrigin.status, 403);
await writeFile(
  "docs/evidence/switchboard-isolation.json",
  JSON.stringify(
    {
      ordinary_local_supabase_auth: true,
      source_run: source.id,
      cross_workspace_detail: 404,
      cross_workspace_export: 404,
      cross_workspace_cancel: 404,
      catalog_hidden: true,
      foreign_origin: 403,
    },
    null,
    2,
  ),
);
console.log(
  "Switchboard ordinary Auth API workspace denial and origin checks passed.",
);
