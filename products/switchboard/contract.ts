import { z } from "zod";
import { hash } from "../../server/contracts.ts";
export const contract = {
  version: 1,
  fixture: "two-tenant-orders-v1",
  operations: ["INSERT", "UPDATE"],
  tenants: ["Northstar", "Control"],
  recipients:
    "Owner and viewer receive only their own tenant rows. Only owners write.",
  unsupported: [
    "DELETE",
    "tenant reassignment",
    "row exceptions",
    "membership revocation",
    "reconnect/replay semantics",
    "arbitrary projects",
  ],
  timing:
    "One process monotonic clock: write-start-to-receipt (not pure server latency); write completion measured separately.",
  quantile:
    "Nearest rank: sorted[ceil(p*n)-1]; observed authorized first receipts only. Misses stay in coverage denominator. p99 unstable below 100 samples.",
};
export const Config = z
  .object({
    version: z.literal(1).default(1),
    project_id: z.string().uuid(),
    parent_id: z.string().uuid().optional(),
    contract_hash: z.literal(hash(contract)).default(hash(contract)),
    fixture_version: z.literal("Switchboard-v1").default("Switchboard-v1"),
    limits: z
      .object({
        seconds: z.literal(720),
        max_experiments: z.literal(26),
        max_model_calls: z.literal(3),
        max_model_tokens: z.literal(8000),
      })
      .strict()
      .default({
        seconds: 720,
        max_experiments: 26,
        max_model_calls: 3,
        max_model_tokens: 8000,
      }),
    seed: z.number().int().min(1).max(1000000).default(42),
    mode: z.enum(["baseline", "live"]).default("baseline"),
    levels: z
      .array(
        z
          .number()
          .int()
          .refine((n) => [1, 5, 20, 50].includes(n)),
      )
      .min(1)
      .max(3)
      .refine((a) => new Set(a).size === a.length)
      .default([5, 20, 50]),
    repetitions: z.number().int().min(3).max(4).default(3),
    operations: z.number().int().min(4).max(40).default(10),
    rate: z.number().min(1).max(30).default(10),
    payload_source: z.enum(["synthetic", "earthquakes"]).default("synthetic"),
    dataset_snapshot: z
      .object({
        content_hash: z.string().length(64),
        source_manifest_json: z.string().max(65536).optional(),
        name: z.string(),
        url: z.string().url(),
        retrieved_at: z.string(),
        rows: z
          .array(
            z.object({
              id: z.string().max(120),
              name: z.string().max(250).nullable(),
              magnitude: z.number().nullable(),
              date: z.string(),
              url: z.string().url(),
            }),
          )
          .min(1)
          .max(20),
      })
      .optional(),
    payload_bytes: z.number().int().min(16).max(4096).default(128),
    warmup_ms: z.number().int().min(100).max(3000).default(250),
    observation_ms: z.number().int().min(500).max(5000).default(1500),
    latency_objective_ms: z.number().min(1).max(10000).default(1000),
    coverage_objective: z.number().min(0.9).max(1).default(1),
    variant: z
      .enum(["scoped", "broad", "dropped", "starved"])
      .default("scoped"),
    workload: z
      .literal("tenant-orders-insert-update")
      .default("tenant-orders-insert-update"),
  })
  .strict();
export type SwitchConfig = z.infer<typeof Config>;
export type Operation = {
  source_record?: Record<string, unknown>;
  payload_bytes?: number;
  event_id: string;
  seq: number;
  tenant: number;
  version: number;
  operation: string;
  start_ms: number;
  write_ms: number | null;
  write_error: string | null;
  expected: string[];
};
export type Receipt = {
  event_id: string | null;
  client_id: string;
  tenant: number;
  at_ms: number;
  row_tenant: number | null;
};
export function expected(
  tenant: number,
  observer: { tenant: number; role: string },
) {
  return (
    tenant === observer.tenant && ["owner", "viewer"].includes(observer.role)
  );
}
export function quantile(values: number[], p: number) {
  return values.length
    ? [...values].sort((a, b) => a - b)[
        Math.max(0, Math.ceil(values.length * p) - 1)
      ]
    : null;
}
export function evaluate(
  ops: Operation[],
  receipts: Receipt[],
  window: number,
  objective: number,
) {
  let on_time = 0,
    late = 0,
    missing = 0,
    after_deadline = 0,
    duplicate = 0,
    unauthorized = 0,
    uncorrelated = 0;
  const samples: number[] = [],
    classifications: any[] = [];
  const map = new Map(ops.map((o) => [o.event_id, o]));
  for (const r of receipts) {
    const o = r.event_id && map.get(r.event_id);
    if (!o) uncorrelated++;
    else if (!o.expected.includes(r.client_id) || r.row_tenant !== o.tenant)
      unauthorized++;
  }
  for (const o of ops)
    for (const client of o.expected) {
      const seen = receipts
        .filter(
          (r) =>
            r.event_id === o.event_id &&
            r.client_id === client &&
            r.row_tenant === o.tenant,
        )
        .sort((a, b) => a.at_ms - b.at_ms);
      duplicate += Math.max(0, seen.length - 1);
      const delay = seen.length ? seen[0].at_ms - o.start_ms : null;
      const state =
        delay === null || delay > window
          ? "not_observed_before_deadline"
          : delay > objective
            ? "late"
            : "authorized_on_time";
      if (state === "not_observed_before_deadline") {
        missing++;
        if (delay !== null) after_deadline++;
      } else {
        samples.push(delay!);
        if (state === "late") late++;
        else on_time++;
      }
      classifications.push({
        event_id: o.event_id,
        client_id: client,
        state,
        latency_ms: delay,
      });
    }
  const denominator = ops.reduce((n, o) => n + o.expected.length, 0);
  return {
    denominator,
    on_time,
    late,
    missing,
    after_deadline,
    duplicate,
    unauthorized,
    uncorrelated,
    coverage: denominator ? (on_time + late) / denominator : 0,
    on_time_coverage: denominator ? on_time / denominator : 0,
    p50: quantile(samples, 0.5),
    p95: quantile(samples, 0.95),
    p99: quantile(samples, 0.99),
    p99_unstable: samples.length < 100,
    samples,
    classifications,
  };
}

export const ToolResult = z
  .object({
    action_id: z.string().uuid(),
    status: z.enum(["running", "completed", "error"]),
    observed_at: z.string().datetime(),
    evidence_refs: z.array(z.string().uuid()),
    structured_observations: z.record(z.string(), z.unknown()),
    error_category: z
      .enum(["infrastructure", "invalid_action", "cancelled"])
      .nullable(),
  })
  .strict();
export const Verdict = z
  .object({
    result: z.enum([
      "pass",
      "fail",
      "inconclusive",
      "unsupported",
      "not_evaluated",
    ]),
    scope: z.string(),
    reasons: z.array(z.string()),
    evidence_refs: z.array(z.string().uuid()),
    limitations: z.array(z.string()),
  })
  .passthrough();
export function parseChoice(raw: unknown, size: number) {
  return z
    .object({
      index: z
        .number()
        .int()
        .min(0)
        .max(size - 1),
      summary: z.string().max(500),
    })
    .strict()
    .parse(raw);
}
