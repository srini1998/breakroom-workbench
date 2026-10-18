import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
function canonical(v: any): any {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .filter((k) => v[k] !== undefined)
        .map((k) => [k, canonical(v[k])]),
    );
  return v;
}
export const hash = (v: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(v)))
    .digest("hex");
export const modules = [
  "AccessProof",
  "EventMedic",
  "ErasureCheck",
  "ImportRescue",
  "EconomyBreaker",
] as const;
export const Module = z.enum(modules);
export const Action = z.discriminatedUnion("tool", [
  z.strictObject({ tool: z.literal("inspect_contract") }),
  z.strictObject({
    tool: z.literal("probe_access"),
    identity: z.enum(["owner", "member", "contractor"]),
    operation: z.enum([
      "read_foreign",
      "update",
      "reassign",
      "attachment",
      "unassigned",
      "read_own",
      "write_own",
      "profile_escalation",
    ]),
  }),
  z.strictObject({ tool: z.literal("recover_events") }),
  z.strictObject({ tool: z.literal("inspect_events") }),
  z.strictObject({
    tool: z.literal("deliver_event"),
    event_id: z.number().int().min(1).max(4),
    attempt: z.number().int().min(1).max(2),
  }),
  z.strictObject({ tool: z.literal("verify_inventory") }),
  z.strictObject({ tool: z.literal("verify_erasure") }),
  z.strictObject({ tool: z.literal("inspect_erasure_scope") }),
  z.strictObject({ tool: z.literal("dry_run_import") }),
  z.strictObject({ tool: z.literal("inspect_import") }),
  z.strictObject({ tool: z.literal("propose_mapping") }),
  z.strictObject({ tool: z.literal("verify_economy") }),
  z.strictObject({ tool: z.literal("inspect_economy") }),
  z.strictObject({
    tool: z.literal("coordinate_game_actions"),
    kind: z.enum(["withdrawal", "craft", "transfer"]),
  }),
]);
export type AgentAction = z.infer<typeof Action>;
export const EvidenceRef = z.object({
  id: z.string().uuid(),
  hash: z.string(),
  kind: z.string(),
});
export const ToolResult = z.object({
  action_id: z.string().uuid(),
  status: z.enum(["ok", "error", "unsupported"]),
  observed_at: z.string(),
  evidence_refs: z.array(EvidenceRef),
  structured_observations: z.record(z.string(), z.unknown()),
  error_category: z.enum(["infrastructure", "validation", "domain"]).nullable(),
});
export const Verdict = z.object({
  result: z.enum([
    "pass",
    "fail",
    "inconclusive",
    "unsupported",
    "not_evaluated",
  ]),
  scope: z.string(),
  reasons: z.array(z.string()),
  evidence_refs: z.array(EvidenceRef),
  limitations: z.array(z.string()),
});
export const ImportMapping = z
  .object({
    version: z.literal(1),
    sku: z.string().min(1).max(64),
    quantity: z.string().min(1).max(64),
    unit: z.string().min(1).max(32),
    unit_column: z.string().max(64).nullable(),
    receipt: z.string().min(1).max(64),
    pack_version: z.number().int().positive().max(1000),
  })
  .strict();
export const ImportSource = z
  .object({ csv: z.string().min(1).max(65536), mapping: ImportMapping })
  .strict();
export const ExperimentSpec = z.object({
  version: z.literal(1),
  project_id: z.string().uuid(),
  contract_hash: z.string(),
  fixture_version: z.string(),
  seed: z.number().int(),
  supported_parameters: z.object({
    module: Module,
    scenario: z.string(),
    mode: z.enum(["baseline", "live", "replay"]),
    parent_id: z.string().uuid().optional(),
    import_source: ImportSource.optional(),
  }),
  limits: z.object({
    steps: z.number().int().min(1).max(30),
    milliseconds: z.number().int().min(100).max(120000),
    tokens: z.number().int().max(16000),
    estimated_spend: z.number().nonnegative().max(1),
  }),
});
export const Finding = z.object({
  invariant_id: z.string(),
  expected: z.unknown(),
  observed: z.unknown(),
  evidence_refs: z.array(EvidenceRef).min(1),
  severity: z.enum(["high", "medium", "low"]),
  provenance: z.enum(["seeded", "reproduced", "observed"]),
  reproduction_ref: z.string(),
});
export const contracts = {
  AccessProof: {
    purpose: "Verify the declared tenant and role permission matrix.",
    invariants: [
      "Tenants cannot read each other’s projects.",
      "Members may read but cannot update documents.",
      "Only an owner may transfer ownership.",
      "Attachment metadata follows tenant ownership.",
      "Contractors read assigned projects only.",
      "Editable profile fields never grant membership.",
    ],
    resources: [
      "projects",
      "project_memberships",
      "documents",
      "attachment_records (metadata only)",
    ],
    scenarios: [
      "clean",
      "candidate-1",
      "candidate-2",
      "candidate-3",
      "candidate-4",
      "candidate-5",
    ],
  },
  EventMedic: {
    purpose: "Recover rental events without duplicating business operations.",
    invariants: [
      "Checkout and return have unique operation IDs.",
      "A return waits for its checkout.",
      "Stock plus outstanding rentals equals initial stock.",
      "Original events and recovery history remain append-only.",
    ],
    resources: ["equipment", "incoming ledger", "operation receipts"],
    scenarios: ["ordered", "duplicate", "reordered", "interrupted"],
  },
  ErasureCheck: {
    purpose:
      "Verify scoped deletion and delayed export fencing using real Storage.",
    invariants: [
      "Owned profile, blob, export, and pending work are erased.",
      "A tombstone epoch fences delayed exports.",
      "Another tenant’s control object survives.",
      "Shared resources survive with ownership links detached.",
    ],
    resources: ["profile", "Storage blob", "derived export", "pending export"],
    scenarios: ["clean", "incomplete", "delayed"],
  },
  ImportRescue: {
    purpose:
      "Validate supplier mappings, then commit exactly once after approval.",
    invariants: [
      "Missing pack definitions cause abstention.",
      "Invalid batches are rejected atomically.",
      "Approval binds file hash, mapping hash, and version.",
      "A repeated file cannot double stock.",
    ],
    resources: [
      "three CSV formats",
      "catalog",
      "versioned packs",
      "purchase/receipt evidence",
    ],
    scenarios: [
      "supplier-a",
      "supplier-b",
      "supplier-c",
      "missing-pack",
      "invalid-row",
      "conflict",
      "stale-approval",
    ],
  },
  EconomyBreaker: {
    purpose: "Reproduce concurrent inventory defects with a request barrier.",
    invariants: [
      "Chest withdrawal conserves items.",
      "Retried crafting consumes and produces once per operation.",
      "Transfers commit both debit and credit atomically.",
      "Legitimate crafting consumes two ore and produces one ingot.",
    ],
    resources: ["two players", "shared chest", "recipe ledger"],
    scenarios: ["clean", "withdrawal", "craft", "transfer"],
  },
} as const;
export function baseline(module: string): AgentAction[] {
  if (module === "AccessProof")
    return [
      { tool: "inspect_contract" },
      ...(
        [
          "read_own",
          "write_own",
          "profile_escalation",
          "read_foreign",
          "update",
          "reassign",
          "attachment",
          "unassigned",
        ] as const
      ).map((operation) => ({
        tool: "probe_access" as const,
        identity:
          operation === "reassign"
            ? ("member" as const)
            : operation === "unassigned"
              ? ("contractor" as const)
              : operation === "read_own" || operation === "write_own"
                ? ("owner" as const)
                : ("member" as const),
        operation,
      })),
    ];
  if (module === "EventMedic")
    return [
      { tool: "inspect_contract" },
      { tool: "inspect_events" },
      ...([1, 2, 3, 4] as const).map((event_id) => ({
        tool: "deliver_event" as const,
        event_id,
        attempt: 1,
      })),
      ...([1, 2] as const).map((event_id) => ({
        tool: "deliver_event" as const,
        event_id,
        attempt: 2,
      })),
      { tool: "verify_inventory" },
    ];
  if (module === "ErasureCheck")
    return [
      { tool: "inspect_contract" },
      { tool: "inspect_erasure_scope" },
      { tool: "verify_erasure" },
    ];
  if (module === "ImportRescue")
    return [
      { tool: "inspect_contract" },
      { tool: "inspect_import" },
      { tool: "propose_mapping" },
      { tool: "dry_run_import" },
    ];
  if (module === "EconomyBreaker")
    return [
      { tool: "inspect_contract" },
      { tool: "inspect_economy" },
      ...(["withdrawal", "craft", "transfer"] as const).map((kind) => ({
        tool: "coordinate_game_actions" as const,
        kind,
      })),
      { tool: "verify_economy" },
    ];
  const t = {
    EventMedic: "recover_events",
    ErasureCheck: "verify_erasure",
    ImportRescue: "dry_run_import",
    EconomyBreaker: "verify_economy",
  } as const;
  return [
    { tool: "inspect_contract" },
    { tool: t[module as keyof typeof t] } as AgentAction,
  ];
}
export const uuid = randomUUID;
