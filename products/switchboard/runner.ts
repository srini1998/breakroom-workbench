import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { control, target } from "../../server/db.ts";
import { hash, uuid } from "../../server/contracts.ts";
import {
  evaluate,
  expected,
  type Operation,
  type Receipt,
  type SwitchConfig,
} from "./contract.ts";
export type Experiment = {
  transport: "changes" | "broadcast";
  level: number;
  repetition: number;
  smoke: boolean;
};
const pause = (n: number) => new Promise<void>((r) => setTimeout(r, n));
export const client = () => {
  const url = new URL(process.env.SUPABASE_URL!);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw Error("Switchboard targets must be local Supabase");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 1000 } },
    },
  );
};
export async function identity(i: number) {
  const c = client();
  const r = await c.auth.signInWithPassword({
    email: `switch${i}@breakroom.test`,
    password: process.env.FIXTURE_PASSWORD!,
  });
  if (r.error) throw Error("Fixture Auth unavailable");
  await c.realtime.setAuth(r.data.session!.access_token);
  return c;
}
export const eventUUID = (input: string) => {
  const h = hash(input);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export async function experiment(
  run: any,
  exp: any,
  check: () => Promise<void>,
) {
  const cfg = run.spec as SwitchConfig,
    plan = exp.config as Experiment;
  const origin = performance.now(),
    time = () => performance.now() - origin,
    cpu = process.cpuUsage(),
    lag = monitorEventLoopDelay({ resolution: 10 });
  lag.enable();
  const ops: Operation[] = [],
    receipts: Receipt[] = [],
    pending: Promise<unknown>[] = [],
    clients: SupabaseClient[] = [],
    channels: any[] = [];
  const observers = Array.from({ length: plan.level }, (_, i) => ({
    id: `observer-${i + 1}`,
    identity: (i % 4) + 1,
    tenant: i % 4 < 2 ? 1 : 2,
    role: i % 2 === 0 ? "owner" : "viewer",
  }));
  const errors: string[] = [],
    negative: any[] = [];
  let subscribed = 0,
    persistenceError = false,
    cancelled = false,
    collecting = false;
  const topic = (tenant: number) => `switch:${exp.id}:${cfg.variant}:${tenant}`;
  async function persistReceipt(r: Receipt) {
    receipts.push(r);
    try {
      await control.query(
        "insert into switch_receipts(run_id,workspace_id,experiment_id,observation) values($1,$2,$3,$4)",
        [run.id, run.workspace_id, exp.id, r],
      );
    } catch {
      persistenceError = true;
    }
  }
  async function subscribe(
    c: SupabaseClient,
    observer: { id: string; tenant: number },
    foreign = false,
    anonymous = false,
  ) {
    const channel = c.channel(
      plan.transport === "broadcast"
        ? topic(foreign ? 3 - observer.tenant : observer.tenant)
        : `changes-${exp.id}-${observer.id}`,
      {
        config: {
          private: plan.transport === "broadcast",
          postgres_changes_options: { wait: true, timeout: 15000 },
        },
      },
    );
    const receive = (p: any) => {
      const row = plan.transport === "changes" ? p.new : p.payload?.record;
      if (!row || row.experiment_id !== exp.id) return;
      pending.push(
        persistReceipt({
          event_id: typeof row.event_id === "string" ? row.event_id : null,
          client_id: observer.id,
          tenant: observer.tenant,
          at_ms: time(),
          row_tenant: row.tenant ?? null,
        }),
      );
    };
    if (plan.transport === "changes")
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "switch_orders",
          filter: `experiment_id=eq.${exp.id}`,
        },
        receive,
      );
    else
      for (const event of ["INSERT", "UPDATE"])
        channel.on("broadcast", { event }, receive);
    channels.push(channel);
    const status = await new Promise<string>((resolve) => {
      let done = false;
      const finish = (s: string) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(s);
        }
      };
      const timer = setTimeout(() => finish("TIMEOUT"), 20000);
      channel.subscribe((s) => {
        if (
          done &&
          collecting &&
          !foreign &&
          !anonymous &&
          ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(s)
        )
          errors.push(`${observer.id}: ${s} during workload`);
        if (["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(s))
          finish(s);
      });
    });
    if (foreign || anonymous)
      negative.push({
        check: anonymous
          ? "anonymous_subscription"
          : "cross_tenant_subscription",
        client_id: observer.id,
        status,
        expected:
          plan.transport === "changes"
            ? "RLS filters all forbidden rows"
            : cfg.variant === "broad" && !anonymous
              ? "seeded unsafe join"
              : "join denied",
      });
    else if (status === "SUBSCRIBED") subscribed++;
    else errors.push(`${observer.id}: ${status}`);
    if (status !== "SUBSCRIBED") await channel.unsubscribe(500);
    return channel;
  }
  let firstChannel: any;
  try {
    await check();
    // Sign-in separately per observer; no service credentials in subscriptions or workload writes.
    for (let start = 0; start < observers.length; start += 5) {
      await check();
      await Promise.all(
        observers.slice(start, start + 5).map(async (o) => {
          const c = await identity(o.identity);
          clients.push(c);
          const ch = await subscribe(c, o);
          if (o.id === "observer-1") firstChannel = ch;
          if (
            plan.transport === "broadcast" &&
            o.identity === 1 &&
            o.id === "observer-1"
          )
            await subscribe(c, o, true);
        }),
      );
    }
    const anon = client();
    clients.push(anon);
    await subscribe(anon, { id: "anonymous", tenant: 1 }, false, true);
    await pause(cfg.warmup_ms);
    await check();
    if (
      cfg.variant === "dropped" &&
      plan.transport === "broadcast" &&
      firstChannel
    ) {
      await firstChannel.unsubscribe();
      negative.push({
        check: "injected_observer_drop",
        client_id: "observer-1",
        before_writes: true,
      });
    }
    const owners = [await identity(1), await identity(3)],
      viewer = await identity(2);
    clients.push(...owners, viewer);
    const rowId = [eventUUID(`${exp.id}-row-1`), eventUUID(`${exp.id}-row-2`)];
    for (const [name, c, tenant] of [
      ["cross_tenant_write", owners[0], 2],
      ["viewer_write", viewer, 1],
      ["anonymous_write", anon, 1],
    ] as const) {
      const r = await c
        .from("switch_orders")
        .insert({
          id: uuid(),
          run_id: run.id,
          experiment_id: exp.id,
          tenant,
          event_id: uuid(),
          seq: -1,
          seed: cfg.seed,
          version: 1,
          payload: "negative write",
          transport: plan.transport,
          variant: cfg.variant,
        })
        .select("id");
      negative.push({
        check: name,
        denied: Boolean(r.error),
        rows: r.data?.length || 0,
        error_code: r.error?.code || null,
      });
    }
    collecting = true;
    const workloadStart = time(),
      count = plan.smoke ? 4 : cfg.operations;
    for (let seq = 0; seq < count; seq++) {
      await check();
      const tenant = (seq % 2) + 1,
        version = Math.floor(seq / 2) + 1,
        event_id = eventUUID(`${cfg.seed}:${exp.id}:${seq}`);
      const op: Operation = {
        event_id,
        seq,
        tenant,
        version,
        operation: version === 1 ? "INSERT" : "UPDATE",
        start_ms: time(),
        write_ms: null,
        write_error: null,
        expected: observers.filter((o) => expected(tenant, o)).map((o) => o.id),
      };
      const source =
        cfg.payload_source === "earthquakes"
          ? cfg.dataset_snapshot?.rows[seq % cfg.dataset_snapshot.rows.length]
          : undefined;
      if (cfg.payload_source === "earthquakes" && !source)
        throw Error("Frozen public dataset missing");
      if (source) op.source_record = source;
      const text = source
        ? JSON.stringify(source)
        : "x".repeat(cfg.payload_bytes);
      op.payload_bytes = Buffer.byteLength(text);
      ops.push(op);
      await control.query(
        "insert into switch_operations(run_id,workspace_id,experiment_id,event_id,seq,observation) values($1,$2,$3,$4,$5,$6)",
        [run.id, run.workspace_id, exp.id, event_id, seq, op],
      );
      // Timestamp immediately before the ordinary Auth client's request, after durable intent.
      op.start_ms = time();
      await control.query(
        "update switch_operations set observation=$1 where experiment_id=$2 and event_id=$3",
        [op, exp.id, event_id],
      );
      const row = {
        id: rowId[tenant - 1],
        run_id: run.id,
        experiment_id: exp.id,
        tenant,
        event_id,
        seq,
        seed: cfg.seed,
        version,
        payload: text,
        transport: plan.transport,
        variant: cfg.variant,
      };
      const r =
        version === 1
          ? await owners[tenant - 1]
              .from("switch_orders")
              .insert(row)
              .select("id")
          : await owners[tenant - 1]
              .from("switch_orders")
              .update(row)
              .eq("id", row.id)
              .select("id");
      op.write_ms = time() - op.start_ms;
      op.write_error = r.error?.code || (!r.data?.length ? "NO_ROW" : null);
      await control.query(
        "update switch_operations set observation=$1 where experiment_id=$2 and event_id=$3",
        [op, exp.id, event_id],
      );
      if (cfg.variant === "starved") {
        const end = performance.now() + 180;
        while (performance.now() < end) {}
      }
      await pause(
        Math.max(0, workloadStart + ((seq + 1) * 1000) / cfg.rate - time()),
      );
    }
    const writeDuration = time() - workloadStart;
    const observeUntil = time() + cfg.observation_ms;
    while (time() < observeUntil) {
      await check();
      await pause(50);
    }
    // Exercise forbidden ownership reassignment through an ordinary owner session.
    const moved = await owners[0]
      .from("switch_orders")
      .update({ tenant: 2 })
      .eq("id", rowId[0])
      .select("id");
    negative.push({
      check: "tenant_reassignment",
      denied: Boolean(moved.error) || !moved.data?.length,
      error_code: moved.error?.code || null,
    });
    const anonRead = await anon
      .from("switch_orders")
      .select("id")
      .eq("experiment_id", exp.id);
    negative.push({
      check: "anonymous_read",
      denied: !anonRead.error && !anonRead.data?.length,
      rows: anonRead.data?.length || 0,
    });
    collecting = false;
    await Promise.allSettled(channels.map((ch) => ch.unsubscribe(500)));
    await Promise.all(pending);
    const measured = evaluate(
        ops,
        receipts,
        cfg.observation_ms,
        cfg.latency_objective_ms,
      ),
      cpuUsed = process.cpuUsage(cpu);
    const quality = {
      requested: plan.level,
      subscribed,
      connection_errors: errors,
      persistence_error: persistenceError,
      operation_errors: ops.filter((o) => o.write_error).length,
      actual_operations_per_second: count / (writeDuration / 1000),
      cpu_ms: (cpuUsed.user + cpuUsed.system) / 1000,
      memory_rss_bytes: process.memoryUsage().rss,
      event_loop_delay_max_ms: lag.max / 1e6,
      event_loop_delay_mean_ms: Number.isFinite(lag.mean)
        ? lag.mean / 1e6
        : null,
      compromised:
        measured.uncorrelated > 0 ||
        subscribed !== plan.level ||
        errors.length > 0 ||
        persistenceError ||
        ops.some((o) => o.write_error) ||
        lag.max / 1e6 > 100,
    };
    const forbidden = negative.some((n) => n.denied === false);
    const result =
      measured.unauthorized || forbidden
        ? "fail"
        : quality.compromised
          ? "inconclusive"
          : measured.on_time_coverage < cfg.coverage_objective
            ? "fail"
            : "pass";
    return {
      result,
      metrics: measured,
      quality,
      negative,
      write_p50: quantileWrites(ops, 0.5),
      write_p95: quantileWrites(ops, 0.95),
      timing:
        "monotonic write-start-to-receipt; includes coordinator persistence before dispatch",
      window_ms: cfg.observation_ms,
      observed_at: new Date().toISOString(),
    };
  } catch (e) {
    cancelled = (e as Error).message === "Run cancelled";
    throw e;
  } finally {
    collecting = false;
    lag.disable();
    await Promise.allSettled(channels.map((ch) => ch.unsubscribe(500)));
    await Promise.allSettled(clients.map((c) => c.removeAllChannels()));
    await Promise.allSettled(pending);
    // Only this experiment's workload rows. Durable operations and receipts are retained.
    await target.query(
      "delete from public.switch_orders where experiment_id=$1 and run_id=$2",
      [exp.id, run.id],
    );
    if (cancelled)
      await control.query(
        "update switch_experiments set status='cancelled' where id=$1",
        [exp.id],
      );
  }
}
function quantileWrites(ops: Operation[], p: number) {
  const a = ops
    .flatMap((o) => (o.write_ms === null ? [] : [o.write_ms]))
    .sort((a, b) => a - b);
  return a[Math.max(0, Math.ceil(a.length * p) - 1)] ?? null;
}
