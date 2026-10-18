# Practical product pages — October 17, 2026

The primary pages now show a customer job, an interactive local workflow, a plain-language explanation and detailed examples. The existing agent/scenario/evidence interfaces remain in an engineer's workbench. The original five use `/product/workbench`; Switchboard uses a secondary technical drawer that opens for direct run URLs. Switchboard is featured before all other products on the home page.

## What runs and where

| Product | Public source | Working practical action | What is simulated / limited |
|---|---|---|---|
| Switchboard | Actual USGS past-day observations | Replays frozen source rows through actual local Postgres Changes and private Broadcast, with recorded receipts and independent audience checks | Two fictional tenant teams; recorded observations, no live warning service or quake prediction |
| AccessProof | Eight public supabase/supabase issue titles | Server checks example role permissions; an owner can mark a local issue copy reviewed; other-team/role requests are blocked | Team assignments and role selector are examples, not real colleague authentication. Real separate Auth/RLS tests remain in the workbench and Policy Passport |
| EventMedic | Twelve Citi Bike GBFS station observations | Check out/return local inventory; concurrent repeated operation IDs affect inventory once; each receipt is saved | Actions never change Citi Bike or reserve a ride; starting counts describe their retrieval time |
| ErasureCheck | Three historical public retail lines linked to a fictional account | Creates actual local Storage exports/attachments, reviews an exact plan, performs actual owned-resource cleanup, preserves control/shared content and fences a delayed export | Fictional account only; no actual shopper identity, backups or legal certification |
| ImportRescue | First 24 positive rows of UCI Online Retail, 2010–2011 | Load/upload/map a bounded CSV, validate the whole batch, approve exact rows, commit atomically to a local sales ledger; retries cannot add the same rows twice | Historical sales, not current inventory/supplier deliveries. Sample excludes customer and invoice IDs. Uploaded mapped IDs must be chosen appropriately |
| EconomyBreaker | Pinned Minetest Game ingredient/output facts | Two concurrent requests spend the same local ingredients at most once; receipts make retries safe; atomic local transfer conserves value | Starting player balances/actions are fictional, not telemetry or money |

Practical actions are deterministic application operations, not unannounced LLM decisions. The pages say exactly what the investigator does in the separate supported fixture experiments. Switchboard's practical integration also validates a real local-model run carrying actual public observation payloads; the model chooses load-group order and evaluates delivery metrics, not geological risk.

## Durable implementation
`application_cases` stores per-project/workspace source snapshots, business state and action receipts/events in the control database. RLS protects reads; authenticated API writes validate current membership and lock the case row. Import approvals bind exact rows/mapping/catalog/case hashes and expire. Concurrent stock/crafting/import actions serialize at the database row. Real erasure reuses the existing target/Storage implementation and target account lock; adding the public receipt also checks the closed-account fence.

Private account data is not sourced from public datasets. Public facts are attributed; authored assignments, quantities derived from a starting observation, and local player activity are identified explicitly. No source provider is modified. See data/public/README.md for data licenses, transformations and refresh/extraction commands.

## Productization assessment
`/product-fit` distinguishes documented existing Supabase products from our assessment. Official references include Advisors, database testing, MCP, Realtime reports and preview environments. The assessment does not imply a missing native feature, customer demand, maintainers' interest or adoption.

Policy Passport is a concrete narrow prototype: `npm run preflight -- --candidate=clean` checks a declared contract against actual ordinary Auth/RLS probes, baseline and candidate. `--candidate=candidate-1` reproduces a reviewed seeded tenant-read regression and exits 1. It runs isolated fixtures per probe to avoid one ownership-change probe contaminating the next. The contract/schema rejects arbitrary operations, SQL and target choices. Each fixture is cleaned after its observations; reports retain actual identities, scope and changed permissions. It does not support arbitrary customer schemas, production migrations or a native Supabase CLI plugin installation. Downloads provide the tested starter contract and an actual seeded report.

Actual CLI proof: clean/clean pair passes; seeded candidate changes owner/member foreign reads from denied to allowed and fails. Initial testing exposed a harness interaction where a previous owner-transfer made a later same-value update look like a transfer; isolated probes corrected the harness. No upstream bug is claimed.

## Verification
- 42 regression checks passed, zero failed/skipped, after the new domain workflows.
- API verification passed sequentially for all five practical workspaces, with ordinary cross-workspace denial, concurrent duplicate checkouts, real Storage cleanup approval, concurrent import replay, and concurrent crafting/transfer receipts.
- Actual USGS rows delivered through both real transports; final real-model test freezes its source manifest and verifies the canonical fingerprint.
- All six practical pages pass desktop/mobile browser flows, actual business actions, source attribution, workbench separation, home order, and product-fit contract download. No page errors or horizontal page overflow.
- Existing engineering-workbench regression smoke passes separately after the long Realtime run, including mobile navigation and deep links. A prior concurrent smoke hit its own queue timeout; the final sequential run completed.

Artifacts: docs/evidence/practical-*.json, practical-*.png, practical-regression.txt, policy-passport-{clean,candidate-1}.json. No cloud resources, paid inference, public deployment or external messages were used.
