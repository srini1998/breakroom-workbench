import "dotenv/config";
import pg from "pg";
export const control = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:55431/supa1_control",
  max: 8,
  statement_timeout: 10000,
});
export const target = new pg.Pool({
  connectionString:
    process.env.TARGET_DATABASE_URL ||
    "postgresql://localhost:55431/supa1_target",
  max: 10,
  statement_timeout: 10000,
});
for (const url of [process.env.DATABASE_URL, process.env.TARGET_DATABASE_URL])
  if (
    url &&
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)
  )
    throw new Error("Only local disposable databases are allowed");
export async function tx<T>(
  pool: pg.Pool,
  fn: (c: pg.PoolClient) => Promise<T>,
  identity?: string,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    if (identity) {
      await c.query("select set_config('request.jwt.claim.sub',$1,true)", [
        identity,
      ]);
      await c.query("set local role authenticated");
    }
    const v = await fn(c);
    await c.query("commit");
    return v;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
export const ids = {
  alice: "00000000-0000-4000-8000-000000000001",
  bob: "00000000-0000-4000-8000-000000000002",
  workspace: "00000000-0000-4000-8000-000000000011",
  other: "00000000-0000-4000-8000-000000000012",
};
export function schema(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw Error("Invalid run ID");
  return "r_" + id.replaceAll("-", "");
}

if (
  (process.env.DATABASE_URL || "postgresql://localhost:55431/supa1_control") ===
  (process.env.TARGET_DATABASE_URL ||
    "postgresql://localhost:55431/supa1_target")
)
  throw Error("Control and target databases must be separate");
