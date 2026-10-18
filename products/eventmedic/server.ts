import { target, tx, schema } from "../../server/db.ts";
export async function prepareEvents(run: string, scenario: string) {
  const s = schema(run);
  await target.query(`create schema if not exists ${s}; create table if not exists ${s}.stock(id int primary key,available int not null check(available>=0),outstanding int not null check(outstanding>=0)); insert into ${s}.stock values(1,4,0) on conflict do nothing;
 create table if not exists ${s}.events(id int primary key,operation_id text not null,kind text not null,dependency text);
 create table if not exists ${s}.operations(operation_id text primary key,kind text not null,committed_at timestamptz default now());
 create table if not exists ${s}.attempts(id bigserial primary key,event_id int references ${s}.events, outcome text not null,created_at timestamptz default now());`);
  const events =
    scenario === "reordered"
      ? [
          [1, "return-1", "return", "checkout-1"],
          [2, "checkout-1", "checkout", null],
        ]
      : [
          [1, "checkout-1", "checkout", null],
          [2, "return-1", "return", "checkout-1"],
        ];
  if (scenario === "duplicate")
    events.push(
      [3, "checkout-1", "checkout", null],
      [4, "return-1", "return", "checkout-1"],
    );
  for (const e of events)
    await target.query(
      `insert into ${s}.events values($1,$2,$3,$4) on conflict do nothing`,
      e,
    );
}
export async function processEvent(run: string, id: number, interrupt = false) {
  const s = schema(run);
  const outcome = await tx(target, async (c) => {
    await c.query(`select * from ${s}.stock where id=1 for update`);
    const e = (await c.query(`select * from ${s}.events where id=$1`, [id]))
      .rows[0];
    if (!e) return "absent_delivery";
    let result = "committed";
    if (
      (
        await c.query(`select 1 from ${s}.operations where operation_id=$1`, [
          e.operation_id,
        ])
      ).rowCount
    )
      result = "duplicate";
    else if (
      e.dependency &&
      !(
        await c.query(`select 1 from ${s}.operations where operation_id=$1`, [
          e.dependency,
        ])
      ).rowCount
    )
      result = "waiting_dependency";
    else {
      await c.query(
        `insert into ${s}.operations(operation_id,kind) values($1,$2)`,
        [e.operation_id, e.kind],
      );
      const delta = e.kind === "checkout" ? -1 : 1;
      await c.query(
        `update ${s}.stock set available=available+$1,outstanding=outstanding-$1 where id=1`,
        [delta],
      );
    }
    await c.query(`insert into ${s}.attempts(event_id,outcome) values($1,$2)`, [
      id,
      result,
    ]);
    return result;
  });
  if (interrupt && outcome === "committed")
    throw new Error("SIMULATED_AFTER_COMMIT_BEFORE_ACK");
  return outcome;
}
export async function recoverEvents(run: string, scenario: string) {
  await prepareEvents(run, scenario);
  const s = schema(run);
  const ledger = (await target.query(`select * from ${s}.events order by id`))
    .rows;
  // Persisted attempt history makes process restarts reconcile the interrupted delivery.
  if (
    scenario === "interrupted" &&
    !(await target.query(`select 1 from ${s}.attempts limit 1`)).rowCount
  ) {
    try {
      await processEvent(run, 1, true);
    } catch (e) {
      if ((e as Error).message !== "SIMULATED_AFTER_COMMIT_BEFORE_ACK") throw e;
    }
  }
  for (let round = 0; round < 2; round++)
    for (const e of ledger) await processEvent(run, e.id);
  return inspectEvents(run, true);
}
export async function inspectEvents(run: string, evaluate = false) {
  const s = schema(run);
  const ledger = (await target.query(`select * from ${s}.events order by id`))
    .rows;
  const stock = (await target.query(`select * from ${s}.stock`)).rows[0];
  const operations = (
    await target.query(`select * from ${s}.operations order by operation_id`)
  ).rows;
  const history = (
    await target.query(`select * from ${s}.attempts order by id`)
  ).rows;
  return {
    invariant_id: "events.exact_effect",
    expected: { available: 4, outstanding: 0, operations: 2 },
    actual: {
      available: stock.available,
      outstanding: stock.outstanding,
      operations: operations.length,
    },
    ledger,
    operations,
    history,
    ...(evaluate
      ? {
          passed:
            stock.available === 4 &&
            stock.outstanding === 0 &&
            operations.length === 2,
        }
      : {}),
  };
}

export async function deliverEvent(
  run: string,
  scenario: string,
  id: number,
  attempt: number,
) {
  await prepareEvents(run, scenario);
  let outcome: string;
  try {
    outcome = await processEvent(
      run,
      id,
      scenario === "interrupted" && id === 1 && attempt === 1,
    );
  } catch (e) {
    if ((e as Error).message !== "SIMULATED_AFTER_COMMIT_BEFORE_ACK") throw e;
    outcome = "interrupted_after_commit_before_ack";
  }
  if (
    process.env.INJECT_CRASH_FOR_RUN === run &&
    scenario === "interrupted" &&
    id === 1 &&
    attempt === 1
  )
    process.exit(75);
  const snapshot = await inspectEvents(run);
  const { passed, ...state } = snapshot;
  return {
    ...state,
    delivery: { event_id: id, attempt, outcome },
    scope:
      "Individual bounded delivery against real Supabase Postgres; original ledger retained",
  };
}
