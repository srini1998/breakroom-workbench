import { target, tx, schema } from "../../server/db.ts";
export function barrier(parties: number) {
  let count = 0;
  let release: () => void;
  const gate = new Promise<void>((r) => (release = r));
  return async () => {
    if (++count === parties) release();
    await gate;
  };
}
async function simulation(
  run: string,
  kind: string,
  fixed: boolean,
  limit = 2,
  tag = "",
) {
  const s = schema(run),
    t = s + "." + kind + (fixed ? "_fixed" : "_vulnerable") + tag;
  await target.query(
    `create table if not exists ${t}(holder text primary key,ore int not null,ingot int not null);create table if not exists ${t}_ops(id text primary key);`,
  );
  await tx(target, async (c) => {
    await c.query(
      `delete from ${t};delete from ${t}_ops;insert into ${t} select * from ${s}.initial_inventory`,
    );
  });
  const trace: unknown[] = [];
  if (kind === "withdrawal") {
    const wait = barrier(Math.min(2, limit));
    await Promise.all(
      ["p1", "p2"].slice(0, limit).map(async (player) => {
        if (fixed) {
          await wait();
          await tx(target, async (c) => {
            const claimed = await c.query(
              `update ${t} set ore=ore-1 where holder='chest' and ore>0 returning ore`,
            );
            if (claimed.rowCount)
              await c.query(`update ${t} set ore=ore+1 where holder=$1`, [
                player,
              ]);
            trace.push({
              action: "withdraw",
              player,
              claimed: Boolean(claimed.rowCount),
            });
          });
        } else {
          const old = (
            await target.query(`select ore from ${t} where holder='chest'`)
          ).rows[0].ore;
          await wait();
          if (old > 0)
            await tx(target, async (c) => {
              await c.query(`update ${t} set ore=$1 where holder='chest'`, [
                old - 1,
              ]);
              await c.query(`update ${t} set ore=ore+1 where holder=$1`, [
                player,
              ]);
            });
          trace.push({ action: "withdraw", player, observed: old });
        }
      }),
    );
  }
  if (kind === "craft") {
    for (let delivery = 0; delivery < limit; delivery++)
      await tx(target, async (c) => {
        if (fixed) {
          const receipt = await c.query(
            `insert into ${t}_ops values('craft-1') on conflict do nothing returning id`,
          );
          if (!receipt.rowCount) {
            trace.push({ action: "craft", delivery, result: "deduplicated" });
            return;
          }
        }
        await c.query(
          `update ${t} set ore=ore-2,ingot=ingot+1 where holder='p1' and ore>=2`,
        );
        trace.push({
          action: "craft",
          delivery,
          operation: "craft-1",
          recipe: { ore: -2, ingot: 1 },
        });
      });
  }
  if (kind === "transfer") {
    for (let attempt = 0; attempt < limit; attempt++) {
      try {
        if (fixed)
          await tx(target, async (c) => {
            await c.query(`insert into ${t}_ops values('transfer-1')`);
            await c.query(`update ${t} set ore=ore+1 where holder='p2'`);
            if (attempt === 0) throw Error("interrupted");
            await c.query(`update ${t} set ore=ore-1 where holder='p1'`);
          });
        else {
          await target.query(`update ${t} set ore=ore+1 where holder='p2'`);
          if (attempt === 0) throw Error("interrupted");
          await target.query(`update ${t} set ore=ore-1 where holder='p1'`);
        }
        trace.push({ action: "transfer", attempt, result: "committed" });
      } catch (e) {
        if ((e as Error).message !== "interrupted") throw e;
        trace.push({
          action: "transfer",
          attempt,
          result: "interrupted_after_credit",
        });
      }
    }
  }
  const state = (await target.query(`select * from ${t} order by holder`)).rows;
  const ore = state.reduce((n, r) => n + r.ore, 0),
    ingot = state.reduce((n, r) => n + r.ingot, 0);
  const craft = kind === "craft";
  const passed =
    ore + ingot * 2 === 5 &&
    (!craft || (ingot === 1 && state.find((r) => r.holder === "p1").ore === 2));
  return {
    variant: fixed ? "corrected" : "seeded",
    kind,
    trace,
    state,
    invariants: {
      weighted_material: ore + ingot * 2,
      expected_material: 5,
      craft_effects: ingot,
      expected_craft_effects: craft ? 1 : 0,
    },
    passed,
  };
}
export async function economy(run: string, scenario: string) {
  await prepareEconomy(run);
  const kinds =
    scenario === "clean" ? ["withdrawal", "craft", "transfer"] : [scenario];
  const experiments = [];
  for (const kind of kinds) {
    if (scenario !== "clean")
      experiments.push(await simulatedDefect(run, kind));
    experiments.push(await simulation(run, kind, true));
  }
  return {
    invariant_id: "economy." + scenario,
    expected:
      "Conservation and one effect per operation, including legitimate crafting",
    experiments,
    passed: experiments.every((x) => x.passed),
    reproduction:
      "Two-party read barrier for vulnerable chest; identical concurrent requests against atomic correction. Craft retries share operation ID; transfer injects a post-credit interruption.",
  };
}

export async function prepareEconomy(run: string) {
  const s = schema(run);
  await target.query(
    `create schema if not exists ${s};create table if not exists ${s}.initial_inventory(holder text primary key,ore int not null,ingot int not null);insert into ${s}.initial_inventory values('chest',1,0),('p1',4,0),('p2',0,0) on conflict do nothing;create table if not exists ${s}.experiment_results(kind text primary key,observation jsonb not null);`,
  );
}
export async function inspectEconomy(run: string) {
  await prepareEconomy(run);
  return {
    scope: "Actual owned simulation fixture; defined actions only",
    initial_inventory: (
      await target.query(
        `select * from ${schema(run)}.initial_inventory order by holder`,
      )
    ).rows,
    recipe: { id: "smelt-v1", consume: { ore: 2 }, produce: { ingot: 1 } },
    allowed_actions: ["withdrawal", "craft", "transfer"],
    invariants: [
      "ore + 2 * ingot remains 5",
      "one craft effect per operation ID",
      "transfer debit and credit commit together",
    ],
  };
}
async function simulatedDefect(run: string, kind: string) {
  const observed = await simulation(run, kind, false);
  if (observed.passed) return observed;
  const trials = [];
  let minimal = observed;
  for (let n = 1; n <= observed.trace.length; n++) {
    const probe = await simulation(run, kind, false, n, "_min" + n);
    trials.push({ action_count: n, passed: probe.passed });
    if (!probe.passed) {
      minimal = probe;
      break;
    }
  }
  const corrected = await simulation(
    run,
    kind,
    true,
    minimal.trace.length,
    "_replay",
  );
  return {
    ...observed,
    minimized_reproduction: {
      scope: "Shortest failing prefix of the supported bounded trace",
      action_count: minimal.trace.length,
      trace: minimal.trace,
      actual_state: minimal.state,
      invariants: minimal.invariants,
      trials,
      corrected_replay: {
        passed: corrected.passed,
        state: corrected.state,
        invariants: corrected.invariants,
      },
    },
  };
}
export async function coordinateGame(
  run: string,
  scenario: string,
  kind: string,
) {
  if (!["withdrawal", "craft", "transfer"].includes(kind))
    throw Error("Unknown game action");
  await prepareEconomy(run);
  const experiments = [];
  if (scenario === kind) experiments.push(await simulatedDefect(run, kind));
  experiments.push(await simulation(run, kind, true));
  const result = {
    invariant_id: "economy." + kind,
    expected: "Conservation and idempotent business effects",
    experiments,
    passed: experiments.every((x) => x.passed),
    scope:
      "Actual database action trace; seeded/corrected implementations named explicitly",
  };
  await target.query(
    `insert into ${schema(run)}.experiment_results values($1,$2) on conflict(kind) do update set observation=excluded.observation`,
    [kind, result],
  );
  return result;
}
export async function evaluateEconomy(run: string) {
  const results = (
    await target.query(
      `select observation from ${schema(run)}.experiment_results order by kind`,
    )
  ).rows;
  return {
    invariant_id: "economy.complete_trace",
    expected:
      "All three supported action families tested with invariant evidence",
    experiments: results.flatMap((r) => r.observation.experiments),
    passed: results.length === 3 && results.every((r) => r.observation.passed),
    coverage: results.map((r) => r.observation.invariant_id),
  };
}
