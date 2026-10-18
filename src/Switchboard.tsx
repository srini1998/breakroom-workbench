import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  Radio,
  Download,
  Play,
  Square,
  ArrowLeftRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import RealData from "./RealData.tsx";
type Obj = Record<string, any>;
async function api(path: string, body?: unknown) {
  const r = await fetch("/api/switchboard" + path, {
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Request failed");
  return d;
}
const ms = (v: number | null | undefined) =>
  v == null ? "—" : `${v.toFixed(1)} ms`;
const pct = (v: number | undefined) =>
  v == null ? "—" : `${(v * 100).toFixed(1)}%`;
export default function Switchboard({
  project,
  path,
  navigate,
  onProject,
}: {
  project: string;
  path: string;
  navigate: (path: string) => void;
  onProject: (id: string) => void;
}) {
  const [catalog, setCatalog] = useState<Obj | null>(null),
    [detail, setDetail] = useState<Obj | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [focus, setFocus] = useState(""),
    [cursor, setCursor] = useState(0),
    [play, setPlay] = useState(false),
    [replay, setReplay] = useState(false);
  const [payloadSource, setPayloadSource] = useState("earthquakes");
  const [variant, setVariant] = useState("scoped"),
    [mode, setMode] = useState("baseline"),
    [levels, setLevels] = useState("5"),
    [rate, setRate] = useState(10),
    [operations, setOperations] = useState(10),
    [payload, setPayload] = useState(128),
    [windowMs, setWindow] = useState(1500),
    [objective, setObjective] = useState(1000);
  const selected = path.split("/")[3] || "";
  const loadVersion = useRef(0);
  async function refresh() {
    const version = ++loadVersion.current;
    try {
      const list = await api("");
      if (version !== loadVersion.current || location.pathname !== path) return;
      setCatalog(list);
      if (selected) {
        const d = await api("/" + selected);
        if (version !== loadVersion.current || location.pathname !== path)
          return;
        setDetail(d);
        if (d.run.project_id !== project) onProject(d.run.project_id);
      } else setDetail(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    document.title = "Switchboard · Breakroom";
    void refresh();
    const timer = setInterval(() => void refresh(), 2000);
    return () => {
      loadVersion.current++;
      clearInterval(timer);
    };
  }, [selected, project]);
  const experiments = detail?.experiments || [],
    exp = experiments.find((e: Obj) => e.id === focus) || experiments.at(-1),
    summary = exp?.summary;
  const ops = (detail?.operations || [])
      .filter((o: Obj) => o.experiment_id === exp?.id)
      .map((o: Obj) => o.observation),
    op = ops[Math.min(cursor, ops.length - 1)];
  const receipts = (detail?.receipts || [])
    .filter(
      (r: Obj) =>
        r.experiment_id === exp?.id && r.observation.event_id === op?.event_id,
    )
    .map((r: Obj) => r.observation);
  useEffect(() => {
    if (!play) return;
    const timer = setInterval(
      () => setCursor((n) => (n + 1) % Math.max(1, ops.length)),
      900,
    );
    return () => clearInterval(timer);
  }, [play, ops.length]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const active = detail && ["queued", "running"].includes(detail.run.status);
  return (
    <div className="switchboard">
      <section className="purpose-lead">
        <span className="eyebrow">SWITCHBOARD / LIVE UPDATE DELIVERY</span>
        <h1>
          When something changes,
          <br />
          the right people should see it.
        </h1>
        <p>
          For teams building live order screens, incident boards, or fleet
          dashboards. Switchboard checks whether updates reach the people who
          should receive them—and stay away from everyone else.
        </p>
      </section>
      <RealData id="earthquakes">
        {(d) => (
          <section className="customer-scene">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  EARTHQUAKE MONITOR / REAL USGS OBSERVATIONS
                </span>
                <h2>An actual feed, two example operations teams</h2>
              </div>
              <span>Recorded snapshot</span>
            </div>
            <div className="feed-grid">
              {d.rows.slice(0, 6).map((r: any) => (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="quake-card"
                  key={r.id}
                >
                  <strong>
                    {r.magnitude == null ? "—" : r.magnitude.toFixed(1)}
                  </strong>
                  <div>
                    <b>{r.name}</b>
                    <small>{new Date(r.date).toLocaleString()}</small>
                  </div>
                </a>
              ))}
            </div>
            <p>
              These are public observations from USGS. The two tenant teams are
              fictional. Running a delivery check replays these recorded
              observations through real local Supabase subscriptions; it does
              not detect new earthquakes or operate a public warning service.
            </p>
            <button
              className="button primary"
              onClick={() => {
                setPayloadSource("earthquakes");
                const drawer =
                  document.querySelector<HTMLDetailsElement>(
                    ".technical-drawer",
                  );
                if (drawer) drawer.open = true;
                document
                  .querySelector(".switch-config")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Check delivery using these observations ↓
            </button>
          </section>
        )}
      </RealData>
      <section className="plain-explainer">
        <h2>Think of it as changing the delivery company.</h2>
        <p>
          Your app already sends updates one way. You want to switch to another
          route. Switchboard sends the same kind of updates down both routes,
          checks who receives each one, counts what goes missing, and compares
          the timing. If an update reaches the wrong team, that route fails even
          if it is faster.
        </p>
        <div className="example-columns">
          <div>
            <h3>Example: a retailer</h3>
            <p>
              A store manager should see orders for their own store. Other
              branches should stay private. Before changing the live-update
              route, test that both rules still hold.
            </p>
          </div>
          <div>
            <h3>What the AI actually does</h3>
            <p>
              The local model chooses which allowed subscriber-load group to
              test next. Real clients send and receive updates. Independent
              checks decide whether the route passed. The AI cannot change
              permissions or mark its own work correct.
            </p>
          </div>
          <div>
            <h3>What you receive</h3>
            <p>
              A go/no-go result for the supported workload, missing-delivery
              counts, wrong-audience findings, and a comparison you can
              download. No universal speedup or production guarantee is implied.
            </p>
          </div>
        </div>
      </section>
      <details className="technical-drawer" open={Boolean(selected)}>
        <summary>
          Technical workbench · configure a delivery check, inspect runs and
          agent evidence
        </summary>
        <section className="switch-hero">
          <div>
            <div className="eyebrow">LAB 06 · REALTIME TRANSITION</div>
            <h1>
              Switch the route.
              <br />
              Keep the right audience.
            </h1>
            <p>
              Postgres Changes ⇄ private Broadcast. Send the same orders through
              both paths. Follow every intended receipt—and every unwelcome
              guest.
            </p>
            <div className="switch-tags">
              <span>Real local subscriptions</span>
              <span>Synthetic tenant orders</span>
              <span>Correctness comes first</span>
            </div>
          </div>
          <div className="switch-emblem" aria-hidden="true">
            <Radio size={44} />
            <div className="wire" />
            <span>
              A <ArrowLeftRight /> B
            </span>
            <small>one contract / two routes</small>
          </div>
        </section>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <details className="switch-contract">
          <summary>
            <ShieldCheck size={18} /> The audience contract & supported scope
          </summary>
          <p>
            Two tenants. Each owner and viewer may observe their own tenant.
            Only owners may write. Anonymous users and other tenants may not
            receive those orders or write them.
          </p>
          <p>
            INSERT and UPDATE only. DELETE, tenant reassignment, per-row
            exceptions, membership revocation, reconnect delivery, and arbitrary
            projects are unsupported. Reassignment is also tested as a forbidden
            action.
          </p>
          <p>
            Measurements use one coordinator’s monotonic clock:{" "}
            <strong>write-start-to-receipt</strong>, including local request
            coordination. They are not pure server latency. Three paired
            repetitions alternate A/B order. Local results do not predict hosted
            capacity.
          </p>
        </details>
        <section className="switch-config">
          <div className="section-heading">
            <div>
              <div className="eyebrow">SET UP THE EXPERIMENT</div>
              <h2>Choose a route check</h2>
            </div>
            <span className="status">Local fixture v1</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const r = await api("", {
                  project_id: project,
                  ...(selected ? { parent_id: selected } : {}),
                  variant,
                  mode,
                  levels: levels.split(",").map(Number),
                  rate,
                  operations,
                  payload_bytes: payload,
                  payload_source: payloadSource,
                  observation_ms: windowMs,
                  latency_objective_ms: objective,
                });
                setReplay(false);
                setFocus("");
                setCursor(0);
                navigate("/switchboard/runs/" + r.id);
              });
            }}
          >
            <div className="switch-fields">
              <label>
                Update content
                <select
                  value={payloadSource}
                  onChange={(e) => setPayloadSource(e.target.value)}
                >
                  <option value="earthquakes">
                    Real USGS observations · frozen snapshot
                  </option>
                  <option value="synthetic">
                    Generated payload · benchmark fixture
                  </option>
                </select>
              </label>
              <label>
                Candidate fixture
                <select
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                >
                  <option value="scoped">Scoped · correct tenant topics</option>
                  <option value="broad">
                    Seeded defect · broad topic authorization
                  </option>
                  <option value="dropped">
                    Seeded defect · dropped candidate observer
                  </option>
                  <option value="starved">
                    Quality check · starved coordinator
                  </option>
                </select>
              </label>
              <label>
                Planner
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="baseline">Deterministic fixed matrix</option>
                  <option value="live">
                    Live local model · choose load group order
                  </option>
                </select>
              </label>
              <label>
                Subscribers per experiment
                <select
                  value={levels}
                  onChange={(e) => setLevels(e.target.value)}
                >
                  <option value="5">5 · small paired run</option>
                  <option value="20">20 · medium paired run</option>
                  <option value="50">50 · upper local cap</option>
                  <option value="5,20,50">5, 20, 50 · full matrix</option>
                </select>
              </label>
              <label>
                Operations per experiment
                <input
                  type="number"
                  min="4"
                  max="40"
                  value={operations}
                  onChange={(e) => setOperations(+e.target.value)}
                  required
                />
              </label>
              <label>
                Writes per second
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={rate}
                  onChange={(e) => setRate(+e.target.value)}
                  required
                />
              </label>
              <label>
                Payload bytes
                <input
                  type="number"
                  min="16"
                  max="4096"
                  value={payload}
                  onChange={(e) => setPayload(+e.target.value)}
                  required
                />
              </label>
              <label>
                Receipt window (ms)
                <input
                  type="number"
                  min="500"
                  max="5000"
                  value={windowMs}
                  onChange={(e) => setWindow(+e.target.value)}
                  required
                />
              </label>
              <label>
                Latency objective (ms)
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={objective}
                  onChange={(e) => setObjective(+e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="switch-launch">
              <p>
                One-subscriber smoke first, then 3 paired repetitions per level.
                Objective: 100% intended recipients within the latency objective
                and observation window. Maximum 12 minutes.
              </p>
              <button
                className="button primary"
                disabled={
                  busy ||
                  !project ||
                  catalog?.runs.some((r: Obj) =>
                    ["queued", "running"].includes(r.status),
                  )
                }
              >
                <Play size={16} /> Run real experiment
              </button>
            </div>
          </form>
        </section>
        {detail && (
          <section className="switch-result" aria-live="polite">
            <div className="section-heading">
              <div>
                <div className="eyebrow">
                  {replay
                    ? "RECORDED EVIDENCE PLAYBACK"
                    : "RECORDED LOCAL EXECUTION"}{" "}
                  · {detail.run.spec.mode}
                </div>
                <h2>{detail.run.spec.variant} route check</h2>
                <small>{detail.run.id}</small>
              </div>
              <div className="switch-actions">
                <span className={"status " + detail.run.status}>
                  {detail.run.status}
                </span>
                {active ? (
                  <button
                    className="button"
                    onClick={() =>
                      void act(async () => {
                        await api("/" + selected + "/cancel", {});
                        await refresh();
                      })
                    }
                  >
                    <Square size={14} /> Cancel
                  </button>
                ) : (
                  <button
                    className="button"
                    onClick={() => {
                      setReplay(true);
                      setCursor(0);
                      setPlay(true);
                    }}
                  >
                    <Play size={14} /> Replay evidence
                  </button>
                )}
                <a
                  className="button"
                  href={"/api/switchboard/" + selected + "/export"}
                >
                  <Download size={14} /> Export raw bundle
                </a>
                {!active && detail.run.spec.variant !== "scoped" && (
                  <button
                    className="button"
                    onClick={() => {
                      const s = detail.run.spec;
                      setVariant("scoped");
                      setPayloadSource(s.payload_source || "synthetic");
                      setMode(s.mode);
                      setLevels(s.levels.join(","));
                      setRate(s.rate);
                      setOperations(s.operations);
                      setPayload(s.payload_bytes);
                      setWindow(s.observation_ms);
                      setObjective(s.latency_objective_ms);
                      document
                        .querySelector(".switch-config")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Configure scoped correction
                  </button>
                )}
              </div>
            </div>
            <div
              className={
                "switch-verdict " +
                (detail.run.verdict?.result || "not_evaluated")
              }
            >
              <div>
                {detail.run.verdict?.result === "fail" ? (
                  <AlertTriangle />
                ) : (
                  <ShieldCheck />
                )}
                <strong>
                  {detail.run.verdict?.result || "Not evaluated yet"}
                </strong>
              </div>
              <p>
                {detail.run.verdict?.reasons?.join(" ") ||
                  "Worker will record each experiment, then compare the completed pairs."}
              </p>
            </div>
            <div className="switch-progress">
              {experiments.length} experiments recorded ·{" "}
              {experiments.filter((e: Obj) => e.status === "completed").length}{" "}
              completed · {detail.receipts.length} persisted receipts · seed{" "}
              {detail.run.spec.seed}
            </div>
            <div className="switch-table-wrap">
              <table>
                <caption>
                  Transport experiments. Select a row to inspect its actual
                  operation and receipt ledger.
                </caption>
                <thead>
                  <tr>
                    <th>Inspect</th>
                    <th>Transport / level</th>
                    <th>Status / verdict</th>
                    <th>Intended pairs</th>
                    <th>On time</th>
                    <th>Missing / late</th>
                    <th>Unauthorized / duplicate</th>
                    <th>p50 / p95 / p99</th>
                  </tr>
                </thead>
                <tbody>
                  {experiments.map((e: Obj) => (
                    <tr
                      key={e.id}
                      className={exp?.id === e.id ? "selected" : ""}
                    >
                      <td>
                        <button
                          className="text-button"
                          onClick={() => {
                            setFocus(e.id);
                            setCursor(0);
                            setPlay(false);
                          }}
                        >
                          {e.config.smoke
                            ? "Smoke"
                            : `Pair ${e.config.repetition + 1}`}{" "}
                          <ArrowRight size={14} />
                        </button>
                      </td>
                      <td>
                        {e.config.transport === "changes"
                          ? "A · Changes"
                          : "B · Broadcast"}
                        <small>{e.config.level} subscribers</small>
                      </td>
                      <td>
                        {e.status}
                        <small>{e.summary?.result || "not evaluated"}</small>
                      </td>
                      <td>{e.summary?.metrics.denominator ?? "—"}</td>
                      <td>{pct(e.summary?.metrics.on_time_coverage)}</td>
                      <td>
                        {e.summary
                          ? `${e.summary.metrics.missing} / ${e.summary.metrics.late}`
                          : "—"}
                      </td>
                      <td>
                        {e.summary
                          ? `${e.summary.metrics.unauthorized} / ${e.summary.metrics.duplicate}`
                          : "—"}
                      </td>
                      <td>
                        {e.summary
                          ? `${ms(e.summary.metrics.p50)} / ${ms(e.summary.metrics.p95)} / ${ms(e.summary.metrics.p99)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {exp && (
              <div className="switch-inspector">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">THE RECEIPT ROOM</div>
                    <h3>
                      {exp.config.transport === "changes"
                        ? "Postgres Changes"
                        : "Private Broadcast"}{" "}
                      · {exp.config.level} subscribers
                    </h3>
                  </div>
                  <span>
                    {summary?.quality.compromised
                      ? "Compromised coordinator"
                      : summary
                        ? "Quality checks recorded"
                        : "Collecting evidence"}
                  </span>
                </div>
                <div className="delivery-scene">
                  <div className="order-ticket">
                    <span>ORDER EVENT {op?.seq ?? "—"}</span>
                    <strong>{op?.operation || "Waiting"}</strong>
                    {op?.source_record && (
                      <p>
                        {op.source_record.name} · M{op.source_record.magnitude}
                      </p>
                    )}
                    <small>
                      {op
                        ? `Tenant ${op.tenant} / version ${op.version}`
                        : "No operation recorded yet"}
                    </small>
                    <code>{op?.event_id?.slice(0, 8) || "—"}</code>
                  </div>
                  <div className="delivery-arrow">
                    <ArrowRight size={36} />
                  </div>
                  {[1, 2].map((tenant) => (
                    <div className="tenant-room" key={tenant}>
                      <span className="eyebrow">
                        {tenant === 1 ? "NORTHSTAR" : "CONTROL"} TENANT
                      </span>
                      <strong>
                        {
                          receipts.filter(
                            (r: Obj) =>
                              r.row_tenant === op?.tenant &&
                              r.tenant === tenant,
                          ).length
                        }{" "}
                        receipts
                      </strong>
                      <p>
                        {op?.tenant === tenant
                          ? "Intended audience"
                          : "Must stay quiet"}
                      </p>
                      <div className="receipt-dots">
                        {receipts
                          .filter((r: Obj) => r.tenant === tenant)
                          .map((r: Obj, i: number) => (
                            <span
                              title={`${r.client_id}: ${ms(r.at_ms - op.start_ms)}`}
                              className={
                                r.tenant === op.tenant
                                  ? "receipt-good"
                                  : "receipt-bad"
                              }
                              key={i}
                            >
                              {r.tenant === op.tenant ? "✓" : "!"}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
                {ops.length > 0 && (
                  <div className="switch-playback">
                    <button className="button" onClick={() => setPlay(!play)}>
                      {play ? "Pause" : "Play"} recorded events
                    </button>
                    <label>
                      Recorded operation
                      <input
                        aria-label="Recorded operation"
                        type="range"
                        min="0"
                        max={ops.length - 1}
                        value={Math.min(cursor, ops.length - 1)}
                        onChange={(e) => {
                          setPlay(false);
                          setCursor(+e.target.value);
                        }}
                      />
                    </label>
                    <span>
                      {Math.min(cursor + 1, ops.length)} / {ops.length}
                    </span>
                  </div>
                )}
                {summary && (
                  <>
                    <div className="switch-stat-grid">
                      <div>
                        <small>Intended pair coverage</small>
                        <strong>{pct(summary.metrics.coverage)}</strong>
                        <span>
                          {summary.metrics.denominator -
                            summary.metrics.missing}{" "}
                          / {summary.metrics.denominator}
                        </span>
                      </div>
                      <div>
                        <small>Write completion p95</small>
                        <strong>{ms(summary.write_p95)}</strong>
                        <span>separate from delivery timing</span>
                      </div>
                      <div>
                        <small>Actual write rate</small>
                        <strong>
                          {summary.quality.actual_operations_per_second.toFixed(
                            1,
                          )}
                          /s
                        </strong>
                        <span>
                          {summary.quality.subscribed}/
                          {summary.quality.requested} subscribed
                        </span>
                      </div>
                      <div>
                        <small>Event loop maximum delay</small>
                        <strong>
                          {ms(summary.quality.event_loop_delay_max_ms)}
                        </strong>
                        <span>
                          {(
                            summary.quality.memory_rss_bytes /
                            1024 /
                            1024
                          ).toFixed(1)}{" "}
                          MiB coordinator RSS
                        </span>
                      </div>
                    </div>
                    <p className="small">
                      Quantiles: nearest rank over authorized first receipts
                      inside the window. Missing pairs remain in coverage.{" "}
                      {summary.metrics.p99_unstable
                        ? "p99 is unstable: fewer than 100 observed samples."
                        : ""}{" "}
                      Negative observation is bounded by {summary.window_ms} ms.
                    </p>
                    <details>
                      <summary>
                        Authorization checks, quality, config hash &
                        classifications
                      </summary>
                      <p>
                        Experiment hash: <code>{exp.config_hash}</code>
                      </p>
                      <pre>
                        {JSON.stringify(
                          {
                            quality: summary.quality,
                            checks: summary.negative,
                            classifications: summary.metrics.classifications,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </>
                )}
              </div>
            )}
            {detail.run.verdict?.comparison && (
              <details open>
                <summary>
                  Paired comparison · candidate p95 minus baseline p95
                </summary>
                {detail.run.verdict.comparison.map((g: Obj) => (
                  <div key={g.level}>
                    <h3>{g.level} subscribers</h3>
                    {g.pairs.map((p: Obj) => (
                      <p key={p.repetition}>
                        Pair {p.repetition + 1}: A {ms(p.baseline_p95)} → B{" "}
                        {ms(p.candidate_p95)} · difference {ms(p.delta_ms)}{" "}
                        <small>
                          {p.baseline_hash?.slice(0, 8)} /{" "}
                          {p.candidate_hash?.slice(0, 8)}
                        </small>
                      </p>
                    ))}
                  </div>
                ))}
                <p>
                  These are observed paired differences, not a causal
                  explanation. Correctness and coordinator quality govern the
                  verdict.
                </p>
              </details>
            )}
            <details>
              <summary>Agent decisions & evidence trail</summary>
              {detail.evidence.map((e: Obj) => (
                <div key={e.id}>
                  <strong>{e.kind.replaceAll("_", " ")}</strong>
                  <pre>{JSON.stringify(e.content, null, 2)}</pre>
                </div>
              ))}
            </details>
            <p className="small">
              Run configuration SHA256: <code>{detail.run.config_hash}</code>.
              Contract: <code>{detail.contract_hash}</code>.{" "}
              {detail.limitations.join(" ")}
            </p>
          </section>
        )}
        <section className="switch-history">
          <div className="eyebrow">RUN HISTORY · THIS PROJECT</div>
          <h2>Keep the failed candidates.</h2>
          {catalog?.runs.filter((r: Obj) => r.project_id === project).length ? (
            catalog.runs
              .filter((r: Obj) => r.project_id === project)
              .map((r: Obj) => (
                <button
                  key={r.id}
                  className="switch-history-row"
                  onClick={() => {
                    setReplay(false);
                    setFocus("");
                    navigate("/switchboard/runs/" + r.id);
                  }}
                >
                  <span>
                    {r.spec.variant} · {r.spec.mode}
                    <small>
                      {new Date(r.created_at).toLocaleString()} ·{" "}
                      {r.id.slice(0, 8)}
                    </small>
                  </span>
                  <span>
                    {r.status} / {r.verdict?.result || "not evaluated"}
                  </span>
                  <ArrowRight size={17} />
                </button>
              ))
          ) : (
            <p>
              No experiments yet. Start a route check to record real evidence.
            </p>
          )}
        </section>
      </details>
    </div>
  );
}
