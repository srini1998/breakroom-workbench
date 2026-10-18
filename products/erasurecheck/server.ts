import { createClient } from "@supabase/supabase-js";
import { target, tx, schema } from "../../server/db.ts";
function storage() {
  const url = process.env.TARGET_SUPABASE_URL || "http://127.0.0.1:54321";
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw Error("Storage target must be loopback");
  const key = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;
  if (!key)
    throw Error(
      "Real local Supabase Storage unavailable: set TARGET_SUPABASE_SERVICE_ROLE_KEY and start the disposable local stack",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;
}
export async function erasurePlan(run: string, scenario: string) {
  const store = storage();
  const s = schema(run);
  await target.query(`create schema if not exists ${s};create table if not exists ${s}.fixture_config(mode text);create table if not exists ${s}.accounts(id text primary key,epoch int not null default 0,deleted boolean not null default false);insert into ${s}.accounts values('owned',0,false),('control',0,false) on conflict do nothing;
 create table if not exists ${s}.resources(id text primary key,owner text,shared boolean not null default false);insert into ${s}.resources values('profile','owned',false),('export','owned',false),('shared','owned',true),('control-profile','control',false) on conflict do nothing;
 create table if not exists ${s}.jobs(id text primary key,owner text,epoch int,status text);insert into ${s}.jobs values('pending-export','owned',0,'pending') on conflict do nothing;`);
  if (!(await target.query(`select 1 from ${s}.fixture_config`)).rowCount)
    await target.query(`insert into ${s}.fixture_config values($1)`, [
      scenario,
    ]);
  const bucket = "breakroom-" + run;
  const b = await store.createBucket(bucket, { public: false });
  if (b.error && !/already exists/i.test(b.error.message)) throw b.error;
  for (const key of [
    "owned/attachment.txt",
    "control/keep.txt",
    "shared/team.txt",
  ]) {
    const r = await store
      .from(bucket)
      .upload(key, new TextEncoder().encode("Local seeded fixture " + key), {
        upsert: true,
        contentType: "text/plain",
      });
    if (r.error) throw r.error;
  }
  return {
    module: "ErasureCheck",
    run,
    bucket,
    owner: "owned",
    delete: ["profile", "export", "owned/*"],
    owned_object_prefix: "owned/",
    detach: ["shared"],
    preserve: ["control-profile", "control/keep.txt", "shared/team.txt"],
    epoch_from: 0,
    epoch_to: 1,
    delayed_job: "pending-export",
    limitations: [
      "Live controlled resources only",
      "No backup inspection or legal compliance verdict",
    ],
    ready: true,
  };
}
export async function erase(
  run: string,
  plan: Awaited<ReturnType<typeof erasurePlan>>,
  afterTombstone?: () => Promise<void>,
) {
  const store = storage(),
    s = schema(run);
  if (plan.run !== run || plan.bucket !== "breakroom-" + run)
    throw Error("Plan scope mismatch");
  const mode = (await target.query(`select mode from ${s}.fixture_config`))
    .rows[0].mode;
  // Export and deletion both acquire the same row lock. Deletion commits its tombstone before storage work;
  // exports hold the lock through storage upload and resource commit. Crash retry uses the tombstone.
  await tx(target, async (c) => {
    await c.query(`select * from ${s}.accounts where id='owned' for update`);
    await c.query(
      `update ${s}.accounts set deleted=true,epoch=greatest(epoch,1) where id='owned'`,
    );
    if (mode !== "incomplete") {
      await c.query(
        `delete from ${s}.resources where owner='owned' and not shared`,
      );
      await c.query(
        `update ${s}.resources set owner=null where owner='owned' and shared`,
      );
    }
  });
  if (afterTombstone) await afterTombstone();
  if (mode !== "incomplete") {
    const listed = await store.from(plan.bucket).list("owned");
    if (listed.error) throw listed.error;
    const keys = listed.data.map((o) => "owned/" + o.name);
    if (keys.length) {
      const r = await store.from(plan.bucket).remove(keys);
      if (r.error) throw r.error;
    }
  }
  const delayed = await releaseDelayedExport(run, plan.bucket);
  const owned = await store.from(plan.bucket).list("owned");
  const control = await store.from(plan.bucket).list("control");
  const shared = await store.from(plan.bucket).list("shared");
  if (owned.error || control.error || shared.error)
    throw Error("Storage verification failed");
  const checkOwned = await store
    .from(plan.bucket)
    .download("owned/attachment.txt");
  const controlBody = await store
    .from(plan.bucket)
    .download("control/keep.txt");
  const sharedBody = await store.from(plan.bucket).download("shared/team.txt");
  const storageChecks = {
    owned_download_absent: Boolean(checkOwned.error),
    control_content_unchanged:
      !controlBody.error &&
      (await controlBody.data.text()) ===
        "Local seeded fixture control/keep.txt",
    shared_content_unchanged:
      !sharedBody.error &&
      (await sharedBody.data.text()) === "Local seeded fixture shared/team.txt",
  };
  const rows = (await target.query(`select * from ${s}.resources order by id`))
    .rows;
  return {
    invariant_id: "erasure.no_resurrection",
    expected:
      "Owned live resources absent; control/shared preserved; delayed export fenced",
    actual: {
      owned_objects: owned.data,
      control_objects: control.data,
      shared_objects: shared.data,
      rows,
      delayed,
      storage_checks: storageChecks,
    },
    passed:
      owned.data.length === 0 &&
      storageChecks.owned_download_absent &&
      storageChecks.control_content_unchanged &&
      storageChecks.shared_content_unchanged &&
      control.data.some((x) => x.name === "keep.txt") &&
      shared.data.some((x) => x.name === "team.txt") &&
      !rows.some((r) => r.owner === "owned") &&
      delayed === "fenced",
    scope:
      "Real local Supabase Storage and target SQL; no backups or legal certification",
  };
}

export async function releaseDelayedExport(
  run: string,
  bucket: string,
  onClaim?: () => Promise<void>,
) {
  if (bucket !== "breakroom-" + run)
    throw Error("Export bucket scope mismatch");
  const store = storage(),
    s = schema(run);
  return tx(target, async (c) => {
    const a = (
      await c.query(`select * from ${s}.accounts where id='owned' for update`)
    ).rows[0];
    const job = (
      await c.query(
        `select * from ${s}.jobs where id='pending-export' for update`,
      )
    ).rows[0];
    if (onClaim) await onClaim();
    if (a.deleted || a.epoch !== job.epoch) {
      await c.query(
        `update ${s}.jobs set status='fenced' where id='pending-export'`,
      );
      return "fenced";
    }
    const r = await store
      .from(bucket)
      .upload("owned/export.txt", new TextEncoder().encode("export"), {
        upsert: true,
      });
    if (r.error) throw r.error;
    await c.query(
      `insert into ${s}.resources values('late-export','owned',false) on conflict do nothing`,
    );
    return "executed";
  });
}

export async function inspectErasureScope(run: string, scenario: string) {
  const plan = await erasurePlan(run, scenario);
  const s = schema(run),
    store = storage();
  const owned = await store.from(plan.bucket).list("owned");
  const control = await store.from(plan.bucket).list("control");
  const shared = await store.from(plan.bucket).list("shared");
  if (owned.error || control.error || shared.error)
    throw Error("Storage enumeration failed");
  return {
    scope:
      "Owned and shared resources enumerated through SQL and real Supabase Storage",
    resources: (await target.query(`select * from ${s}.resources order by id`))
      .rows,
    owned_objects: owned.data,
    control_objects: control.data,
    shared_objects: shared.data,
    pending_work: (await target.query(`select * from ${s}.jobs`)).rows,
    proposed_scope: {
      delete: plan.delete,
      preserve: plan.preserve,
      detach: plan.detach,
    },
  };
}

/** Adds public product facts to the fictional account's real owned Storage area. */
export async function attachPublicReceipt(run: string, csv: string) {
  if (Buffer.byteLength(csv) > 65536) throw Error("Receipt too large");
  const s = schema(run);
  await tx(target, async (c) => {
    const account = (
      await c.query(
        `select deleted from ${s}.accounts where id='owned' for update`,
      )
    ).rows[0];
    if (!account || account.deleted)
      throw Error("Closed account cannot receive an export");
    const r = await storage()
      .from("breakroom-" + run)
      .upload("owned/purchase-lines.csv", new TextEncoder().encode(csv), {
        upsert: true,
        contentType: "text/csv",
      });
    if (r.error) throw r.error;
    await c.query(
      `insert into ${s}.resources values('purchase-lines','owned',false) on conflict do nothing`,
    );
  });
}
