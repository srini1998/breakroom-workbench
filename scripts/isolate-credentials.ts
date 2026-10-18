import { existsSync } from "node:fs";
import { homedir } from "node:os";
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import pg from "pg";
const raw = execFileSync("npx", ["supabase", "status", "--output", "json"], {
  encoding: "utf8",
  env: {
    ...process.env,
    DOCKER_HOST:
      process.env.DOCKER_HOST ||
      (existsSync(homedir() + "/.colima/breakroom/docker.sock")
        ? "unix://" + homedir() + "/.colima/breakroom/docker.sock"
        : undefined),
  },
});
const status = JSON.parse(raw.slice(raw.indexOf("{")));
const bootstrap = new URL(status.DB_URL);
if (!["localhost", "127.0.0.1"].includes(bootstrap.hostname))
  throw Error("Local stack only");
const connection = new pg.Client(bootstrap.toString());
await connection.connect();
const controlRole = "breakroom_control_owner",
  targetRole = "breakroom_target_owner";
const controlPass = randomBytes(24).toString("hex"),
  targetPass = randomBytes(24).toString("hex");
try {
  for (const [role, password] of [
    [controlRole, controlPass],
    [targetRole, targetPass],
  ]) {
    if (
      !(
        await connection.query("select 1 from pg_roles where rolname=$1", [
          role,
        ])
      ).rowCount
    )
      await connection.query(
        `create role ${role} login noinherit nosuperuser nocreatedb nocreaterole nobypassrls password '${password}'`,
      );
    else await connection.query(`alter role ${role} password '${password}'`);
    await connection.query(`grant authenticated to ${role}`);
    await connection.query(`grant ${role} to postgres with set true`);
  }
  await connection.query(
    `grant create,connect on database postgres to ${targetRole};grant usage,create on schema public to ${targetRole};grant usage on schema auth to ${targetRole};grant execute on function auth.uid() to ${targetRole};revoke connect on database breakroom_control from public;grant connect on database breakroom_control to ${controlRole};alter database breakroom_control owner to ${controlRole};`,
  );
  // Adopt only generated experiment schemas, never Supabase-owned Auth/Storage schemas.
  const schemas = (
    await connection.query(
      "select nspname from pg_namespace where nspname ~ '^r_[0-9a-f]{32}$'",
    )
  ).rows;
  for (const { nspname: s } of schemas) {
    await connection.query(`alter schema ${s} owner to ${targetRole}`);
    const tables = (
      await connection.query(
        "select tablename from pg_tables where schemaname=$1",
        [s],
      )
    ).rows;
    for (const { tablename: t } of tables)
      await connection.query(`alter table ${s}."${t}" owner to ${targetRole}`);
    const functions = (
      await connection.query(
        "select p.oid::regprocedure::text name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=$1",
        [s],
      )
    ).rows;
    for (const f of functions)
      await connection.query(`alter function ${f.name} owner to ${targetRole}`);
  }
  if (
    (
      await connection.query(
        "select to_regprocedure('public.breakroom_access_probe(uuid,text)') exists",
      )
    ).rows[0].exists
  )
    await connection.query(
      `alter function public.breakroom_access_probe(uuid,text) owner to ${targetRole}`,
    );
  const controlUrl = new URL(bootstrap);
  controlUrl.pathname = "/breakroom_control";
  const control = new pg.Client(controlUrl.toString());
  await control.connect();
  try {
    await control.query(
      `grant usage,create on schema public,auth to ${controlRole}`,
    );
    for (const { tablename: t } of (
      await control.query(
        "select tablename from pg_tables where schemaname='public'",
      )
    ).rows)
      await control.query(`alter table public."${t}" owner to ${controlRole}`);
    await control.query(`alter function auth.uid() owner to ${controlRole}`);
  } finally {
    await control.end();
  }
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_supa1",
      "psql",
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `grant usage on schema auth to ${targetRole};grant execute on function auth.uid() to ${targetRole};`,
    ],
    {
      stdio: "pipe",
      env: {
        ...process.env,
        DOCKER_HOST:
          process.env.DOCKER_HOST ||
          (existsSync(homedir() + "/.colima/breakroom/docker.sock")
            ? "unix://" + homedir() + "/.colima/breakroom/docker.sock"
            : undefined),
      },
    },
  );
  const c = new URL(controlUrl);
  c.username = controlRole;
  c.password = controlPass;
  const t = new URL(bootstrap);
  t.username = targetRole;
  t.password = targetPass;
  let env = await readFile(".env", "utf8");
  env = env
    .replace(/^DATABASE_URL=.*$/m, "DATABASE_URL=" + c)
    .replace(/^TARGET_DATABASE_URL=.*$/m, "TARGET_DATABASE_URL=" + t);
  await writeFile(".env", env, { mode: 0o600 });
  console.log(
    "Control and target now have separate non-superuser, non-bypass-RLS credentials. Secrets saved only in ignored .env.",
  );
} finally {
  await connection.end();
}
