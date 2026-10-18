import { control, target, tx, schema } from "./db.ts";
import {
  Action,
  ExperimentSpec,
  ToolResult,
  Finding,
  Verdict,
  contracts,
  baseline,
  hash,
  uuid,
  type AgentAction,
} from "./contracts.ts";
import { prepareAccess, probeAccess } from "../products/accessproof/server.ts";
import {
  recoverEvents,
  prepareEvents,
  inspectEvents,
  deliverEvent,
} from "../products/eventmedic/server.ts";
import {
  dryImport,
  commitImport,
  inspectImport,
} from "../products/importrescue/server.ts";
import {
  erasurePlan,
  erase,
  inspectErasureScope,
} from "../products/erasurecheck/server.ts";
import {
  economy,
  inspectEconomy,
  coordinateGame,
  evaluateEconomy,
} from "../products/economybreaker/server.ts";
import { modelAction } from "./model.ts";
export async function claim(worker: string) {
  return tx(control, async (c) => {
    await c.query(
      "update runs set status='failed',verdict=$1 where status in ('queued','running') and attempts>=3 and (lease_until is null or lease_until<now())",
      [
        {
          result: "inconclusive",
          scope: "worker",
          reasons: ["Retry limit exhausted"],
          evidence_refs: [],
          limitations: [],
        },
      ],
    );
    const r = await c.query(
      "select * from runs where (status='queued' or (status='running' and lease_until<now())) and attempts<3 order by created_at for update skip locked limit 1",
    );
    if (!r.rowCount) return null;
    return (
      await c.query(
        "update runs set status='running',worker_id=$1,lease_until=now()+interval '30 seconds',attempts=attempts+1,updated_at=now() where id=$2 returning *",
        [worker, r.rows[0].id],
      )
    ).rows[0];
  });
}
export async function executeTool(run: any, raw: unknown) {
  const a = Action.parse(raw);
  const spec = ExperimentSpec.parse(run.spec);
  const module = spec.supported_parameters.module;
  const allowed = baseline(module).map((x) => x.tool);
  if (!allowed.includes(a.tool)) throw Error("Tool is not allowed for module");
  const scenario = spec.supported_parameters.scenario;
  if (a.tool === "inspect_contract")
    return {
      contract: contracts[module],
      scope: "Public declared contract",
      passed: true,
    };
  if (a.tool === "probe_access") {
    await prepareAccess(run.id, scenario);
    return probeAccess(run.id, a);
  }
  if (a.tool === "recover_events") return recoverEvents(run.id, scenario);
  if (a.tool === "inspect_events") {
    await prepareEvents(run.id, scenario);
    return inspectEvents(run.id);
  }
  if (a.tool === "deliver_event")
    return deliverEvent(run.id, scenario, a.event_id, a.attempt);
  if (a.tool === "verify_inventory") return inspectEvents(run.id, true);
  if (a.tool === "inspect_import")
    return inspectImport(
      run.id,
      scenario,
      spec.supported_parameters.import_source,
    );
  if (a.tool === "propose_mapping") {
    const facts = await inspectImport(
      run.id,
      scenario,
      spec.supported_parameters.import_source,
    );
    return {
      mapping: facts.declared_mapping,
      file_hash: facts.file_hash,
      pack_version: facts.declared_mapping.pack_version,
      scope:
        "Structured mapping data from declared supplier facts; no executable code",
    };
  }
  if (a.tool === "dry_run_import") {
    const plan = await dryImport(
      run.id,
      scenario,
      spec.supported_parameters.import_source,
    );
    if (scenario === "stale-approval")
      await target.query(
        `update ${schema(run.id)}.packs set multiplier=2 where sku='BOLT' and unit='each'`,
      );
    return {
      invariant_id: "import.staging",
      expected:
        "Reject unsupported or inconsistent batch with no stock mutation",
      actual: plan,
      plan: plan.ready ? plan : null,
      approval_required: plan.ready,
      passed: true,
      scope: "Seeded CSV samples; staging only until exact approval",
    };
  }
  if (a.tool === "inspect_erasure_scope")
    return inspectErasureScope(run.id, scenario);
  if (a.tool === "verify_erasure") {
    const plan = await erasurePlan(run.id, scenario);
    return {
      plan,
      approval_required: true,
      passed: true,
      scope: "Scope enumerated; cleanup requires approval",
    };
  }
  if (a.tool === "inspect_economy") return inspectEconomy(run.id);
  if (a.tool === "coordinate_game_actions")
    return coordinateGame(run.id, scenario, a.kind);
  if (a.tool === "verify_economy") return evaluateEconomy(run.id);
  throw Error("Unsupported action");
}
export async function evidence(
  run: any,
  action: unknown,
  observation: Record<string, unknown>,
  ordinal: number,
  summary: string,
  status: "ok" | "error" | "unsupported" = "ok",
  category: "infrastructure" | "validation" | "domain" | null = null,
) {
  return tx(control, async (c) => {
    const eid = uuid(),
      step = uuid(),
      actionId = uuid(),
      ref = { id: eid, hash: hash(observation), kind: "tool_observation" };
    const result = ToolResult.parse({
      action_id: actionId,
      status,
      observed_at: new Date().toISOString(),
      evidence_refs: [ref],
      structured_observations: observation,
      error_category: category,
    });
    await c.query(
      "insert into steps(id,workspace_id,run_id,ordinal,decision_summary) values($1,$2,$3,$4,$5)",
      [step, run.workspace_id, run.id, ordinal, summary],
    );
    await c.query(
      "insert into artifacts(id,workspace_id,run_id,kind,content,content_hash) values($1,$2,$3,'tool_observation',$4,$5)",
      [eid, run.workspace_id, run.id, observation, ref.hash],
    );
    await c.query(
      "insert into tool_calls(id,workspace_id,run_id,step_id,action,result) values($1,$2,$3,$4,$5,$6)",
      [actionId, run.workspace_id, run.id, step, action, result],
    );
    if (observation.passed === false) {
      const finding = Finding.parse({
        invariant_id: observation.invariant_id || "invariant",
        expected: observation.expected || "Contract invariants hold",
        observed: observation.actual || observation,
        evidence_refs: [ref],
        severity: "high",
        provenance: "seeded",
        reproduction_ref: run.id + ":" + ordinal,
      });
      await c.query("insert into findings values($1,$2,$3,$4)", [
        uuid(),
        run.workspace_id,
        run.id,
        finding,
      ]);
    }
    if (observation.approval_required && observation.plan) {
      const plan = observation.plan;
      await c.query(
        "insert into approvals(id,workspace_id,run_id,action_hash,plan) values($1,$2,$3,$4,$5) on conflict(run_id,action_hash) do nothing",
        [uuid(), run.workspace_id, run.id, hash(plan), plan],
      );
    }
    return result;
  });
}
export async function runClaimed(run: any) {
  const spec = ExperimentSpec.parse(run.spec),
    module = spec.supported_parameters.module;
  const limit = spec.limits;
  const deadline =
    new Date(run.deadline_at || run.created_at).getTime() +
    (run.deadline_at ? 0 : limit.milliseconds);
  let timer: ReturnType<typeof setInterval> | undefined;
  try {
    timer = setInterval(
      () =>
        void control
          .query(
            "update runs set lease_until=now()+interval '30 seconds' where id=$1 and worker_id=$2 and status='running'",
            [run.id, run.worker_id],
          )
          .catch(() => {}),
      5000,
    );
    if (spec.supported_parameters.mode === "replay") {
      const source = (
        await control.query(
          "select * from runs where id=$1 and workspace_id=$2 and status='completed'",
          [spec.supported_parameters.parent_id, run.workspace_id],
        )
      ).rows[0];
      if (!source) throw Error("Replay source unavailable");
      const calls = (
        await control.query(
          "select action,result from tool_calls where run_id=$1 order by created_at",
          [source.id],
        )
      ).rows;
      for (const [i, call] of calls.entries()) {
        if (
          (
            await control.query(
              "select 1 from steps where run_id=$1 and ordinal=$2",
              [run.id, i],
            )
          ).rowCount
        )
          continue;
        await evidence(
          run,
          call.action,
          {
            ...call.result.structured_observations,
            approval_required: false,
            replay_source: source.id,
            provenance: "replay",
          },
          i,
          "Replay of saved evidence; no fresh experiment",
          call.result.status,
          call.result.error_category,
        );
      }
      const replayRefs = (
        await control.query("select result from tool_calls where run_id=$1", [
          run.id,
        ])
      ).rows.flatMap((c) => c.result.evidence_refs);
      const replayVerdict = Verdict.parse({
        ...source.verdict,
        scope: source.verdict.scope + " / saved evidence replay",
        reasons: ["Replay source " + source.id, ...source.verdict.reasons],
        evidence_refs: replayRefs,
      });
      await control.query(
        "update runs set status='completed',verdict=$2,lease_until=null,updated_at=now() where id=$1",
        [run.id, replayVerdict],
      );
      return;
    }
    const approved = (
      await control.query(
        "select * from approvals where run_id=$1 and approved_at is not null",
        [run.id],
      )
    ).rows;
    for (const a of approved) {
      if (
        (
          await control.query(
            "select 1 from tool_calls where run_id=$1 and action->>'approval_id'=$2",
            [run.id, a.id],
          )
        ).rowCount
      )
        continue;
      if (Date.now() > deadline)
        throw Error("Approval execution deadline exceeded");
      if (
        new Date(a.expires_at).getTime() < Date.now() ||
        hash(a.plan) !== a.action_hash
      )
        throw Error("Stale approval");
      let result: Record<string, unknown>;
      try {
        result =
          module === "ImportRescue"
            ? await commitImport(run.id, a.id, a.approved_by)
            : await erase(run.id, a.plan);
      } catch (e) {
        if (
          module !== "ImportRescue" ||
          spec.supported_parameters.scenario !== "stale-approval" ||
          !(e as Error).message.includes("Stale approval")
        )
          throw e;
        const stock = (
          await target.query(
            `select * from ${schema(run.id)}.catalog order by sku`,
          )
        ).rows;
        result = {
          invariant_id: "import.stale_approval",
          expected: "Reject stale approval and leave stock unchanged",
          actual: { rejected: true, reason: (e as Error).message, stock },
          passed: stock.every((r) => r.stock === 0),
        };
      }
      await control.query(
        "update approvals set consumed_at=coalesce(consumed_at,now()) where id=$1",
        [a.id],
      );
      const ordinal = Number(
        (
          await control.query(
            "select coalesce(max(ordinal),-1)+1 n from steps where run_id=$1",
            [run.id],
          )
        ).rows[0].n,
      );
      await evidence(
        run,
        { tool: "execute_approved_plan", approval_id: a.id },
        {
          ...result,
          passed: "passed" in result ? result.passed : true,
          approval_hash: a.action_hash,
        },
        ordinal,
        "Executed the exact operator-approved local action",
      );
    }
    const planned = baseline(module);
    let tokenUsage = 0;
    const previous = (
      await control.query(
        "select s.ordinal,t.action,t.result from steps s join tool_calls t on t.step_id=s.id where s.run_id=$1 order by s.ordinal",
        [run.id],
      )
    ).rows;
    for (
      let i = previous.length;
      i < Math.min(planned.length, limit.steps);
      i++
    ) {
      const state = (
        await control.query("select cancel_requested from runs where id=$1", [
          run.id,
        ])
      ).rows[0];
      if (state.cancel_requested) {
        await control.query(
          "update runs set status='cancelled',verdict=$2,lease_until=null,updated_at=now() where id=$1",
          [
            run.id,
            Verdict.parse({
              result: "not_evaluated",
              scope: module,
              reasons: ["Cancelled by operator"],
              evidence_refs: [],
              limitations: [],
            }),
          ],
        );
        return;
      }
      if (Date.now() >= deadline) throw Error("Run deadline exceeded");
      let modelUsage: unknown = null;
      let action: AgentAction = planned[i],
        summary = "Deterministic baseline: " + action.tool;
      if (spec.supported_parameters.mode === "live") {
        try {
          const decision = await modelAction(
            {
              contract: contracts[module],
              completed: previous.map((x) => ({
                action: x.action,
                result: x.result,
              })),
              budget: {
                steps: limit.steps - i,
                tokens: limit.tokens - tokenUsage,
                milliseconds: deadline - Date.now(),
              },
              available_actions: planned
                .filter(
                  (a) => !previous.some((x) => hash(x.action) === hash(a)),
                )
                .filter((a, _, remaining) => {
                  if (!previous.length) return a.tool === "inspect_contract";
                  if (module === "EconomyBreaker") {
                    if (
                      !previous.some((x) => x.action.tool === "inspect_economy")
                    )
                      return a.tool === "inspect_economy";
                    if (a.tool === "verify_economy")
                      return remaining.every(
                        (x) => x.tool === "verify_economy",
                      );
                  }
                  if (module === "ImportRescue") {
                    if (
                      !previous.some((x) => x.action.tool === "inspect_import")
                    )
                      return a.tool === "inspect_import";
                    if (
                      !previous.some((x) => x.action.tool === "propose_mapping")
                    )
                      return a.tool === "propose_mapping";
                  }
                  if (
                    module === "ErasureCheck" &&
                    !previous.some(
                      (x) => x.action.tool === "inspect_erasure_scope",
                    )
                  )
                    return a.tool === "inspect_erasure_scope";
                  if (module === "EventMedic") {
                    if (
                      !previous.some((x) => x.action.tool === "inspect_events")
                    )
                      return a.tool === "inspect_events";
                    if (a.tool === "verify_inventory")
                      return remaining.every(
                        (x) => x.tool === "verify_inventory",
                      );
                    if (a.tool === "deliver_event" && a.attempt === 2) {
                      const events = previous
                        .filter((x) => x.result.structured_observations.ledger)
                        .at(-1)?.result.structured_observations;
                      const event = events?.ledger?.find(
                        (e: any) => e.id === a.event_id,
                      );
                      if (
                        event?.dependency &&
                        !events?.operations?.some(
                          (o: any) => o.operation_id === event.dependency,
                        )
                      )
                        return false;
                    }
                  }
                  return true;
                }),
            },
            AbortSignal.timeout(
              Math.min(
                Number(process.env.MODEL_TIMEOUT_MS || 30000),
                Math.max(1, deadline - Date.now()),
              ),
            ),
          );
          action = decision.action;
          summary = decision.summary;
          const usage = decision.usage as any;
          modelUsage = usage;
          tokenUsage += usage?.provider_usage?.total_tokens || 600;
          if (tokenUsage > limit.tokens)
            throw Error("Model token budget exhausted");
          if (previous.some((x) => hash(x.action) === hash(action)))
            throw Error("Repeated model action rejected");
        } catch (e) {
          await evidence(
            run,
            { tool: "invalid_model_action" },
            { error: (e as Error).message, usage_cost: "unknown" },
            i,
            "Model action rejected or provider unavailable",
            "error",
            "validation",
          );
          throw e;
        }
      }
      try {
        const observation = await executeTool(run, action);
        const result = await evidence(
          run,
          action,
          {
            ...observation,
            mode: spec.supported_parameters.mode,
            model_usage: modelUsage,
            usage_cost: "unknown",
          },
          i,
          summary,
        );
        previous.push({ ordinal: i, action, result });
      } catch (e) {
        const unavailable = action.tool === "verify_erasure";
        await evidence(
          run,
          action,
          { error: (e as Error).message },
          i,
          "Tool did not produce domain evidence",
          unavailable ? "unsupported" : "error",
          "infrastructure",
        );
        if (!unavailable) throw e;
      }
    }
    const finalState = (
      await control.query("select cancel_requested from runs where id=$1", [
        run.id,
      ])
    ).rows[0];
    if (finalState.cancel_requested) {
      await control.query(
        "update runs set status='cancelled',lease_until=null where id=$1",
        [run.id],
      );
      return;
    }
    if (Date.now() > deadline) throw Error("Run deadline exceeded");
    await finalize(run);
  } catch (e) {
    await control.query(
      "update runs set status='failed',lease_until=null,updated_at=now(),verdict=$2 where id=$1",
      [
        run.id,
        Verdict.parse({
          result: "inconclusive",
          scope: module,
          reasons: [(e as Error).message],
          evidence_refs: [],
          limitations: [
            "Infrastructure or invalid action; no domain success claimed",
          ],
        }),
      ],
    );
  } finally {
    if (timer) clearInterval(timer);
    console.log(
      JSON.stringify({
        event: "run.finished",
        run_id: run.id,
        worker_id: run.worker_id,
        module,
      }),
    );
  }
}
export async function finalize(run: any) {
  const calls = (
    await control.query(
      "select action,result from tool_calls where run_id=$1 order by created_at",
      [run.id],
    )
  ).rows;
  const refs = calls.flatMap((x) => x.result.evidence_refs);
  const observations = calls.map((x) => x.result.structured_observations);
  const unsupported = calls.some((x) => x.result.status === "unsupported");
  const error = calls.some((x) => x.result.status === "error");
  const pending = await control.query(
    "select 1 from approvals where run_id=$1 and consumed_at is null",
    [run.id],
  );
  const module = run.spec.supported_parameters.module;
  const required: Record<string, string[]> = {
    EventMedic: ["inspect_events", "verify_inventory"],
    ErasureCheck: ["inspect_erasure_scope", "verify_erasure"],
    ImportRescue: ["inspect_import", "propose_mapping", "dry_run_import"],
    EconomyBreaker: ["inspect_economy", "verify_economy"],
  };
  const covered =
    module !== "AccessProof"
      ? (required[module] || []).every((tool) =>
          calls.some((c) => c.action.tool === tool && c.result.status === "ok"),
        )
      : baseline(module).every((a) =>
          calls.some(
            (c) =>
              c.result.structured_observations.operation ===
                (a as any).operation &&
              c.result.structured_observations.identity === (a as any).identity,
          ),
        );
  const result = unsupported
    ? "unsupported"
    : error || !covered
      ? "inconclusive"
      : observations.some((x) => x.passed === false)
        ? "fail"
        : pending.rowCount
          ? "not_evaluated"
          : refs.length < 2
            ? "inconclusive"
            : "pass";
  const verdict = Verdict.parse({
    result,
    scope: module + " / named local fixture only",
    reasons: [
      unsupported
        ? "Required local service unavailable"
        : pending.rowCount
          ? "Review the exact action plan before committing"
          : result === "fail"
            ? "Reproduced violation in seeded fixture"
            : !covered
              ? "Required permission matrix probes missing"
              : "Evidence evaluated against declared fixture contract",
    ],
    evidence_refs: refs,
    limitations: [
      "Seeded supported scenarios only",
      "Baseline, live, and replay modes are distinct",
      "Inference cost unknown unless externally measured",
      ...(module === "AccessProof"
        ? ["Attachment metadata only; no Storage blob permissions tested"]
        : []),
    ],
  });
  await control.query(
    "update runs set status='completed',verdict=$2,lease_until=null,updated_at=now() where id=$1",
    [run.id, verdict],
  );
  return verdict;
}
