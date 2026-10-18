import { control, target } from "../server/db.ts";
try {
  await Promise.all([control.query("select 1"), target.query("select 1")]);
  console.log("Control and target PostgreSQL are ready.");
  const r = await fetch("http://127.0.0.1:4310/api/health", {
    signal: AbortSignal.timeout(3000),
  }).catch(() => null);
  console.log(
    r ? JSON.stringify(await r.json()) : "Web server not started; npm run dev",
  );
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await control.end();
  await target.end();
}
