import { Router } from "express";
import { z } from "zod";
import { control, tx } from "./db.ts";
import { uuid, hash } from "./contracts.ts";
import { dataset } from "./public-data.ts";
import {
  erasurePlan,
  erase,
  attachPublicReceipt,
} from "../products/erasurecheck/server.ts";
import { parse } from "csv-parse/sync";
export const applications = Router();
const Slug = z.enum([
  "accessproof",
  "eventmedic",
  "erasurecheck",
  "importrescue",
  "economybreaker",
]);
const sources = {
  accessproof: "issues",
  eventmedic: "stations",
  erasurecheck: "retail",
  importrescue: "retail",
  economybreaker: "recipes",
};
export function initialize(slug: string, source: any): any {
  if (slug === "accessproof")
    return {
      documents: source.rows.map((r: any, i: number) => ({
        ...r,
        tenant: (i % 2) + 1,
        assigned: i === 0,
        status: "Open",
      })),
      last_check: null,
    };
  if (slug === "economybreaker")
    return {
      recipes: source.rows,
      recipe: source.rows[0],
      ingots: 9,
      blocks: 0,
      teammate_blocks: 0,
      initial_value: 9,
      receipts: {},
      last_receipt: null,
      last_result: null,
    };
  if (slug === "importrescue")
    return {
      catalog: Object.fromEntries(source.rows.map((r: any) => [r.sku, r.name])),
      catalog_hash: source.content_hash,
      ledger: [],
      approval: null,
      commits: {},
      last_result: null,
    };
  if (slug === "erasurecheck")
    return {
      account: { name: "Fictional shopper", email: "shopper@breakroom.test" },
      receipt_rows: source.rows.slice(0, 3),
      status: "active",
      cleanup_plan: null,
      approval: null,
      result: null,
    };
  if (slug === "eventmedic")
    return {
      stations: source.rows.map((r: any) => ({
        ...r,
        initial: r.bikes,
        available: r.bikes,
        outstanding: 0,
      })),
      receipts: {},
      selected: source.rows[0].id,
      last_checkout: null,
      last_result: null,
    };
  throw Error("Workflow not available yet");
}
export async function operation(
  slug: string,
  state: any,
  action: any,
  caseId: string,
): Promise<{ state: any; message: string; observation: any }> {
  const next = structuredClone(state);
  if (slug === "accessproof") {
    const a = z
      .object({
        type: z.enum(["access_check", "access_update"]),
        persona: z.enum(["owner", "member", "contractor"]),
        document_id: z.string().max(80),
      })
      .strict()
      .parse(action);
    const doc = next.documents.find((d: any) => d.id === a.document_id);
    if (!doc) throw Error("Document not found");
    const allowed =
      doc.tenant === 1 &&
      (a.type === "access_update"
        ? a.persona === "owner"
        : a.persona !== "contractor" || doc.assigned);
    if (allowed && a.type === "access_update") doc.status = "Reviewed locally";
    next.last_check = {
      persona: a.persona,
      action: a.type,
      allowed,
      document_id: a.document_id,
      rule:
        doc.tenant !== 1
          ? "A different team owns this record"
          : a.type === "access_update"
            ? "Only the owner may update"
            : a.persona === "contractor"
              ? "Contractors see assigned records only"
              : "Team owners and members may read",
    };
    return {
      state: next,
      message: allowed
        ? a.type === "access_update"
          ? "Local issue copy marked reviewed. GitHub was not changed."
          : "This colleague can open this record."
        : "This request was blocked.",
      observation: next.last_check,
    };
  }
  if (slug === "eventmedic") {
    const a = z
      .object({
        type: z.enum(["select_station", "checkout", "return"]),
        station_id: z.string().max(120),
        operation_id: z.string().uuid().optional(),
        checkout_id: z.string().uuid().optional(),
      })
      .strict()
      .parse(action);
    const station = next.stations.find((s: any) => s.id === a.station_id);
    if (!station) throw Error("Unknown station");
    next.selected = station.id;
    let message = "Station selected";
    if (a.type !== "select_station") {
      if (!a.operation_id) throw Error("Operation receipt required");
      const fingerprint = hash({
          type: a.type,
          station: a.station_id,
          checkout: a.checkout_id || null,
        }),
        existing = next.receipts[a.operation_id];
      if (existing) {
        if (existing.hash !== fingerprint)
          throw Error("Operation ID reused for a different action");
        message =
          "Repeated delivery recognized. No additional inventory change.";
      } else if (a.type === "checkout") {
        if (station.available < 1) throw Error("No local bikes available");
        station.available--;
        station.outstanding++;
        next.receipts[a.operation_id] = {
          hash: fingerprint,
          type: "checkout",
          station_id: station.id,
          returned: false,
        };
        next.last_checkout = a.operation_id;
        message = "Local checkout saved. One bike is out.";
      } else {
        const checkout = next.receipts[a.checkout_id || ""];
        if (
          !checkout ||
          checkout.type !== "checkout" ||
          checkout.station_id !== station.id
        )
          throw Error("Return needs its original checkout receipt");
        if (checkout.returned)
          throw Error("That checkout has already been returned");
        station.available++;
        station.outstanding--;
        checkout.returned = true;
        next.receipts[a.operation_id] = {
          hash: fingerprint,
          type: "return",
          station_id: station.id,
        };
        message = "Return saved. Exactly one bike is back.";
      }
    }
    const conserved = next.stations.every(
      (s: any) =>
        s.available >= 0 &&
        s.outstanding >= 0 &&
        s.available + s.outstanding === s.initial,
    );
    if (!conserved) throw Error("Inventory reconciliation failed");
    next.last_result = {
      message,
      conserved,
      available: station.available,
      outstanding: station.outstanding,
    };
    return { state: next, message, observation: next.last_result };
  }
  if (slug === "erasurecheck") {
    const a = z
      .object({
        type: z.enum(["review_erasure", "approve_erasure"]),
        action_hash: z.string().length(64).optional(),
      })
      .strict()
      .parse(action);
    if (next.status === "closed")
      throw Error("This example account is already closed");
    if (!next.cleanup_plan || next.cleanup_plan.run !== caseId)
      throw Error("Owned resources are not ready");
    if (a.type === "review_erasure") {
      const plan = {
        case_id: caseId,
        resources: next.cleanup_plan,
        receipt_hash: hash(next.receipt_rows),
      };
      next.approval = {
        plan,
        hash: hash(plan),
        expires_at: new Date(Date.now() + 900000).toISOString(),
      };
      return {
        state: next,
        message:
          "Deletion plan prepared. Review the owned and preserved resources before approval.",
        observation: { action_hash: next.approval.hash },
      };
    }
    if (
      !next.approval ||
      a.action_hash !== next.approval.hash ||
      hash(next.approval.plan) !== a.action_hash ||
      Date.now() > new Date(next.approval.expires_at).getTime()
    )
      throw Error("Review the current exact deletion plan again");
    const result = await erase(caseId, next.cleanup_plan);
    next.result = result;
    if (result.passed) {
      next.status = "closed";
      next.account = null;
      next.receipt_rows = [];
      next.approval = null;
    }
    return {
      state: next,
      message: result.passed
        ? "Owned records and files removed. Shared files survived and the delayed export was blocked."
        : "Cleanup needs investigation. Review the recorded checks.",
      observation: result,
    };
  }
  if (slug === "importrescue") {
    const a = z
      .discriminatedUnion("type", [
        z
          .object({
            type: z.literal("stage_import"),
            csv: z.string().min(1).max(65536),
            mapping: z
              .object({
                sku: z.string().min(1).max(64),
                quantity: z.string().min(1).max(64),
                receipt: z.string().min(1).max(64),
              })
              .strict(),
          })
          .strict(),
        z
          .object({
            type: z.literal("commit_import"),
            action_hash: z.string().length(64),
          })
          .strict(),
      ])
      .parse(action);
    if (a.type === "stage_import") {
      if (Buffer.byteLength(a.csv) > 65536) throw Error("CSV exceeds 64 KiB");
      const records = parse(a.csv, {
        bom: true,
        columns: (headers: string[]) => {
          if (
            new Set(headers).size !== headers.length ||
            headers.some(
              (h) =>
                !/^[A-Za-z_][A-Za-z0-9_ ]{0,63}$/.test(h) ||
                ["__proto__", "constructor", "prototype"].includes(h),
            )
          )
            throw Error("Duplicate or unsafe headers");
          for (const col of Object.values(a.mapping))
            if (!headers.includes(col)) throw Error("Mapped column is missing");
          return headers;
        },
        skip_empty_lines: true,
        max_record_size: 4096,
      }) as Record<string, string>[];
      if (!records.length || records.length > 1000)
        throw Error("Use between 1 and 1,000 rows");
      const seen = new Set<string>();
      const rows = records.map((r, i) => {
        const sku = r[a.mapping.sku]?.trim(),
          qty = r[a.mapping.quantity]?.trim(),
          receipt = r[a.mapping.receipt]?.trim();
        if (!sku || !Object.hasOwn(next.catalog, sku))
          throw Error("Unknown catalog SKU on line " + (i + 2));
        if (
          !qty ||
          !/^\d+$/.test(qty) ||
          Number(qty) < 1 ||
          Number(qty) > 10000
        )
          throw Error(
            "Quantity must be a positive whole number on line " + (i + 2),
          );
        if (!receipt || receipt.length > 80 || seen.has(receipt))
          throw Error("Missing or repeated source-row ID on line " + (i + 2));
        seen.add(receipt);
        return { sku, name: next.catalog[sku], quantity: Number(qty), receipt };
      });
      const plan = {
        case_id: caseId,
        rows,
        catalog_hash: next.catalog_hash,
        mapping: a.mapping,
      };
      next.approval = {
        plan,
        hash: hash(plan),
        expires_at: new Date(Date.now() + 900000).toISOString(),
      };
      return {
        state: next,
        message:
          "Whole file validated. Review the exact ledger rows before importing.",
        observation: {
          rows: rows.length,
          units: rows.reduce((n, r) => n + r.quantity, 0),
          action_hash: next.approval.hash,
        },
      };
    }
    if (next.commits[a.action_hash]) {
      next.last_result = { new_rows: 0, new_units: 0, replayed: true };
      return {
        state: next,
        message: "This approved batch was already imported. No records added.",
        observation: next.last_result,
      };
    }
    if (
      !next.approval ||
      a.action_hash !== next.approval.hash ||
      hash(next.approval.plan) !== a.action_hash ||
      Date.now() > new Date(next.approval.expires_at).getTime()
    )
      throw Error("Stage and review the current file again");
    const additions = [];
    for (const row of next.approval.plan.rows) {
      const old = next.ledger.find((r: any) => r.receipt === row.receipt);
      if (old && (old.sku !== row.sku || old.quantity !== row.quantity))
        throw Error("A source-row ID conflicts with an existing ledger entry");
      if (!old) additions.push(row);
    }
    next.ledger.push(...additions);
    next.commits[a.action_hash] = true;
    next.approval = null;
    next.last_result = {
      new_rows: additions.length,
      new_units: additions.reduce((n: number, r: any) => n + r.quantity, 0),
      replayed: false,
    };
    return {
      state: next,
      message: "Approved sales rows saved atomically to the local ledger.",
      observation: next.last_result,
    };
  }
  if (slug === "economybreaker") {
    const a = z
      .object({
        type: z.enum(["craft", "transfer"]),
        operation_id: z.string().uuid(),
      })
      .strict()
      .parse(action);
    const existing = next.receipts[a.operation_id];
    if (existing) {
      if (existing.type !== a.type)
        throw Error("Receipt reused for a different action");
      next.last_result = { ...existing, replayed: true };
      return {
        state: next,
        message: "Repeated request recognized. Inventory did not change.",
        observation: next.last_result,
      };
    }
    let accepted = false,
      message = "";
    if (a.type === "craft") {
      if (next.ingots >= next.recipe.input_units) {
        next.ingots -= next.recipe.input_units;
        next.blocks += next.recipe.output_units;
        accepted = true;
        message = "One block crafted. Ingredients were spent once.";
      } else message = "Craft blocked: not enough ingredients remain.";
    } else {
      if (next.blocks >= 1) {
        next.blocks--;
        next.teammate_blocks++;
        accepted = true;
        message = "One block transferred atomically to the example teammate.";
      } else message = "Transfer blocked: no block available.";
    }
    const value =
      next.ingots +
      (next.recipe.input_units * (next.blocks + next.teammate_blocks)) /
        next.recipe.output_units;
    if (
      value !== next.initial_value ||
      next.ingots < 0 ||
      next.blocks < 0 ||
      next.teammate_blocks < 0
    )
      throw Error("Inventory value does not reconcile");
    next.last_receipt = a.operation_id;
    next.receipts[a.operation_id] = {
      type: a.type,
      accepted,
      message,
      value,
      replayed: false,
    };
    next.last_result = next.receipts[a.operation_id];
    return { state: next, message, observation: next.last_result };
  }
  throw Error("Unsupported workflow action");
}
async function project(id: string, user: string) {
  const p = await tx(
    control,
    async (c) =>
      (
        await c.query("select * from projects where id=$1", [
          z.string().uuid().parse(id),
        ])
      ).rows[0],
    user,
  );
  if (!p) throw Object.assign(Error("Project not found"), { status: 404 });
  return p;
}
applications.get("/:slug", async (req, res) => {
  const slug = Slug.parse(req.params.slug),
    p = await project(String(req.query.project), res.locals.user);
  const cases = await tx(
    control,
    async (c) =>
      (
        await c.query(
          "select * from application_cases where project_id=$1 and slug=$2 order by created_at desc limit 8",
          [p.id, slug],
        )
      ).rows,
    res.locals.user,
  );
  res.json({ cases, dataset: await dataset(sources[slug]) });
});
applications.get("/:slug/:id", async (req, res) => {
  const slug = Slug.parse(req.params.slug),
    id = z.string().uuid().parse(req.params.id);
  const r = await tx(
    control,
    async (c) =>
      (
        await c.query(
          "select * from application_cases where id=$1 and slug=$2",
          [id, slug],
        )
      ).rows[0],
    res.locals.user,
  );
  if (!r) throw Object.assign(Error("Workspace not found"), { status: 404 });
  res.json(r);
});
applications.post("/:slug/start", async (req, res) => {
  const slug = Slug.parse(req.params.slug),
    p = await project(req.body.project_id, res.locals.user),
    source = await dataset(sources[slug]),
    id = uuid();
  const state = initialize(slug, source);
  if (slug === "erasurecheck") {
    state.cleanup_plan = await erasurePlan(id, "clean");
    await attachPublicReceipt(
      id,
      "source_row,sku,quantity\n" +
        state.receipt_rows
          .map((r: any) => [r.id, r.sku, r.quantity].join(","))
          .join("\n"),
    );
  }
  const r = (
    await control.query(
      "insert into application_cases(id,project_id,workspace_id,slug,source,state) values($1,$2,$3,$4,$5,$6) returning *",
      [id, p.id, p.workspace_id, slug, source, state],
    )
  ).rows[0];
  res.json(r);
});
applications.post("/:slug/:id/action", async (req, res) => {
  const slug = Slug.parse(req.params.slug),
    id = z.string().uuid().parse(req.params.id),
    user = res.locals.user;
  const result = await tx(control, async (c) => {
    const row = (
      await c.query(
        "select * from application_cases where id=$1 and slug=$2 and exists(select 1 from memberships where workspace_id=application_cases.workspace_id and user_id=$3) for update",
        [id, slug, user],
      )
    ).rows[0];
    if (!row)
      throw Object.assign(Error("Workspace not found"), { status: 404 });
    const result = await operation(slug, row.state, req.body, id);
    const event = {
      id: uuid(),
      at: new Date().toISOString(),
      action: req.body.type,
      message: result.message,
      observation: result.observation,
    };
    return (
      await c.query(
        "update application_cases set state=$2,events=events||$3::jsonb,updated_at=now() where id=$1 returning *",
        [id, result.state, JSON.stringify([event])],
      )
    ).rows[0];
  });
  res.json(result);
});
