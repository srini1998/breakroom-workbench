import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  ShieldCheck,
  Radio,
  ScanLine,
  FileInput,
  Boxes,
  ArrowUpRight,
  Plus,
  Play,
  ChevronRight,
  ChevronDown,
  Download,
  RotateCcw,
  Square,
  Check,
  AlertTriangle,
  Folder,
  LogOut,
  Database,
  Terminal,
  Clock,
} from "lucide-react";
import "./style.css";
import { products } from "./products.ts";
import ProductFit from "./ProductFit.tsx";
import ProductExperience from "./ProductExperience.tsx";
import Switchboard from "./Switchboard.tsx";
import HomePage from "./HomePage.tsx";
import ProductPage from "./ProductPage.tsx";
import ResultPlayground from "./ResultPlayground.tsx";
import "./breakroom.css";
type Obj = Record<string, any>;
const names = [
  "AccessProof",
  "EventMedic",
  "ErasureCheck",
  "ImportRescue",
  "EconomyBreaker",
];
const icons = [ShieldCheck, Radio, ScanLine, FileInput, Boxes];
const subtitles = [
  "Permission boundaries",
  "Event recovery",
  "Resource erasure",
  "Supplier imports",
  "Inventory conservation",
];
async function api(path: string, body?: unknown) {
  const r = await fetch("/api" + path, {
    credentials: "same-origin",
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Request failed");
  return data;
}
const short = (s: string) => s?.slice(0, 8);
const display = (s: string) => s.replaceAll("_", " ");
function Status({ value }: { value: string }) {
  return (
    <span className={"status " + value}>
      {["pass", "completed"].includes(value) ? (
        <Check size={12} />
      ) : ["fail", "failed", "unsupported"].includes(value) ? (
        <AlertTriangle size={12} />
      ) : (
        <Clock size={12} />
      )}{" "}
      {display(value)}
    </span>
  );
}
export default function App() {
  const [path, setPath] = useState(location.pathname);
  const isHome = path === "/";
  const isFit = path === "/product-fit";
  const isSwitch = path.startsWith("/switchboard");
  const routeProduct = products.find((p) => path.split("/")[1] === p.slug);
  function navigate(url: string) {
    history.pushState({}, "", url);
    setPath(url);
    window.scrollTo(0, 0);
  }
  const [health, setHealth] = useState<Obj | null>(null),
    [data, setData] = useState<Obj | null>(null),
    [error, setError] = useState(""),
    [module, setModule] = useState(
      products.find((p) => location.pathname.split("/")[1] === p.slug)?.name ||
        "AccessProof",
    ),
    [workspace, setWorkspace] = useState(""),
    [project, setProject] = useState(""),
    [tab, setTab] = useState("Overview"),
    [scenario, setScenario] = useState("clean"),
    [mode, setMode] = useState("baseline"),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [detail, setDetail] = useState<Obj | null>(null),
    [showNew, setShowNew] = useState(false),
    [newName, setNewName] = useState(""),
    [identity, setIdentity] = useState("alice"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  useEffect(() => {
    const pop = () => setPath(location.pathname);
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!routeProduct) return;
    setModule(routeProduct.name);
    const parts = path.split("/");
    setTab(
      parts[2] === "runs"
        ? "Evidence"
        : parts[2] === "workbench"
          ? "Workbench"
          : parts[2] === "history"
            ? "Run history"
            : parts[2] === "environment"
              ? "Environment"
              : "Overview",
    );
    setSelected(parts[2] === "runs" ? parts[3] || "" : "");
    setDetail(null);
    document.title = routeProduct.name + " · Breakroom";
  }, [path]);
  const refresh = useCallback(async () => {
    try {
      const d = await api("/bootstrap");
      setData(d);
      setWorkspace((w) => w || d.workspaces[0]?.id || "");
      setProject((p) => p || d.projects[0]?.id || "");
    } catch (e) {
      if (
        (e as Error).message.includes("Sign in") ||
        (e as Error).message.includes("Session")
      )
        setData(null);
      else setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    api("/health")
      .then(setHealth)
      .catch((e) => setError(e.message));
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => {
      void refresh();
      if (selected)
        api("/runs/" + selected)
          .then(receiveDetail)
          .catch((e) => setError(e.message));
    }, 1500);
    return () => clearInterval(timer);
  }, [Boolean(data), selected, refresh]);
  useEffect(() => {
    setScenario(data?.contracts[module]?.scenarios[0] || "clean");
  }, [module, Boolean(data)]);
  async function action(fn: () => Promise<void>) {
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
  function receiveDetail(value: Obj) {
    if (location.pathname.split("/")[3] !== value.run.id) return;
    setDetail(value);
    setProject(value.run.project_id);
    setWorkspace(value.run.workspace_id);
  }
  async function openRun(id: string) {
    navigate("/" + (routeProduct?.slug || "accessproof") + "/runs/" + id);
    setSelected(id);
    receiveDetail(await api("/runs/" + id));
    setTab("Evidence");
  }
  useEffect(() => {
    if (selected && data)
      api("/runs/" + selected)
        .then(receiveDetail)
        .catch((e) => setError(e.message));
  }, [selected, Boolean(data)]);
  function changeTab(t: string) {
    if (t === "Evidence") {
      setTab(t);
      return;
    }
    navigate(
      "/" +
        routeProduct?.slug +
        (t === "Workbench"
          ? "/workbench"
          : t === "Run history"
            ? "/history"
            : t === "Environment"
              ? "/environment"
              : ""),
    );
  }
  async function startRun(config: Obj = {}) {
    await action(async () => {
      const r = await api("/runs", {
        project_id: project,
        module,
        scenario,
        mode,
        ...config,
      });
      await refresh();
      await openRun(r.id);
    });
  }
  const contract = data?.contracts[module],
    runs = (data?.runs || []).filter(
      (r: Obj) =>
        r.spec.supported_parameters.module === module &&
        r.project_id === project,
    ),
    projects = (data?.projects || []).filter(
      (p: Obj) => p.workspace_id === workspace,
    ),
    completed = runs.filter((r: Obj) => r.status === "completed"),
    findings = completed.filter((r: Obj) => r.verdict?.result === "fail");
  const Icon = icons[names.indexOf(module)];
  if (!data)
    return (
      <div className="login-shell">
        <div className="login-brand">
          <span className="brandmark">b.</span> Breakroom
          <span className="muted"> / reliability workbench</span>
        </div>
        <section className="login">
          <div className="eyebrow">LOCAL VERIFICATION SUITE</div>
          <h1>
            Find the weird.
            <br />
            Prove the fix.
          </h1>
          <p>
            Break it safely. Watch what happens.
            <br />
            Six ways to test your application’s assumptions.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                await api(
                  "/login",
                  health?.auth_mode === "local fixture identities" ||
                    health?.demo_auth
                    ? { identity }
                    : { email, password },
                );
                await refresh();
              });
            }}
          >
            <h2>Open your workbench</h2>
            {health?.auth_mode === "local fixture identities" ||
            health?.demo_auth ? (
              <>
                <label>
                  Synthetic test account
                  <select
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                  >
                    <option value="alice">
                      Northstar owner · Alice (test user)
                    </option>
                    <option value="bob">Control owner · Bob (test user)</option>
                  </select>
                </label>
                <p className="small">
                  {health?.demo_auth
                    ? "Alice and Bob are fictional test identities in real local Supabase Auth. Switching accounts tests that each workspace stays isolated."
                    : "Local fixture authentication; Supabase Auth is not connected."}
                </p>
              </>
            ) : (
              <>
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
              </>
            )}
            <button className="primary" disabled={busy || !health?.database}>
              Enter workspace <ArrowUpRight size={16} />
            </button>
            {health && !health.database && (
              <p role="alert">
                Database unavailable. Run npm run local:db and npm run setup.
              </p>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        </section>
        <div className="login-footer">
          Breakroom / Controlled local fixtures / No production targets
        </div>
      </div>
    );
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="logo"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
          aria-label="Breakroom home"
        >
          <span className="brandmark">b.</span>Breakroom
          <span className="logo-label">WORKBENCH</span>
        </a>
        <label className="workspace-label">
          Workspace
          <select
            aria-label="Workspace"
            value={workspace}
            onChange={(e) => {
              setWorkspace(e.target.value);
              setProject(
                data.projects.find(
                  (p: Obj) => p.workspace_id === e.target.value,
                )?.id || "",
              );
              setSelected("");
            }}
          >
            {data.workspaces.map((w: Obj) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <div className="nav-label">
          VERIFICATION PRODUCTS <span>06</span>
        </div>
        <nav>
          <a
            className={"nav-item hub-link " + (isHome ? "active" : "")}
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            <Folder size={18} />
            <span>
              All products<small>Reliability workbench</small>
            </span>
          </a>
          {names.map((name, i) => {
            const NavIcon = icons[i];
            return (
              <a
                href={"/" + products[i].slug}
                className={
                  "nav-item " +
                  (!isHome && !isSwitch && !isFit && module === name
                    ? "active"
                    : "")
                }
                key={name}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/" + products[i].slug);
                }}
              >
                <NavIcon size={18} />
                <span>
                  {name}
                  <small>{subtitles[i]}</small>
                </span>
                {!isHome && !isSwitch && !isFit && module === name && (
                  <ChevronRight size={14} />
                )}
              </a>
            );
          })}
          <a
            className={"nav-item " + (isSwitch ? "active" : "")}
            href="/switchboard"
            onClick={(e) => {
              e.preventDefault();
              navigate("/switchboard");
            }}
          >
            <Radio size={18} />
            <span>
              Switchboard<small>Realtime transition</small>
            </span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-info">
            <Database size={16} />
            <div>
              Local environment
              <small>
                {health?.database
                  ? "Supabase Postgres connected"
                  : "Database unavailable"}
              </small>
            </div>
          </div>
          <p>
            Results apply to the named fixture set. Review scope before drawing
            conclusions.
          </p>
          <button
            className="text-button"
            onClick={() =>
              void action(async () => {
                await api("/logout", {});
                setData(null);
              })
            }
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Projects</span>
            <ChevronRight size={12} />
            <select
              aria-label="Project"
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
                if (isSwitch) navigate("/switchboard");
                setSelected("");
                setDetail(null);
              }}
            >
              {projects.map((p: Obj) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronRight size={12} />
            <strong>
              {isHome
                ? "All products"
                : isSwitch
                  ? "Switchboard"
                  : isFit
                    ? "Product fit"
                    : module}
            </strong>
          </div>
          <button className="button subtle" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New project
          </button>
        </header>
        <main id="main-content">
          {isHome ? (
            <HomePage
              navigate={navigate}
              storageAvailable={Boolean(health?.storage_configured)}
            />
          ) : isFit ? (
            <ProductFit />
          ) : isSwitch ? (
            <Switchboard
              project={project}
              path={path}
              navigate={navigate}
              onProject={setProject}
            />
          ) : !routeProduct ? (
            <div className="empty-state">
              <h1>Page not found</h1>
              <a href="/" className="button">
                Open all products
              </a>
            </div>
          ) : (
            <>
              {tab !== "Overview" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="module-meta">
                        <Icon size={18} />
                        {subtitles[names.indexOf(module)]}
                      </div>
                      <h1>
                        {module}
                        <span className="scope-tag">LOCAL FIXTURES</span>
                      </h1>
                      <p>{contract?.purpose}</p>
                    </div>
                    <div className="environment-tag">
                      <span className="connection" /> Development environment
                    </div>
                  </div>
                </>
              )}
              <div
                className={
                  "tabs " + (tab === "Overview" ? "hidden-technical-tabs" : "")
                }
                role="tablist"
                aria-label="Module view"
              >
                {[
                  "Overview",
                  "Workbench",
                  "Run history",
                  "Evidence",
                  "Environment",
                ].map((t) => (
                  <button
                    role="tab"
                    aria-selected={tab === t}
                    className={tab === t ? "chosen" : ""}
                    key={t}
                    onClick={() => changeTab(t)}
                  >
                    {t}
                    {t === "Run history" && <span>{runs.length}</span>}
                  </button>
                ))}
              </div>
              {error && (
                <div className="error-banner" role="alert">
                  <AlertTriangle size={16} />
                  {error}
                  <button onClick={() => setError("")}>Dismiss</button>
                </div>
              )}
              {tab === "Overview" && (
                <ProductExperience
                  slug={routeProduct.slug}
                  project={project}
                  openTechnical={() => changeTab("Workbench")}
                />
              )}
              {tab === "Workbench" && (
                <>
                  <ProductPage
                    name={module}
                    onImport={(source) =>
                      void startRun({
                        import_source: source,
                        scenario: "supplier-a",
                      })
                    }
                    scenario={scenario}
                    onScenario={setScenario}
                  />
                  <section className="overview-intro">
                    <div className="experiment-config">
                      <div className="section-title">
                        <span className="square-icon">
                          <Play size={18} />
                        </span>
                        <div>
                          <h2>Start an investigation</h2>
                          <p>
                            A bounded experiment against a disposable fixture.
                          </p>
                        </div>
                      </div>
                      <div className="form-grid">
                        <label>
                          Fixture scenario
                          <select
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                          >
                            {contract?.scenarios.map((s: string) => (
                              <option value={s} key={s}>
                                {display(s)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Investigation mode
                          <select
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                          >
                            <option value="baseline">
                              Deterministic baseline
                            </option>
                            <option
                              value="live"
                              disabled={!health?.model_configured}
                            >
                              Live model
                              {!health?.model_configured
                                ? " · setup required"
                                : ""}
                            </option>
                          </select>
                        </label>
                      </div>
                      <div className="config-foot">
                        <span>
                          <Clock size={14} /> 16 steps max · 120s deadline
                        </span>
                        <button
                          className="primary"
                          disabled={busy || !project}
                          onClick={() => void startRun()}
                        >
                          <Play size={14} /> Run investigation
                        </button>
                      </div>
                      {module === "ErasureCheck" &&
                        !health?.storage_configured && (
                          <div className="notice">
                            <AlertTriangle size={16} />
                            <div>
                              Storage verification unavailable
                              <p>
                                A real local Supabase Storage service is
                                required. Runs record an unsupported verdict
                                until configured.
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                    <div className="contract-preview">
                      <div className="eyebrow">THE DECLARED CONTRACT</div>
                      <h2>What should hold true</h2>
                      <ul>
                        {contract?.invariants
                          .slice(0, 4)
                          .map((x: string, i: number) => (
                            <li key={x}>
                              <span>{String(i + 1).padStart(2, "0")}</span>
                              {x}
                            </li>
                          ))}
                      </ul>
                      <details>
                        <summary>
                          View complete scope & resources{" "}
                          <ChevronDown size={13} />
                        </summary>
                        <p>{contract?.resources.join(" · ")}</p>
                        {contract?.invariants.slice(4).map((x: string) => (
                          <p key={x}>{x}</p>
                        ))}
                      </details>
                    </div>
                  </section>
                  <div className="stats">
                    <div>
                      <span>Recent experiments</span>
                      <strong>{runs.length}</strong>
                      <small>This project & product</small>
                    </div>
                    <div>
                      <span>Completed</span>
                      <strong>{completed.length}</strong>
                      <small>Execution finished</small>
                    </div>
                    <div>
                      <span>Defect runs</span>
                      <strong className={findings.length ? "warning-text" : ""}>
                        {findings.length}
                      </strong>
                      <small>Seeded behavior reproduced</small>
                    </div>
                    <div>
                      <span>Evidence source</span>
                      <strong className="text-stat">Local sandbox</strong>
                      <small>Fresh baseline, live, or labeled replay</small>
                    </div>
                  </div>
                  <RunTable
                    runs={runs.slice(0, 6)}
                    open={(id) => void action(() => openRun(id))}
                    title="Recent investigations"
                    emptyAction={() => void startRun()}
                  />
                  <div className="scope-note">
                    <ShieldCheck size={17} />
                    <p>
                      <strong>Evidence has boundaries.</strong> These are
                      controlled fixture experiments. A passing run covers the
                      tested paths; it does not establish universal security or
                      production readiness.
                    </p>
                  </div>
                </>
              )}
              {tab === "Run history" && (
                <RunTable
                  runs={runs}
                  open={(id) => void action(() => openRun(id))}
                  title="Investigation history"
                  emptyAction={() => void startRun()}
                />
              )}
              {tab === "Evidence" &&
                (!detail ? (
                  <div className="empty-state">
                    <FileInput size={30} />
                    <h2>No investigation selected</h2>
                    <p>
                      Open a run to inspect its decisions, observed behavior,
                      and reproducible evidence.
                    </p>
                    <button
                      className="button"
                      onClick={() => changeTab("Run history")}
                    >
                      Browse run history
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="evidence-heading">
                      <div>
                        <div className="eyebrow">
                          RUN {short(detail.run.id)}
                        </div>
                        <h2>
                          {detail.run.spec.supported_parameters.import_source
                            ? "Uploaded CSV"
                            : display(
                                detail.run.spec.supported_parameters.scenario,
                              )}{" "}
                          <Status value={detail.run.status} />
                        </h2>
                        <p>
                          {detail.run.spec.supported_parameters.mode} ·{" "}
                          {new Date(detail.run.created_at).toLocaleString()} ·
                          fixture seed {detail.run.spec.seed}
                        </p>
                      </div>
                      <div className="actions">
                        <a
                          className="button"
                          href={"/api/runs/" + selected + "/export"}
                        >
                          <Download size={14} /> Export JSON
                        </a>
                        {["queued", "running"].includes(detail.run.status) ? (
                          <button
                            className="button"
                            onClick={() =>
                              void action(async () => {
                                await api("/runs/" + selected + "/cancel", {});
                              })
                            }
                          >
                            <Square size={13} /> Cancel
                          </button>
                        ) : (
                          <>
                            <button
                              className="button"
                              onClick={() =>
                                void startRun({
                                  scenario:
                                    detail.run.spec.supported_parameters
                                      .scenario,
                                  mode: "replay",
                                  parent_id: selected,
                                })
                              }
                            >
                              <RotateCcw size={14} /> Replay
                            </button>
                            <button
                              className="primary"
                              onClick={() =>
                                void startRun({
                                  scenario: contract.scenarios[0],
                                  mode: "baseline",
                                  parent_id: selected,
                                })
                              }
                            >
                              {module === "ImportRescue"
                                ? "Run supported fixture"
                                : module === "EventMedic"
                                  ? "Compare ordered stream"
                                  : "Run corrected candidate"}{" "}
                              <ArrowUpRight size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {detail.run.parent_id && (
                      <div className="notice">
                        <RotateCcw size={16} />
                        <div>
                          Lineage:{" "}
                          {detail.run.spec.supported_parameters.mode ===
                          "replay"
                            ? "Saved evidence replay"
                            : "Candidate comparison"}
                          <p>
                            Source run{" "}
                            <button
                              className="inline-link"
                              onClick={() =>
                                void action(() => openRun(detail.run.parent_id))
                              }
                            >
                              {short(detail.run.parent_id)}
                            </button>
                            .{" "}
                            {detail.run.spec.supported_parameters.mode ===
                            "replay"
                              ? "This is not a fresh experiment."
                              : "Both runs retain their own evidence."}
                          </p>
                        </div>
                      </div>
                    )}
                    <ResultPlayground detail={detail} />
                    <section className="verdict-panel">
                      <div>
                        <span className="eyebrow">DETERMINISTIC VERDICT</span>
                        <h3>
                          {detail.run.verdict ? (
                            <Status value={detail.run.verdict.result} />
                          ) : (
                            <Status value={detail.run.status} />
                          )}
                        </h3>
                      </div>
                      <div>
                        <p>
                          {detail.run.verdict?.reasons?.join(" ") ||
                            "Waiting for the worker to record and evaluate tool evidence."}
                        </p>
                        <small>
                          {detail.run.verdict?.scope ||
                            "Start the dedicated worker with npm run worker."}
                        </small>
                      </div>
                    </section>
                    {detail.approvals.map((a: Obj) => (
                      <section className="approval" key={a.id}>
                        <div className="section-title">
                          <AlertTriangle size={18} />
                          <div>
                            <h2>
                              {a.consumed_at
                                ? "Approved action executed"
                                : "Review exact action plan"}
                            </h2>
                            <p>
                              {a.plan.module === "ErasureCheck"
                                ? "Scoped cleanup of seeded owned resources."
                                : "Commit staged stock changes only after mapping review."}
                            </p>
                          </div>
                        </div>
                        {a.plan.staged && (
                          <table>
                            <thead>
                              <tr>
                                <th>Catalog part</th>
                                <th>Stock change</th>
                                <th>Receipt evidence</th>
                              </tr>
                            </thead>
                            <tbody>
                              {a.plan.staged.map((r: Obj) => (
                                <tr key={r.receipt}>
                                  <td>{r.sku}</td>
                                  <td>+{r.units} units</td>
                                  <td>{r.receipt}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {a.plan.delete && (
                          <p>
                            Delete: {a.plan.delete.join(", ")}
                            <br />
                            Preserve: {a.plan.preserve.join(", ")}
                          </p>
                        )}
                        <details>
                          <summary>Inspect mapping, hashes & scope</summary>
                          <pre>{JSON.stringify(a.plan, null, 2)}</pre>
                        </details>
                        <div className="approval-foot">
                          <code>
                            {short(a.action_hash)} · expires{" "}
                            {new Date(a.expires_at).toLocaleTimeString()}
                          </code>
                          {!a.consumed_at && (
                            <button
                              className="primary"
                              disabled={
                                busy ||
                                Boolean(a.approved_at) ||
                                new Date(a.expires_at).getTime() < Date.now()
                              }
                              onClick={() =>
                                void action(async () => {
                                  await api("/runs/" + selected + "/approve", {
                                    approval_id: a.id,
                                    action_hash: a.action_hash,
                                  });
                                  setDetail(await api("/runs/" + selected));
                                })
                              }
                            >
                              <Check size={14} />
                              {a.approved_at
                                ? "Approved · awaiting worker"
                                : "Approve this exact plan"}
                            </button>
                          )}
                        </div>
                      </section>
                    ))}
                    <section className="evidence-list">
                      <div className="table-heading">
                        <h2>
                          Evidence trail <span>{detail.tool_calls.length}</span>
                        </h2>
                        <span>Persisted observations · content hashed</span>
                      </div>
                      {!detail.tool_calls.length ? (
                        <div className="empty-state compact">
                          <Activity size={24} />
                          <h3>Awaiting the first observation</h3>
                          <p>Queued runs require the dedicated worker.</p>
                        </div>
                      ) : (
                        detail.tool_calls.map((call: Obj, i: number) => {
                          const obs = call.result.structured_observations;
                          const step = detail.steps.find(
                            (s: Obj) => s.id === call.step_id,
                          );
                          return (
                            <details
                              className="evidence-row"
                              key={call.id}
                              open={
                                obs.passed === false ||
                                call.result.status !== "ok"
                              }
                            >
                              <summary>
                                <span className="step-number">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                <div>
                                  <strong>{display(call.action.tool)}</strong>
                                  <small>{step?.decision_summary}</small>
                                </div>
                                <Status
                                  value={
                                    call.result.status === "ok"
                                      ? obs.passed === false
                                        ? "fail"
                                        : "completed"
                                      : call.result.status
                                  }
                                />
                                <ChevronDown size={14} />
                              </summary>
                              <div className="evidence-content">
                                {obs.error && (
                                  <p className="error">{obs.error}</p>
                                )}
                                {obs.identity && (
                                  <div className="observation-grid">
                                    <div>
                                      Identity<strong>{obs.identity}</strong>
                                    </div>
                                    <div>
                                      Expected permission
                                      <strong>{String(obs.expected)}</strong>
                                    </div>
                                    <div>
                                      Observed permission
                                      <strong>{String(obs.actual)}</strong>
                                    </div>
                                  </div>
                                )}
                                <pre>{JSON.stringify(obs, null, 2)}</pre>
                                <small>
                                  Evidence{" "}
                                  {call.result.evidence_refs
                                    .map((r: Obj) => r.id)
                                    .join(", ")}{" "}
                                  ·{" "}
                                  {new Date(
                                    call.result.observed_at,
                                  ).toLocaleTimeString()}
                                </small>
                              </div>
                            </details>
                          );
                        })
                      )}
                    </section>
                    <details className="technical">
                      <summary>
                        <Terminal size={14} /> Technical view: configuration and
                        scope
                      </summary>
                      <pre>
                        {JSON.stringify(
                          {
                            spec: detail.run.spec,
                            config_hash: detail.run.config_hash,
                            verdict: detail.run.verdict,
                            findings: detail.findings,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </>
                ))}
              {tab === "Environment" && (
                <section className="environment-panel">
                  <h2>Connected local services</h2>
                  <p>
                    Service availability is reported independently from domain
                    verdicts.
                  </p>
                  {[
                    [
                      "Control database",
                      health?.database
                        ? "Connected · " + health?.database_provider
                        : "Unavailable",
                    ],
                    ["Authentication", health?.auth_mode],
                    [
                      "Target Storage",
                      health?.storage_configured
                        ? "Configured · verified only by a successful run"
                        : "Unavailable · real Supabase stack required",
                    ],
                    [
                      "Live model",
                      health?.model_configured
                        ? "Configured · inspect inference evidence in each live run"
                        : "Unavailable · set MODEL_NAME and MODEL_BASE_URL",
                    ],
                    ["Target boundary", "Loopback databases and Storage only"],
                  ].map(([key, value]) => (
                    <div className="environment-row" key={key}>
                      <strong>{key}</strong>
                      <span>{value}</span>
                    </div>
                  ))}
                  <details open>
                    <summary>Local startup</summary>
                    <pre>
                      npm run local:db{"\n"}npm run setup{"\n"}npm run dev{"\n"}
                      # In a separate terminal{"\n"}npm run worker
                    </pre>
                  </details>
                  <p className="small">
                    Real Supabase services: install a Docker-compatible runtime,
                    run npm run services, and follow README.md to configure the
                    separate target. No cloud or production resources are
                    required.
                  </p>
                </section>
              )}
            </>
          )}
          <footer>
            BREAKROOM <span>Reliability is a behavior you can reproduce.</span>
            <span>Local verification / seed 17</span>
          </footer>
        </main>
      </div>
      {showNew && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                const p = await api("/projects", {
                  workspace_id: workspace,
                  name: newName,
                });
                await refresh();
                setProject(p.id);
                if (isSwitch) navigate("/switchboard");
                setShowNew(false);
                setNewName("");
              });
            }}
          >
            <h2 id="new-project-title">Create a project</h2>
            <p>Group experiments and evidence in this workspace.</p>
            <label>
              Project name
              <input
                autoFocus
                maxLength={80}
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <div className="actions">
              <button
                type="button"
                className="button"
                onClick={() => setShowNew(false)}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                Create project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
function RunTable({
  runs,
  open,
  title,
  emptyAction,
}: {
  runs: Obj[];
  open: (id: string) => void;
  title: string;
  emptyAction: () => void;
}) {
  return (
    <section className="run-table">
      <div className="table-heading">
        <h2>{title}</h2>
        <span>{runs.length} recorded runs</span>
      </div>
      {!runs.length ? (
        <div className="empty-state">
          <div className="empty-symbol">
            <Activity size={25} />
          </div>
          <h3>Your first piece of evidence starts here.</h3>
          <p>
            Run a controlled investigation to see what holds, what breaks, and
            why.
          </p>
          <button className="text-button" onClick={emptyAction}>
            Start an investigation <ArrowUpRight size={14} />
          </button>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Investigation</th>
                <th>Mode</th>
                <th>Execution</th>
                <th>Verdict</th>
                <th>Started</th>
                <th>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button className="run-link" onClick={() => open(r.id)}>
                      {r.spec.supported_parameters.import_source
                        ? "Uploaded CSV"
                        : display(r.spec.supported_parameters.scenario)}
                      <small>{short(r.id)}</small>
                    </button>
                  </td>
                  <td>{r.spec.supported_parameters.mode}</td>
                  <td>
                    <Status value={r.status} />
                  </td>
                  <td>
                    {r.verdict ? (
                      <Status value={r.verdict.result} />
                    ) : (
                      <span className="muted">Pending</span>
                    )}
                  </td>
                  <td className="muted">
                    {new Date(r.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={"Inspect run " + short(r.id)}
                      onClick={() => open(r.id)}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
