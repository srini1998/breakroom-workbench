import assert from "node:assert/strict";
import { hash } from "../server/contracts.ts";
import { writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:4310/api";
let cookie = "";
async function api(path: string, body?: unknown, status = 200) {
  const r = await fetch(base + path, {
    headers: { "Content-Type": "application/json", cookie },
    ...(body !== undefined
      ? { method: "POST", body: JSON.stringify(body) }
      : {}),
  });
  if (path === "/login") cookie = r.headers.get("set-cookie")!.split(";")[0];
  assert.equal(r.status, status, await r.clone().text());
  return r.json() as Promise<any>;
}
await api("/login", { identity: "alice" });
const project = (await api("/bootstrap")).projects[0].id;
const slug = process.argv[2] || "accessproof";
if (slug === "switchboard") {
  const d = await api("/product-data/earthquakes");
  const { id } = await api("/switchboard", {
    project_id: project,
    payload_source: "earthquakes",
    mode: "live",
    levels: [1],
    operations: 4,
    rate: 4,
    observation_ms: 1500,
  });
  let b: any;
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    b = await api("/switchboard/" + id);
    if (!["queued", "running"].includes(b.run.status)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.equal(b.run.status, "completed");
  assert.equal(b.run.spec.dataset_snapshot.content_hash, d.content_hash);
  assert.equal(
    hash(JSON.parse(b.run.spec.dataset_snapshot.source_manifest_json)),
    d.content_hash,
  );
  assert(
    b.evidence.some(
      (e: any) =>
        e.kind === "schedule_experiment" &&
        (e.content.structured_observations || e.content).decision?.planner ===
          "live model",
    ),
  );
  assert.equal(b.operations.length, 32);
  assert(
    b.operations.every(
      (o: any) =>
        o.observation.source_record?.id && o.observation.payload_bytes > 20,
    ),
  );
  assert(b.experiments.every((e: any) => e.summary.metrics.unauthorized === 0));
  await writeFile(
    "docs/evidence/practical-switchboard.json",
    JSON.stringify(b, null, 2),
  );
  console.log(
    "Real USGS rows persisted and delivered through both actual transports: " +
      id +
      " / " +
      b.run.verdict.result,
  );
} else {
  const r = await api("/applications/" + slug + "/start", {
    project_id: project,
  });
  let current = r;
  if (slug === "accessproof") {
    const own = r.state.documents.find((d: any) => d.tenant === 1),
      foreign = r.state.documents.find((d: any) => d.tenant === 2);
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "access_update",
      persona: "member",
      document_id: own.id,
    });
    assert.equal(current.state.last_check.allowed, false);
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "access_update",
      persona: "owner",
      document_id: own.id,
    });
    assert.equal(current.state.last_check.allowed, true);
    assert.equal(
      current.state.documents.find((d: any) => d.id === own.id).status,
      "Reviewed locally",
    );
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "access_check",
      persona: "contractor",
      document_id: own.id,
    });
    assert.equal(current.state.last_check.allowed, true);
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "access_check",
      persona: "owner",
      document_id: foreign.id,
    });
    assert.equal(current.state.last_check.allowed, false);
  }
  if (slug === "eventmedic") {
    const station = r.state.selected,
      receipt = crypto.randomUUID(),
      initial = r.state.stations[0].initial;
    await Promise.all([
      api(`/applications/${slug}/${r.id}/action`, {
        type: "checkout",
        station_id: station,
        operation_id: receipt,
      }),
      api(`/applications/${slug}/${r.id}/action`, {
        type: "checkout",
        station_id: station,
        operation_id: receipt,
      }),
    ]);
    current = await api(`/applications/${slug}/${r.id}`);
    assert.equal(current.state.stations[0].available, initial - 1);
    assert.equal(Object.keys(current.state.receipts).length, 1);
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "return",
      station_id: station,
      operation_id: crypto.randomUUID(),
      checkout_id: receipt,
    });
    assert.equal(current.state.stations[0].available, initial);
  }
  if (slug === "erasurecheck") {
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "review_erasure",
    });
    const action_hash = current.state.approval.hash;
    await api(
      `/applications/${slug}/${r.id}/action`,
      { type: "approve_erasure", action_hash: "0".repeat(64) },
      400,
    );
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "approve_erasure",
      action_hash,
    });
    assert(current.state.result.passed);
    assert.equal(current.state.status, "closed");
    assert.equal(current.state.account, null);
    assert.equal(current.state.receipt_rows.length, 0);
  }
  if (slug === "importrescue") {
    const csv =
      "sku,quantity,source_row\n" +
      r.source.rows
        .map((s: any) => [s.sku, s.quantity, s.id].join(","))
        .join("\n");
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "stage_import",
      csv,
      mapping: { sku: "sku", quantity: "quantity", receipt: "source_row" },
    });
    const action_hash = current.state.approval.hash;
    await Promise.all([
      api(`/applications/${slug}/${r.id}/action`, {
        type: "commit_import",
        action_hash,
      }),
      api(`/applications/${slug}/${r.id}/action`, {
        type: "commit_import",
        action_hash,
      }),
    ]);
    current = await api(`/applications/${slug}/${r.id}`);
    assert.equal(current.state.ledger.length, 24);
    await api(
      `/applications/${slug}/${r.id}/action`,
      {
        type: "stage_import",
        csv: `sku,quantity,source_row\n${r.source.rows[0].sku},-1,bad`,
        mapping: { sku: "sku", quantity: "quantity", receipt: "source_row" },
      },
      400,
    );
    assert.equal(
      (await api(`/applications/${slug}/${r.id}`)).state.ledger.length,
      24,
    );
  }
  if (slug === "economybreaker") {
    const receipt = crypto.randomUUID();
    await Promise.all([
      api(`/applications/${slug}/${r.id}/action`, {
        type: "craft",
        operation_id: receipt,
      }),
      api(`/applications/${slug}/${r.id}/action`, {
        type: "craft",
        operation_id: crypto.randomUUID(),
      }),
    ]);
    current = await api(`/applications/${slug}/${r.id}`);
    assert.equal(current.state.blocks, 1);
    assert.equal(current.state.ingots, 0);
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "craft",
      operation_id: receipt,
    });
    assert.equal(current.state.blocks, 1);
    const transfer = crypto.randomUUID();
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "transfer",
      operation_id: transfer,
    });
    current = await api(`/applications/${slug}/${r.id}/action`, {
      type: "transfer",
      operation_id: transfer,
    });
    assert.equal(current.state.teammate_blocks, 1);
    assert.equal(current.state.blocks, 0);
    assert.equal(current.state.last_result.value, 9);
  }
  await api("/login", { identity: "bob" });
  await api(
    `/applications/${slug}/${r.id}/action`,
    { type: "access_check", persona: "owner", document_id: "x" },
    404,
  );
  await api("/login", { identity: "alice" });
  await writeFile(
    "docs/evidence/practical-" + slug + ".json",
    JSON.stringify(
      {
        case: current,
        source_hash: r.source.content_hash,
        workspace_denial: true,
      },
      null,
      2,
    ),
  );
  console.log(slug + " practical workflow verified: " + r.id);
}
