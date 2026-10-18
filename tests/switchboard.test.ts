import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Config,
  evaluate,
  expected,
  quantile,
  parseChoice,
} from "../products/switchboard/contract.ts";
import { matrix, verdict } from "../products/switchboard/service.ts";
const project_id = "00000000-0000-4000-8000-000000000001";
test("Realtime recipient oracle does not depend on transport", () => {
  assert(expected(1, { tenant: 1, role: "viewer" }));
  assert(!expected(1, { tenant: 2, role: "owner" }));
  assert(!expected(1, { tenant: 1, role: "anonymous" }));
});
test("Realtime receipt accounting keeps missing, late, duplicate and unauthorized evidence", () => {
  const op = {
    event_id: "one",
    seq: 0,
    tenant: 1,
    version: 1,
    operation: "INSERT",
    start_ms: 0,
    write_ms: 3,
    write_error: null,
    expected: ["a", "b", "c"],
  };
  const r = evaluate(
    [op],
    [
      { event_id: "one", client_id: "a", tenant: 1, row_tenant: 1, at_ms: 10 },
      { event_id: "one", client_id: "a", tenant: 1, row_tenant: 1, at_ms: 12 },
      { event_id: "one", client_id: "b", tenant: 1, row_tenant: 1, at_ms: 80 },
      {
        event_id: "one",
        client_id: "foreign",
        tenant: 2,
        row_tenant: 1,
        at_ms: 1,
      },
      {
        event_id: "unknown",
        client_id: "x",
        tenant: 1,
        row_tenant: 1,
        at_ms: 1,
      },
    ],
    100,
    50,
  );
  assert.equal(r.denominator, 3);
  assert.equal(r.missing, 1);
  assert.equal(r.late, 1);
  assert.equal(r.duplicate, 1);
  assert.equal(r.unauthorized, 1);
  assert.equal(r.uncorrelated, 1);
  assert.equal(r.p95, 80);
  assert.equal(r.coverage, 2 / 3);
});
test("Realtime unsafe candidate fails even if faster and coordinator compromised", () => {
  const cfg = Config.parse({ project_id, levels: [5] });
  const result = verdict(
    [
      {
        config: {
          transport: "broadcast",
          smoke: false,
          level: 5,
          repetition: 0,
        },
        status: "completed",
        summary: {
          metrics: { unauthorized: 1, on_time_coverage: 1, p95: 1 },
          quality: { compromised: true },
          negative: [],
        },
      },
    ],
    cfg,
  );
  assert.equal(result.result, "fail");
});
test("Realtime supported tuple rejects arbitrary workload, mutation hints, invalid load", () => {
  for (const x of [
    { workload: "DELETE" },
    { sql: "drop table orders" },
    { levels: [51] },
    { repetitions: 1 },
    { payload_bytes: 9000 },
  ])
    assert(!Config.safeParse({ project_id, ...x }).success);
});
test("Realtime fixed matrix alternates paired order and requires at least three pairs", () => {
  const cfg = Config.parse({ project_id });
  const m = matrix(cfg);
  assert.equal(m.length, 20);
  assert.deepEqual(
    m.slice(2, 6).map((x) => x.transport),
    ["changes", "broadcast", "broadcast", "changes"],
  );
  assert.equal(quantile([1, 2, 3, 4], 0.95), 4);
  assert.equal(verdict([], cfg).result, "inconclusive");
});

test("Realtime invalid model choices cannot schedule an arbitrary action", () => {
  assert.throws(() => parseChoice({ index: 5, summary: "outside budget" }, 2));
  assert.throws(() =>
    parseChoice({ index: 0, summary: "unsafe extra", sql: "drop table" }, 2),
  );
  assert.throws(() => parseChoice({ tool: "shell", args: "anything" }, 2));
});

test("Realtime target adapter rejects remote URLs before any connection", async () => {
  const { client } = await import("../products/switchboard/runner.ts");
  const original = process.env.SUPABASE_URL;
  try {
    process.env.SUPABASE_URL = "https://example.org";
    assert.throws(() => client(), /must be local/);
  } finally {
    if (original === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = original;
  }
});
