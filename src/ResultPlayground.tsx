import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  ArrowRight,
  LockKeyhole,
  UnlockKeyhole,
  UserRound,
  Building2,
  FileText,
  Package,
  Boxes,
  Check,
  X,
  ShieldCheck,
  Radio,
  ScanLine,
  FileInput,
  GitBranch,
} from "lucide-react";
type Item = Record<string, any>;
function Metric({
  label,
  value,
  good,
}: {
  label: string;
  value: any;
  good?: boolean;
}) {
  return (
    <div
      className={
        "scene-metric " +
        (good === false ? "metric-bad" : good ? "metric-good" : "")
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
export default function ResultPlayground({ detail }: { detail: Item }) {
  const calls = detail.tool_calls.filter(
    (c: Item) => c.action.tool !== "inspect_contract",
  );
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [variant, setVariant] = useState(0);
  useEffect(() => {
    const failure = calls.findIndex(
      (c: Item) => c.result.structured_observations.passed === false,
    );
    setIndex(failure >= 0 ? failure : Math.max(0, calls.length - 1));
    setPlaying(false);
    setVariant(0);
  }, [detail.run.id, calls.length]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setIndex((i) => {
          if (i >= calls.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        }),
      950,
    );
    return () => clearInterval(timer);
  }, [playing, calls.length]);
  const call = calls[Math.min(index, calls.length - 1)],
    obs = call?.result.structured_observations || {},
    module = detail.run.spec.supported_parameters.module;
  const sceneTitles: Item = {
    AccessProof: "Who got through the boundary?",
    EventMedic: "Follow the delivery trail.",
    ErasureCheck: "Did anything come back?",
    ImportRescue: "Follow the units into stock.",
    EconomyBreaker: "One item. Two requests. What happened?",
  };
  return (
    <section
      className={"playground " + module.toLowerCase()}
      aria-label="Visual investigation result"
    >
      <div className="playground-heading">
        <div>
          <span className="scene-eyebrow">
            THE EXPERIMENT / {detail.run.spec.supported_parameters.mode}
          </span>
          <h2>{sceneTitles[module]}</h2>
        </div>
        <span className="scene-source">
          <GitBranch size={13} /> Recorded database evidence
        </span>
      </div>
      {!call ? (
        <div className="scene-waiting">
          <Radio size={28} />
          <h3>Waiting for the first experiment.</h3>
          <p>The worker’s recorded observations will appear here.</p>
        </div>
      ) : (
        <>
          {obs.error ? (
            <div className="scene-waiting scene-error">
              <ScanLine size={35} />
              <h3>No domain result yet.</h3>
              <p>{obs.error}</p>
            </div>
          ) : module === "AccessProof" ? (
            <div className="access-scene">
              <div className="tenant-island">
                <Building2 size={26} />
                <span>Identity</span>
                <strong>{obs.identity || "Fixture user"}</strong>
                <div className="scene-avatar">
                  <UserRound size={30} />
                </div>
                <small>Authenticated session</small>
              </div>
              <div
                className={
                  "boundary " + (obs.passed === false ? "breached" : "held")
                }
              >
                <span>{obs.operation?.replaceAll("_", " ")}</span>
                <div className="boundary-line">
                  <span />
                  <div>
                    {obs.actual ? (
                      <UnlockKeyhole size={24} />
                    ) : (
                      <LockKeyhole size={24} />
                    )}
                  </div>
                  <span />
                </div>
                <strong>
                  {obs.actual ? "Access observed" : "Access denied"}
                </strong>
                <small>Contract: {obs.expected ? "allow" : "deny"}</small>
              </div>
              <div className="tenant-island target-island">
                <FileText size={26} />
                <span>Target resource</span>
                <strong>
                  {obs.operation === "attachment"
                    ? "Other tenant attachment"
                    : obs.operation === "unassigned"
                      ? "Unassigned project"
                      : obs.operation === "read_foreign"
                        ? "Other tenant project"
                        : "Application record"}
                </strong>
                <small>
                  {obs.passed === false
                    ? "Boundary violation reproduced"
                    : "Permission matched the contract"}
                </small>
              </div>
            </div>
          ) : module === "EventMedic" ? (
            <>
              <div className="event-rail">
                {(obs.ledger || []).map((e: Item) => {
                  const attempts = (obs.history || []).filter(
                    (h: Item) => h.event_id === e.id,
                  );
                  return (
                    <article key={e.id} className="event-ticket">
                      <span>DELIVERY {e.id}</span>
                      <Radio size={23} />
                      <strong>{e.kind}</strong>
                      <code>{e.operation_id}</code>
                      <small>{attempts.length} recorded attempts</small>
                      {e.dependency && <em>Needs {e.dependency}</em>}
                    </article>
                  );
                })}
              </div>
              <div className="scene-metrics">
                <Metric
                  label="Available stock"
                  value={obs.actual?.available}
                  good={obs.actual?.available === obs.expected?.available}
                />
                <Metric
                  label="Outstanding rentals"
                  value={obs.actual?.outstanding}
                  good={obs.actual?.outstanding === 0}
                />
                <Metric
                  label="Business effects"
                  value={obs.actual?.operations}
                  good={obs.actual?.operations === 2}
                />
              </div>
              <div className="recovery-tape">
                {(obs.history || []).map((h: Item, i: number) => (
                  <span
                    key={h.id || i}
                    className={
                      h.outcome === "waiting_dependency" ? "waiting" : ""
                    }
                  >
                    {h.outcome === "committed" ? (
                      <Check size={12} />
                    ) : (
                      <Radio size={12} />
                    )}{" "}
                    {h.outcome.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            </>
          ) : module === "ErasureCheck" ? (
            <>
              <div className="resource-constellation">
                {[
                  "Profile",
                  "Attachment blob",
                  "Derived export",
                  "Delayed export",
                  "Control tenant",
                  "Shared object",
                ].map((name, i) => {
                  const actual = obs.actual;
                  const preserved = i >= 4;
                  const present = actual
                    ? i === 0
                      ? actual.rows?.some((r: Item) => r.id === "profile")
                      : i === 1
                        ? actual.owned_objects?.some(
                            (o: Item) => o.name === "attachment.txt",
                          )
                        : i === 2
                          ? actual.rows?.some((r: Item) => r.id === "export")
                          : i === 3
                            ? actual.delayed !== "fenced"
                            : i === 4
                              ? actual.control_objects?.some(
                                  (o: Item) => o.name === "keep.txt",
                                )
                              : actual.shared_objects?.some(
                                  (o: Item) => o.name === "team.txt",
                                )
                    : true;
                  return (
                    <div
                      key={name}
                      className={
                        "resource-orb " +
                        (!actual
                          ? "planned"
                          : preserved
                            ? present
                              ? "preserved"
                              : "leftover"
                            : present
                              ? "leftover"
                              : "erased")
                      }
                    >
                      <span>
                        {i === 3 ? (
                          <LockKeyhole size={25} />
                        ) : i === 1 ? (
                          <Package size={25} />
                        ) : (
                          <FileText size={25} />
                        )}
                      </span>
                      <strong>{name}</strong>
                      <small>
                        {!actual
                          ? preserved
                            ? "Keep in cleanup plan"
                            : "Awaiting approved cleanup"
                          : preserved
                            ? present
                              ? "Preserved"
                              : "Missing control resource"
                            : i === 3
                              ? actual.delayed
                              : present
                                ? "Left behind"
                                : "Removed"}
                      </small>
                    </div>
                  );
                })}
              </div>
              <p className="scene-caption">
                {obs.actual
                  ? "The tombstone and delayed worker use the same account lock."
                  : "Review the exact scoped cleanup below. This graph shows the declared plan."}{" "}
                Shared resources and the other tenant’s content stay intact.
              </p>
            </>
          ) : module === "ImportRescue" ? (
            <>
              <div className="import-conveyor">
                <div className="supplier-file">
                  <FileInput size={36} />
                  <strong>Supplier file</strong>
                  <small>
                    {(obs.actual?.file || obs.plan?.file)?.split("\n").length -
                      1 || "Recorded"}{" "}
                    rows
                  </small>
                </div>
                <ArrowRight size={26} />
                <div className="conversion-machine">
                  <span>DECLARED PACK FACTS</span>
                  <Boxes size={33} />
                  <strong>
                    {obs.actual?.mapping?.unit === "box" ||
                    obs.plan?.mapping?.unit === "box"
                      ? "1 box = 6 each"
                      : "Validated unit conversion"}
                  </strong>
                  <small>
                    {obs.actual?.abstain
                      ? "Missing definition: abstain"
                      : obs.actual?.rejected
                        ? "Approval rejected"
                        : obs.committed
                          ? "Approved and committed"
                          : obs.actual?.errors?.length
                            ? "Whole batch rejected"
                            : "Staged for review"}
                  </small>
                </div>
                <ArrowRight size={26} />
                <div className="stock-shelf">
                  {(
                    obs.stock ||
                    obs.actual?.stock ||
                    obs.actual?.staged ||
                    obs.plan?.staged ||
                    []
                  ).map((r: Item) => (
                    <div key={r.sku}>
                      <Package size={22} />
                      <strong>{r.sku}</strong>
                      <b>{r.stock ?? "+" + r.units}</b>
                      <small>units</small>
                    </div>
                  ))}
                </div>
              </div>
              {obs.actual?.errors?.length > 0 && (
                <div className="scene-rejections">
                  {obs.actual.errors.map((e: string) => (
                    <p key={e}>
                      <X size={13} />
                      {e}
                    </p>
                  ))}
                </div>
              )}
              <p className="scene-caption">
                {obs.actual?.abstain
                  ? "The system refused to invent a missing conversion."
                  : obs.committed
                    ? "Stock changes and the unique batch receipt committed together."
                    : "Stock changes require an exact, unexpired approval. An invalid row rejects the entire batch."}
              </p>
            </>
          ) : module === "EconomyBreaker" ? (
            (() => {
              const experiments = obs.experiments || [];
              const experiment =
                experiments[Math.min(variant, experiments.length - 1)];
              return experiment ? (
                <>
                  <div
                    className="variant-switch"
                    aria-label="Observed implementation"
                  >
                    {experiments.map((e: Item, i: number) => (
                      <button
                        key={i}
                        className={i === variant ? "selected" : ""}
                        onClick={() => setVariant(i)}
                      >
                        {e.variant === "seeded"
                          ? "Seeded defect"
                          : "Correction"}{" "}
                        / {e.kind}
                      </button>
                    ))}
                  </div>
                  <div className="arena">
                    {experiment.state.map((r: Item) => (
                      <div
                        className={"inventory-player " + r.holder}
                        key={r.holder}
                      >
                        <div className="inventory-avatar">
                          {r.holder === "chest" ? (
                            <Boxes size={37} />
                          ) : (
                            <UserRound size={37} />
                          )}
                        </div>
                        <strong>
                          {r.holder === "chest"
                            ? "Shared chest"
                            : r.holder === "p1"
                              ? "Player one"
                              : "Player two"}
                        </strong>
                        <div className="inventory-items">
                          {Array.from(
                            { length: Math.min(r.ore, 8) },
                            (_, i) => (
                              <span
                                className="ore"
                                key={i}
                                aria-hidden="true"
                              />
                            ),
                          )}
                          {Array.from(
                            { length: Math.min(r.ingot, 8) },
                            (_, i) => (
                              <span
                                className="ingot"
                                key={i}
                                aria-hidden="true"
                              />
                            ),
                          )}
                        </div>
                        <small>
                          {r.ore} ore · {r.ingot} ingots
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="scene-metrics">
                    <Metric
                      label="Weighted material"
                      value={
                        experiment.invariants.weighted_material +
                        " / " +
                        experiment.invariants.expected_material
                      }
                      good={
                        experiment.invariants.weighted_material ===
                        experiment.invariants.expected_material
                      }
                    />
                    <Metric
                      label="Craft effects"
                      value={experiment.invariants.craft_effects}
                      good={
                        experiment.invariants.craft_effects ===
                        experiment.invariants.expected_craft_effects
                      }
                    />
                    <Metric
                      label="Invariant result"
                      value={experiment.passed ? "Holds" : "Broken"}
                      good={experiment.passed}
                    />
                  </div>
                  <div className="recovery-tape">
                    {experiment.trace.map((t: Item, i: number) => (
                      <span key={i}>
                        {i + 1}. {t.action} {t.player || ""}{" "}
                        {t.result?.replaceAll("_", " ") || ""}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p>No inventory state recorded yet.</p>
              );
            })()
          ) : null}
          {obs.experiments?.some((e: Item) => e.minimized_reproduction) && (
            <div className="minimized-trace">
              {obs.experiments
                .filter((e: Item) => e.minimized_reproduction)
                .map((e: Item) => (
                  <div key={e.kind}>
                    <GitBranch size={17} />
                    <div>
                      <strong>
                        Smallest supported reproduction:{" "}
                        {e.minimized_reproduction.action_count} action
                        {e.minimized_reproduction.action_count === 1 ? "" : "s"}
                      </strong>
                      <p>
                        {e.kind} · each shorter prefix was replayed against
                        actual database state. The correction{" "}
                        {e.minimized_reproduction.corrected_replay.passed
                          ? "preserved the invariant"
                          : "failed the replay"}{" "}
                        on this same minimized trace.
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
          <div className="playback-bar">
            <button
              aria-label={
                playing ? "Pause recorded steps" : "Play recorded steps"
              }
              className="playback-button"
              onClick={() => {
                if (index === calls.length - 1) setIndex(0);
                setPlaying((v) => !v);
              }}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button
              className="playback-reset"
              aria-label="First recorded step"
              onClick={() => {
                setPlaying(false);
                setIndex(0);
              }}
            >
              <SkipBack size={14} />
            </button>
            <label>
              Recorded step {index + 1} of {calls.length}
              <input
                aria-label="Recorded experiment step"
                type="range"
                min="0"
                max={Math.max(0, calls.length - 1)}
                value={index}
                onChange={(e) => {
                  setPlaying(false);
                  setIndex(Number(e.target.value));
                }}
              />
            </label>
            <span>
              {call.action.tool.replaceAll("_", " ")}
              <small>
                {call.result.evidence_refs[0]?.id.slice(0, 8)} · evidence
                reference
              </small>
            </span>
          </div>
        </>
      )}
    </section>
  );
}
