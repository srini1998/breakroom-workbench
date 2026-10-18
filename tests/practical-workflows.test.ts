import { test } from "node:test";
import assert from "node:assert/strict";
import { initialize, operation } from "../server/applications.ts";
import { dataset } from "../server/public-data.ts";
import { uuid } from "../server/contracts.ts";
test("public-issue workspace distinguishes read, update, assigned and foreign-team rules", async () => {
  const s = initialize("accessproof", await dataset("issues"));
  const own = s.documents[0],
    foreign = s.documents.find((r: any) => r.tenant === 2);
  assert.equal(
    (
      await operation(
        "accessproof",
        s,
        { type: "access_update", persona: "member", document_id: own.id },
        uuid(),
      )
    ).state.last_check.allowed,
    false,
  );
  assert.equal(
    (
      await operation(
        "accessproof",
        s,
        { type: "access_update", persona: "owner", document_id: own.id },
        uuid(),
      )
    ).state.documents[0].status,
    "Reviewed locally",
  );
  assert.equal(
    (
      await operation(
        "accessproof",
        s,
        { type: "access_check", persona: "owner", document_id: foreign.id },
        uuid(),
      )
    ).state.last_check.allowed,
    false,
  );
});
test("recorded station inventory changes once per receipt and returns exactly once", async () => {
  let s = initialize("eventmedic", await dataset("stations"));
  const station = s.selected,
    initial = s.stations[0].initial,
    receipt = uuid();
  s = (
    await operation(
      "eventmedic",
      s,
      { type: "checkout", station_id: station, operation_id: receipt },
      uuid(),
    )
  ).state;
  assert.equal(s.stations[0].available, initial - 1);
  s = (
    await operation(
      "eventmedic",
      s,
      { type: "checkout", station_id: station, operation_id: receipt },
      uuid(),
    )
  ).state;
  assert.equal(s.stations[0].available, initial - 1);
  s = (
    await operation(
      "eventmedic",
      s,
      {
        type: "return",
        station_id: station,
        operation_id: uuid(),
        checkout_id: receipt,
      },
      uuid(),
    )
  ).state;
  assert.equal(s.stations[0].available, initial);
  await assert.rejects(() =>
    operation(
      "eventmedic",
      s,
      {
        type: "return",
        station_id: station,
        operation_id: uuid(),
        checkout_id: receipt,
      },
      uuid(),
    ),
  );
});
test("account closure requires the exact reviewed plan before deleting real resources", async () => {
  const state = initialize("erasurecheck", await dataset("retail"));
  await assert.rejects(() =>
    operation(
      "erasurecheck",
      state,
      { type: "approve_erasure", action_hash: "f".repeat(64) },
      uuid(),
    ),
  );
});
test("real historical sales CSV is staged exactly, committed once and rejects invalid quantities atomically", async () => {
  const d = await dataset("retail");
  let s = initialize("importrescue", d);
  const csv =
    "sku,quantity,source_row\n" +
    d.rows
      .slice(0, 3)
      .map((r: any) => [r.sku, r.quantity, r.id].join(","))
      .join("\n");
  s = (
    await operation(
      "importrescue",
      s,
      {
        type: "stage_import",
        csv,
        mapping: { sku: "sku", quantity: "quantity", receipt: "source_row" },
      },
      "00000000-0000-4000-8000-000000000001",
    )
  ).state;
  const id = s.approval.hash;
  s = (
    await operation(
      "importrescue",
      s,
      { type: "commit_import", action_hash: id },
      "00000000-0000-4000-8000-000000000001",
    )
  ).state;
  assert.equal(s.ledger.length, 3);
  s = (
    await operation(
      "importrescue",
      s,
      { type: "commit_import", action_hash: id },
      "00000000-0000-4000-8000-000000000001",
    )
  ).state;
  assert.equal(s.ledger.length, 3);
  assert(s.last_result.replayed);
  await assert.rejects(() =>
    operation(
      "importrescue",
      s,
      {
        type: "stage_import",
        csv: `sku,quantity,source_row\n${d.rows[0].sku},-1,bad`,
        mapping: { sku: "sku", quantity: "quantity", receipt: "source_row" },
      },
      uuid(),
    ),
  );
  assert.equal(s.ledger.length, 3);
});
test("real recipe economics conserve value, block double spend and make transfer retries idempotent", async () => {
  let s = initialize("economybreaker", await dataset("recipes"));
  const first = uuid(),
    second = uuid();
  s = (
    await operation(
      "economybreaker",
      s,
      { type: "craft", operation_id: first },
      uuid(),
    )
  ).state;
  assert.equal(s.blocks, 1);
  s = (
    await operation(
      "economybreaker",
      s,
      { type: "craft", operation_id: second },
      uuid(),
    )
  ).state;
  assert.equal(s.blocks, 1);
  assert.equal(s.last_result.accepted, false);
  const transfer = uuid();
  s = (
    await operation(
      "economybreaker",
      s,
      { type: "transfer", operation_id: transfer },
      uuid(),
    )
  ).state;
  s = (
    await operation(
      "economybreaker",
      s,
      { type: "transfer", operation_id: transfer },
      uuid(),
    )
  ).state;
  assert.equal(s.teammate_blocks, 1);
  assert.equal(s.blocks, 0);
  assert.equal(s.last_result.value, 9);
});
