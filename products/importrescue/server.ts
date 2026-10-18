import { target, tx, schema, control } from "../../server/db.ts";
import { ImportMapping } from "../../server/contracts.ts";
import { parse } from "csv-parse/sync";
import type { PoolClient } from "pg";
import { hash } from "../../server/contracts.ts";
export const files: Record<string, string> = {
  "supplier-a": "sku,units,receipt\nBOLT,12,R-1\nNUT,6,R-2",
  "supplier-b": "part,boxes,receipt\nBOLT,2,R-1\nNUT,1,R-2",
  "supplier-c": "item,qty,unit,receipt\nBOLT,2,box,R-1\nNUT,6,each,R-2",
  "missing-pack": "item,qty,unit,receipt\nBOLT,2,pallet,R-1",
  "invalid-row": "sku,units,receipt\nBOLT,12,R-1\nNUT,-1,R-2",
  conflict: "sku,units,receipt\nBOLT,12,R-1\nBOLT,13,R-1",
  "stale-approval": "sku,units,receipt\nBOLT,12,R-1\nNUT,6,R-2",
};
export function mappingFor(scenario: string) {
  return {
    version: 1,
    sku:
      scenario === "supplier-b"
        ? "part"
        : scenario === "supplier-c" || scenario === "missing-pack"
          ? "item"
          : "sku",
    quantity:
      scenario === "supplier-b"
        ? "boxes"
        : scenario === "supplier-c" || scenario === "missing-pack"
          ? "qty"
          : "units",
    unit: scenario === "supplier-b" ? "box" : "each",
    unit_column:
      scenario === "supplier-c" || scenario === "missing-pack" ? "unit" : null,
    receipt: "receipt",
    pack_version: 1,
  };
}
export type Mapping = ReturnType<typeof mappingFor>;
export async function prepareImport(run: string) {
  const s = schema(run);
  await target.query(`create schema if not exists ${s};create table if not exists ${s}.catalog(sku text primary key,stock int not null default 0);insert into ${s}.catalog values('BOLT',0),('NUT',0) on conflict do nothing;
 create table if not exists ${s}.packs(sku text,unit text,version int,multiplier int not null,primary key(sku,unit,version));insert into ${s}.packs values('BOLT','each',1,1),('BOLT','box',1,6),('NUT','each',1,1),('NUT','box',1,6) on conflict do nothing;
 create table if not exists ${s}.purchases(receipt text primary key,sku text,units int);insert into ${s}.purchases values('R-1','BOLT',12),('R-2','NUT',6) on conflict do nothing;
 create table if not exists ${s}.batches(file_hash text primary key,mapping_hash text not null,rows jsonb not null,committed_at timestamptz default now());`);
}
export async function dryImport(
  run: string,
  scenario: string,
  source?: { csv: string; mapping: Mapping },
) {
  await prepareImport(run);
  const file = source?.csv || files[scenario];
  if (!file) throw Error("Unsupported supplier fixture");
  return validateImport(run, file, source?.mapping || mappingFor(scenario));
}
export async function validateImport(
  run: string,
  file: string,
  mapping: Mapping,
  connection: Pick<PoolClient, "query"> = target,
) {
  const s = schema(run);
  ImportMapping.parse(mapping);
  const parseErrors: string[] = [];
  let rows: Record<string, string>[] = [];
  try {
    if (Buffer.byteLength(file, "utf8") > 65536)
      throw Error("CSV exceeds 64 KiB");
    rows = parse(file, {
      columns: (headers: string[]) => {
        if (
          new Set(headers).size !== headers.length ||
          headers.some((h) =>
            ["__proto__", "constructor", "prototype"].includes(h),
          )
        )
          throw Error("Duplicate or unsafe header");
        return headers;
      },
      skip_empty_lines: true,
      bom: true,
      trim: true,
      max_record_size: 4096,
    });
    if (!rows.length || rows.length > 1000)
      throw Error("Expected 1 to 1000 rows");
  } catch (e) {
    parseErrors.push("Invalid CSV: " + (e as Error).message);
  }
  const staged: { sku: string; units: number; receipt: string }[] = [];
  const errors: string[] = [...parseErrors];
  let abstain = false;
  const seen = new Map<string, string>();
  for (const [i, row] of rows.entries()) {
    const sku = row[mapping.sku],
      qty = Number(row[mapping.quantity]),
      unit = mapping.unit_column ? row[mapping.unit_column] : mapping.unit,
      receipt = row[mapping.receipt];
    if (!sku || !receipt || !Number.isSafeInteger(qty) || qty <= 0) {
      errors.push(`Row ${i + 1}: invalid required fields`);
      continue;
    }
    const pack = (
      await connection.query(
        `select multiplier from ${s}.packs where sku=$1 and unit=$2 and version=$3`,
        [sku, unit, mapping.pack_version],
      )
    ).rows[0];
    if (!pack) {
      errors.push(`Row ${i + 1}: no declared ${unit} conversion for ${sku}`);
      abstain = true;
      continue;
    }
    const units = qty * pack.multiplier;
    const purchase = (
      await connection.query(`select * from ${s}.purchases where receipt=$1`, [
        receipt,
      ])
    ).rows[0];
    if (
      !Number.isSafeInteger(units) ||
      !purchase ||
      purchase.sku !== sku ||
      purchase.units !== units
    ) {
      errors.push(`Row ${i + 1}: inconsistent purchase/receipt evidence`);
      continue;
    }
    const r = { sku, units, receipt };
    if (seen.has(receipt) && seen.get(receipt) !== hash(r))
      errors.push(`Row ${i + 1}: conflicting duplicate receipt`);
    if (!seen.has(receipt)) staged.push(r);
    seen.set(receipt, hash(r));
  }
  const plan = {
    file_hash: hash(file),
    mapping_hash: hash(mapping),
    mapping,
    file,
    staged,
    errors,
    abstain,
    pack_version: mapping.pack_version,
  };
  return {
    ...plan,
    action_hash: hash(plan),
    expected: "All rows supported, consistent, and atomic",
    passed: errors.length === 0,
    ready: errors.length === 0,
  };
}
export async function commitImport(
  run: string,
  approval: string,
  user: string,
) {
  // Lock the approval for its full target transaction; target file hash is also a unique idempotency key.
  return tx(control, async (c) => {
    const a = (
      await c.query(
        "select a.* from approvals a join memberships m on m.workspace_id=a.workspace_id where a.id=$1 and a.run_id=$2 and m.user_id=$3 for update of a",
        [approval, run, user],
      )
    ).rows[0];
    if (!a || !a.approved_at || new Date(a.expires_at).getTime() < Date.now())
      throw Error("Approval missing or expired");
    const p = a.plan;
    if (hash(p) !== a.action_hash)
      throw Error("Stale approval: plan hash mismatch");
    const s = schema(run);
    const result = await tx(target, async (t) => {
      await t.query(`lock table ${s}.packs,${s}.purchases in share mode`);
      const current = await validateImport(run, p.file, p.mapping, t);
      if (hash(current) !== a.action_hash)
        throw Error("Stale approval: facts or mapping changed");
      if (!current.ready) throw Error("Invalid batch");
      const inserted = await t.query(
        `insert into ${s}.batches(file_hash,mapping_hash,rows) values($1,$2,$3) on conflict do nothing returning file_hash`,
        [p.file_hash, p.mapping_hash, JSON.stringify(p.staged)],
      );
      if (inserted.rowCount)
        for (const r of p.staged)
          await t.query(`update ${s}.catalog set stock=stock+$1 where sku=$2`, [
            r.units,
            r.sku,
          ]);
      return {
        committed: Boolean(inserted.rowCount),
        idempotent_replay: !inserted.rowCount,
        stock: (await t.query(`select * from ${s}.catalog order by sku`)).rows,
      };
    });
    await c.query(
      "update approvals set consumed_at=coalesce(consumed_at,now()) where id=$1",
      [approval],
    );
    return result;
  });
}

export async function inspectImport(
  run: string,
  scenario: string,
  source?: { csv: string; mapping: Mapping },
) {
  await prepareImport(run);
  const s = schema(run),
    file = source?.csv || files[scenario],
    mapping = source?.mapping || mappingFor(scenario);
  return {
    data_source: source ? "operator_uploaded" : "authored_synthetic_fixture",
    sample: file.split(/\r?\n/).slice(0, 11).join("\n"),
    file_hash: hash(file),
    declared_mapping: mapping,
    catalog: (await target.query(`select * from ${s}.catalog order by sku`))
      .rows,
    pack_definitions: (
      await target.query(`select * from ${s}.packs order by sku,unit`)
    ).rows,
    purchase_receipts: (
      await target.query(`select * from ${s}.purchases order by receipt`)
    ).rows,
    scope:
      "Bounded sample and declared sandbox facts; no conversion may be invented",
  };
}
