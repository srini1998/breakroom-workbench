import { useEffect, useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCases } from "./useCases.ts";
import { DataSource } from "./RealData.tsx";
type Obj = Record<string, any>;
async function request(slug: string, path: string, body?: unknown) {
  const r = await fetch("/api/applications/" + slug + path, {
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
export default function ProductExperience({
  slug,
  project,
  openTechnical,
}: {
  slug: string;
  project: string;
  openTechnical: () => void;
}) {
  const copy = useCases[slug];
  const [catalog, setCatalog] = useState<Obj | null>(null),
    [current, setCurrent] = useState<Obj | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [persona, setPersona] = useState("owner"),
    [record, setRecord] = useState("");
  const [csv, setCsv] = useState(""),
    [mapping, setMapping] = useState({
      sku: "sku",
      quantity: "quantity",
      receipt: "source_row",
    });
  useEffect(() => {
    let active = true;
    setCatalog(null);
    setCurrent(null);
    setError("");
    if (project)
      request(slug, "?project=" + project)
        .then((d) => {
          if (active) {
            setCatalog(d);
            setCurrent(d.cases[0] || null);
            setRecord(d.dataset.rows[0]?.id || "");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [slug, project]);
  async function act(body: Obj) {
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      const d = await request(slug, "/" + current.id + "/action", body);
      setCurrent(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    setBusy(true);
    setError("");
    try {
      setCurrent(await request(slug, "/start", { project_id: project }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const state = current?.state;
  return (
    <div className={"product-experience " + slug}>
      <section className="purpose-lead">
        <span className="eyebrow">
          {
            {
              accessproof: "AccessProof",
              eventmedic: "EventMedic",
              erasurecheck: "ErasureCheck",
              importrescue: "ImportRescue",
              economybreaker: "EconomyBreaker",
            }[slug]
          }{" "}
          / IN PRACTICE
        </span>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
        <span className="for-whom">
          Built for {copy.audience.toLowerCase()}.
        </span>
      </section>
      <div className="purpose-layout">
        <div className="purpose-main">
          <section className="customer-scene">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR WORKSPACE</span>
                <h2>
                  {slug === "accessproof"
                    ? "The team work desk"
                    : slug === "eventmedic"
                      ? "The rental counter"
                      : slug === "erasurecheck"
                        ? "Account closure desk"
                        : slug === "importrescue"
                          ? "Import review desk"
                          : "The crafting room"}
                </h2>
              </div>
              <button
                className="button"
                disabled={busy || !catalog}
                onClick={() => void start()}
              >
                <Plus size={15} />
                {current ? "New example" : "Open example workspace"}
              </button>
            </div>
            <p className="workspace-boundary">{copy.limit}</p>
            {error && (
              <p role="alert" className="error-banner">
                {error}
              </p>
            )}
            {!catalog ? (
              <div className="data-loading">Loading source records…</div>
            ) : !state ? (
              <div className="dataset-preview">
                <h3>Start with real source material</h3>
                {catalog.dataset.rows.slice(0, 4).map((r: Obj) => (
                  <div className="preview-row" key={r.id}>
                    <span>{r.name}</span>
                    <small>
                      {r.quantity
                        ? `${r.quantity} units`
                        : r.bikes != null
                          ? `${r.bikes} bikes observed`
                          : r.input_units
                            ? `${r.input_units} ${r.input} → ${r.output_units} block`
                            : "Public source record"}
                    </small>
                  </div>
                ))}
                <p>
                  Open an example workspace to use this data in a saved local
                  workflow.
                </p>
              </div>
            ) : (
              <>
                {slug === "accessproof" && (
                  <>
                    <div className="role-switch">
                      <label>
                        Preview colleague
                        <select
                          value={persona}
                          onChange={(e) => setPersona(e.target.value)}
                        >
                          <option value="owner">Team owner</option>
                          <option value="member">Team member</option>
                          <option value="contractor">
                            Assigned contractor
                          </option>
                        </select>
                      </label>
                      <p>
                        {persona === "contractor"
                          ? "Only the first assigned record is visible."
                          : persona === "owner"
                            ? "Read and review your team’s records."
                            : "Read your team’s records; updates require the owner."}
                      </p>
                    </div>
                    <div className="issue-board">
                      {state.documents
                        .filter(
                          (r: Obj) =>
                            r.tenant === 1 &&
                            (persona !== "contractor" || r.assigned),
                        )
                        .map((r: Obj) => (
                          <article className="issue-ticket" key={r.id}>
                            <small>
                              EXAMPLE TEAM NORTH / PUBLIC ISSUE #{r.id}
                            </small>
                            <h3>{r.name}</h3>
                            <span className="status">{r.status}</span>
                            <div>
                              <button
                                className="button"
                                disabled={busy}
                                onClick={() =>
                                  void act({
                                    type: "access_check",
                                    persona,
                                    document_id: r.id,
                                  })
                                }
                              >
                                Check open permission
                              </button>
                              <button
                                className="button"
                                disabled={busy}
                                onClick={() =>
                                  void act({
                                    type: "access_update",
                                    persona,
                                    document_id: r.id,
                                  })
                                }
                              >
                                Review local copy
                              </button>
                              <a href={r.url} target="_blank" rel="noreferrer">
                                Original public issue ↗
                              </a>
                            </div>
                          </article>
                        ))}
                    </div>
                    <div className="boundary-test">
                      <h3>Try the other team’s boundary</h3>
                      <p>
                        A public issue has been assigned to a different
                        fictional client. Your current colleague should be
                        blocked by this example app’s server rule.
                      </p>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() =>
                          void act({
                            type: "access_check",
                            persona,
                            document_id: state.documents.find(
                              (r: Obj) => r.tenant === 2,
                            ).id,
                          })
                        }
                      >
                        Try opening the other team’s item
                      </button>
                    </div>
                    {state.last_check && (
                      <div
                        className={
                          "business-outcome " +
                          (state.last_check.allowed ? "allowed" : "blocked")
                        }
                      >
                        <strong>
                          {state.last_check.allowed
                            ? "Request allowed"
                            : "Request blocked"}
                        </strong>
                        <p>{state.last_check.rule}</p>
                      </div>
                    )}
                  </>
                )}
                {slug === "eventmedic" &&
                  (() => {
                    const station = state.stations.find(
                      (s: Obj) => s.id === state.selected,
                    );
                    const last =
                      state.last_checkout &&
                      state.receipts[state.last_checkout];
                    return (
                      <>
                        <div className="business-form">
                          <label>
                            Station from the recorded public feed
                            <select
                              value={state.selected}
                              onChange={(e) =>
                                void act({
                                  type: "select_station",
                                  station_id: e.target.value,
                                })
                              }
                            >
                              {state.stations.map((s: Obj) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="balance-strip">
                          <div>
                            <small>Observed starting bikes</small>
                            <strong>{station.initial}</strong>
                            <small>
                              Source snapshot, not live availability
                            </small>
                          </div>
                          <div>
                            <small>Available in this local copy</small>
                            <strong>{station.available}</strong>
                            <small>Changes only in this workspace</small>
                          </div>
                          <div>
                            <small>Out on local checkouts</small>
                            <strong>{station.outstanding}</strong>
                            <small>
                              Must reconcile with the starting count
                            </small>
                          </div>
                        </div>
                        <div className="business-actions">
                          <button
                            disabled={busy || station.available < 1}
                            className="button primary"
                            onClick={() =>
                              void act({
                                type: "checkout",
                                station_id: station.id,
                                operation_id: crypto.randomUUID(),
                              })
                            }
                          >
                            Check out one bike locally
                          </button>
                          <button
                            disabled={
                              busy || !last || last.station_id !== station.id
                            }
                            className="button"
                            onClick={() =>
                              void act({
                                type: "checkout",
                                station_id: station.id,
                                operation_id: state.last_checkout,
                              })
                            }
                          >
                            Resend that same checkout
                          </button>
                          <button
                            disabled={
                              busy ||
                              !last ||
                              last.returned ||
                              last.station_id !== station.id
                            }
                            className="button"
                            onClick={() =>
                              void act({
                                type: "return",
                                station_id: station.id,
                                operation_id: crypto.randomUUID(),
                                checkout_id: state.last_checkout,
                              })
                            }
                          >
                            Return that bike
                          </button>
                        </div>
                        {state.last_result && (
                          <div className="business-outcome">
                            <strong>{state.last_result.message}</strong>
                            <p>
                              Available + checked out = starting bikes.{" "}
                              {state.last_result.conserved
                                ? "Inventory reconciles."
                                : "Needs investigation."}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}

                {slug === "erasurecheck" && (
                  <>
                    <div className="balance-strip">
                      <div>
                        <small>Example account</small>
                        <strong>
                          {state.status === "closed" ? "Closed" : "Active"}
                        </strong>
                        <small>
                          {state.account?.email || "Owned profile removed"}
                        </small>
                      </div>
                      <div>
                        <small>Public retail lines linked locally</small>
                        <strong>{state.receipt_rows.length}</strong>
                        <small>No real customer identities</small>
                      </div>
                      <div>
                        <small>Storage & delayed work</small>
                        <strong>
                          {state.result?.passed ? "Checked" : "Ready"}
                        </strong>
                        <small>Real local Supabase resources</small>
                      </div>
                    </div>
                    <div className="owned-resource-list">
                      <div>
                        <h3>Owned by the fictional account</h3>
                        <ul>
                          <li>Profile and account export record</li>
                          <li>Private attachment in Storage</li>
                          <li>CSV of public product lines linked locally</li>
                        </ul>
                      </div>
                      <div>
                        <h3>Must survive</h3>
                        <ul>
                          <li>Other example account’s control file</li>
                          <li>Shared team handover file</li>
                          <li>Public source dataset attribution</li>
                        </ul>
                      </div>
                    </div>
                    {state.status !== "closed" && (
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => void act({ type: "review_erasure" })}
                      >
                        Prepare an account closure plan
                      </button>
                    )}
                    {state.approval && (
                      <div className="approval-plan">
                        <h3>Review before deleting</h3>
                        <p>
                          This will remove this example account’s owned profile,
                          private attachment and purchase-line export, detach
                          shared ownership and block the delayed export. The
                          other account and shared team file stay intact. It
                          affects only this locally created workspace.
                        </p>
                        <p>
                          Plan expires{" "}
                          {new Date(
                            state.approval.expires_at,
                          ).toLocaleTimeString()}
                          . Approval is bound to this exact plan.
                        </p>
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() =>
                            void act({
                              type: "approve_erasure",
                              action_hash: state.approval.hash,
                            })
                          }
                        >
                          Approve and close this example account
                        </button>
                      </div>
                    )}
                    {state.result && (
                      <div className="business-outcome">
                        <strong>
                          {state.result.passed
                            ? "Account closure verified"
                            : "Closure needs attention"}
                        </strong>
                        <p>
                          {state.result.passed
                            ? "Owned files are absent, preserved content is unchanged, and the delayed export cannot recreate the account’s file."
                            : "The worker did not establish all required checks."}
                        </p>
                        <details>
                          <summary>See resource checks</summary>
                          <pre>{JSON.stringify(state.result, null, 2)}</pre>
                        </details>
                      </div>
                    )}
                  </>
                )}

                {slug === "importrescue" && (
                  <>
                    <div className="business-actions">
                      <button
                        className="button"
                        onClick={() =>
                          setCsv(
                            "sku,quantity,source_row\n" +
                              current.source.rows
                                .map((r: Obj) =>
                                  [r.sku, r.quantity, r.id].join(","),
                                )
                                .join("\n"),
                          )
                        }
                      >
                        Load real UCI sales sample
                      </button>
                      <label className="button">
                        Upload CSV
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            if (f.size > 65536) {
                              setError("CSV must be at most 64 KiB");
                              return;
                            }
                            void f.text().then(setCsv);
                          }}
                        />
                      </label>
                    </div>
                    <label>
                      CSV to review
                      <textarea
                        className="business-code"
                        value={csv}
                        onChange={(e) => setCsv(e.target.value)}
                        maxLength={65536}
                        placeholder="Load the real historical sample or choose a CSV"
                      />
                    </label>
                    <div className="business-form">
                      {(["sku", "quantity", "receipt"] as const).map((k) => (
                        <label key={k}>
                          {k === "sku"
                            ? "SKU column"
                            : k === "quantity"
                              ? "Quantity column"
                              : "Source-row ID column"}
                          <input
                            value={mapping[k]}
                            onChange={(e) =>
                              setMapping({ ...mapping, [k]: e.target.value })
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <button
                      className="button primary"
                      disabled={busy || !csv}
                      onClick={() =>
                        void act({ type: "stage_import", csv, mapping })
                      }
                    >
                      Check and preview this file
                    </button>
                    {state.approval && (
                      <div className="approval-plan">
                        <h3>
                          Review {state.approval.plan.rows.length} rows ·{" "}
                          {state.approval.plan.rows.reduce(
                            (n: number, r: Obj) => n + r.quantity,
                            0,
                          )}{" "}
                          sales units
                        </h3>
                        <p>
                          These will enter the local sales ledger, not add stock
                          to a real shop. The provided sample excludes customer
                          and invoice identifiers. Uploaded files store the
                          mapped source-row ID; choose a nonpersonal row
                          identifier. This approval covers the displayed mapping
                          and exact rows.
                        </p>
                        <div className="business-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Quantity</th>
                                <th>Source row</th>
                              </tr>
                            </thead>
                            <tbody>
                              {state.approval.plan.rows.map((r: Obj) => (
                                <tr key={r.receipt}>
                                  <td>{r.name}</td>
                                  <td>{r.sku}</td>
                                  <td>{r.quantity}</td>
                                  <td>{r.receipt}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() =>
                            void act({
                              type: "commit_import",
                              action_hash: state.approval.hash,
                            })
                          }
                        >
                          Approve this exact import
                        </button>
                      </div>
                    )}
                    <div className="balance-strip">
                      <div>
                        <small>Rows in your local ledger</small>
                        <strong>{state.ledger.length}</strong>
                      </div>
                      <div>
                        <small>Sales units recorded</small>
                        <strong>
                          {state.ledger.reduce(
                            (n: number, r: Obj) => n + r.quantity,
                            0,
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>Catalog SKUs</small>
                        <strong>{Object.keys(state.catalog).length}</strong>
                      </div>
                    </div>
                    {state.last_result && (
                      <div className="business-outcome">
                        <strong>
                          {state.last_result.replayed
                            ? "Repeated batch recognized"
                            : "Import saved"}
                        </strong>
                        <p>
                          {state.last_result.new_rows} new rows /{" "}
                          {state.last_result.new_units} new units.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {slug === "economybreaker" && (
                  <>
                    <div className="recipe-banner">
                      <span className="eyebrow">
                        REAL RECIPE FACT / PINNED OPEN-SOURCE GAME
                      </span>
                      <h3>
                        {state.recipe.input_units} {state.recipe.input}s →{" "}
                        {state.recipe.output_units}{" "}
                        {state.recipe.name.toLowerCase()}
                      </h3>
                      <p>
                        Two fictional players share an economy worth{" "}
                        {state.initial_value} ingot-equivalents. Requests are
                        handled in locked database transactions.
                      </p>
                    </div>
                    <div className="balance-strip">
                      <div>
                        <small>Your ingots</small>
                        <strong>{state.ingots}</strong>
                      </div>
                      <div>
                        <small>Your crafted blocks</small>
                        <strong>{state.blocks}</strong>
                      </div>
                      <div>
                        <small>Teammate’s blocks</small>
                        <strong>{state.teammate_blocks}</strong>
                      </div>
                    </div>
                    <div className="business-actions">
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={async () => {
                          if (!current) return;
                          setBusy(true);
                          setError("");
                          try {
                            await Promise.all([
                              request(slug, "/" + current.id + "/action", {
                                type: "craft",
                                operation_id: crypto.randomUUID(),
                              }),
                              request(slug, "/" + current.id + "/action", {
                                type: "craft",
                                operation_id: crypto.randomUUID(),
                              }),
                            ]);
                            setCurrent(await request(slug, "/" + current.id));
                          } catch (e) {
                            setError((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Send two crafting requests together
                      </button>
                      <button
                        className="button"
                        disabled={busy || !state.last_receipt}
                        onClick={() =>
                          void act({
                            type:
                              state.receipts[state.last_receipt]?.type ||
                              "craft",
                            operation_id: state.last_receipt,
                          })
                        }
                      >
                        Retry the last receipt
                      </button>
                      <button
                        className="button"
                        disabled={busy || state.blocks < 1}
                        onClick={() =>
                          void act({
                            type: "transfer",
                            operation_id: crypto.randomUUID(),
                          })
                        }
                      >
                        Send a block to the teammate
                      </button>
                    </div>
                    {state.last_result && (
                      <div className="business-outcome">
                        <strong>
                          {state.last_result.replayed
                            ? "Request already handled"
                            : state.last_result.message}
                        </strong>
                        <p>
                          Conserved inventory value: {state.last_result.value}{" "}
                          ingot-equivalents. No new value was created.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <details className="activity-receipts">
                  <summary>Saved actions · {current.events.length}</summary>
                  {current.events
                    .slice()
                    .reverse()
                    .map((e: Obj) => (
                      <p key={e.id}>
                        <b>{e.message}</b>
                        <small>{new Date(e.at).toLocaleString()}</small>
                      </p>
                    ))}
                </details>
              </>
            )}
            {catalog && (
              <DataSource data={current?.source || catalog.dataset} />
            )}
          </section>
          <section className="plain-explainer">
            <h2>What is this used for?</h2>
            <p>{copy.problem}</p>
            <h3>A concrete example</h3>
            <p>{copy.example}</p>
            <ol>
              {copy.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <h3>What does the AI actually do?</h3>
            <p>{copy.agent}</p>
            <p>
              The controls above perform deterministic local application
              actions. Choose “Agent & verification workbench” to run the
              bounded AI investigator against its supported controlled fixtures.
              Those experiments are separate from this practical workspace.
            </p>
          </section>
        </div>
        <aside className="purpose-sidebar">
          <BookOpen size={23} />
          <h2>
            Understand it first.
            <br />
            Inspect the engineering next.
          </h2>
          <p>
            The main page shows the problem and a practical workflow. Agent
            decisions, seeded failures, run traces and infrastructure settings
            live in the workbench.
          </p>
          <button className="button" onClick={openTechnical}>
            Agent & verification workbench <ArrowRight size={15} />
          </button>
          <div>
            <ShieldCheck size={18} />
            <p>
              Public source facts, locally saved actions, explicit boundaries.
              No changes are sent to the source provider.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
