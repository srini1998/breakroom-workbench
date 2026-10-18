import { z } from "zod";
import { prepareAccess, probeAccess } from "../products/accessproof/server.ts";
import { target, schema } from "./db.ts";
import { uuid, hash, Action } from "./contracts.ts";
export const PermissionContract = z
  .object({
    version: z.literal(1),
    name: z.string().min(1).max(80),
    scope: z.literal("breakroom-two-tenant-fixture"),
    rules: z
      .array(
        z
          .object({
            role: z.enum(["owner", "member", "contractor"]),
            action: z.enum([
              "read_own",
              "read_foreign",
              "write_own",
              "unassigned",
              "attachment",
              "reassign",
            ]),
            allow: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(24),
  })
  .strict()
  .superRefine((c, ctx) => {
    const keys = c.rules.map((r) => r.role + ":" + r.action);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: "custom", message: "Duplicate permission rules" });
  });
export const starter = {
  version: 1 as const,
  name: "Team audience contract",
  scope: "breakroom-two-tenant-fixture" as const,
  rules: (["owner", "member", "contractor"] as const).flatMap((role) =>
    (
      [
        "read_own",
        "read_foreign",
        "write_own",
        "unassigned",
        "attachment",
        "reassign",
      ] as const
    ).map((action) => ({
      role,
      action,
      allow:
        action === "read_own" ||
        (action === "write_own" && role === "owner") ||
        (action === "reassign" && role === "owner") ||
        (action === "unassigned" && role !== "contractor"),
    })),
  ),
};
export async function measureContract(raw: unknown, variant: string) {
  const contract = PermissionContract.parse(raw),
    run = uuid();
  const fixture = z
    .enum([
      "clean",
      "candidate-1",
      "candidate-2",
      "candidate-3",
      "candidate-4",
      "candidate-5",
    ])
    .parse(variant);
  const observations = [];
  try {
    for (const rule of contract.rules) {
      const probeRun = uuid();
      try {
        await prepareAccess(probeRun, fixture);
        const action = Action.parse({
          tool: "probe_access",
          identity: rule.role,
          operation: rule.action,
        });
        if (action.tool !== "probe_access") throw Error("Invalid access probe");
        const result = await probeAccess(probeRun, action);
        observations.push({
          fixture_run_id: probeRun,
          role: rule.role,
          action: rule.action,
          expected: rule.allow,
          observed: result.actual,
          passed: rule.allow === result.actual,
          session_user_id: result.session_user_id,
          denial: result.denial,
          scope: result.scope,
        });
      } finally {
        await target.query(`drop schema if exists ${schema(probeRun)} cascade`);
      }
    }
    return {
      fixture_run_id: run,
      variant: fixture,
      contract_hash: hash(contract),
      observed_at: new Date().toISOString(),
      result: observations.every((r) => r.passed) ? "pass" : "fail",
      observations,
      violations: observations.filter((r) => !r.passed),
      scope: contract.scope,
      limitations: [
        "Only the versioned local two-tenant fixture is supported.",
        "Each probe has an isolated fixture; multi-action journeys are not covered.",
        "A permission contract is supplied by the developer; completeness is not inferred.",
        "Attachment probes cover metadata, not Storage object access.",
        "This does not connect to arbitrary customer projects or apply production migrations.",
      ],
    };
  } finally {
    await target.query(`drop schema if exists ${schema(run)} cascade`);
  }
}
export async function compareContract(raw: unknown, candidate: string) {
  const contract = PermissionContract.parse(raw),
    baseline = await measureContract(contract, "clean"),
    after = await measureContract(contract, candidate);
  const changes = after.observations.flatMap((r) => {
    const previous = baseline.observations.find(
      (x) => x.role === r.role && x.action === r.action,
    )!;
    return previous.observed !== r.observed
      ? [
          {
            role: r.role,
            action: r.action,
            before: previous.observed,
            after: r.observed,
            expected: r.expected,
          },
        ]
      : [];
  });
  return {
    version: 1,
    contract,
    baseline,
    candidate: after,
    changes,
    result: baseline.result === "pass" ? after.result : "inconclusive",
    provenance:
      "Fresh actual local Supabase Auth → PostgREST → RLS observations. Seeded reviewed candidate templates; no upstream vulnerability claim.",
  };
}
