# Supa1 implementation status

2026-10-17. New independent project. No prior work overwritten.

Plan: shared durable workbench and AccessProof; EventMedic recovery; ErasureCheck Storage/epoch coordination; ImportRescue staging/approval; EconomyBreaker concurrency; model adapter, UI, evidence, verification.

Environment: Node 26.0.0, Supabase CLI 2.108.0. Docker client exists but daemon is unavailable; Docker Desktop is not installed. Native PostgreSQL will support explicitly labeled local development integration checks. Real Supabase Auth/Storage checks remain blocked pending services. No paid or public resources created.

Next: implement contracts, migrations, fixtures, and worker, then exercise actual local Postgres behavior.

## User clarification / separate products
All five are now separate product directories under products/, each with its own Page.tsx and server.ts. One website routes /accessproof, /eventmedic, /erasurecheck, /importrescue, /economybreaker and the shared / product directory. Shared control plane, identities, and project navigation remain central.

Implemented: durable leases, persisted steps/tools/evidence/findings/approvals, SQL RLS sessions, AccessProof five isolated defects, EventMedic idempotent recovery, ImportRescue three supplier formats and exact approval, EconomyBreaker three deterministic exploits and corrections, ErasureCheck real Storage adapter and locking/tombstone workflow (blocked integration), bounded structured model adapter (unverified without provider).

Verified before route split: npm run build passed. npm test: 27 passed, 0 failed, 1 skipped (real Storage). Canonical hashes fixed after database JSONB key ordering exposed a mismatch. Tenant-free candidate redesigned to preserve contractor assignment filtering.

Current: verify multipage navigation and complete browser smoke; write full delivery docs. CLI upgraded locally in package lock to 2.121.0. It has no `stack` subcommand; Docker remains unavailable.

## Delivery checkpoint

Implemented the clarified structure: one shared home page and five distinct product pages/source folders. Product pages include individual domain views (permission matrix, rental event sequence, ownership graph, supplier mapping desk, inventory trace selector). Direct URLs, nested history/environment/run routes, browser back, and reloads are supported.

Final actual verification:
- `npm run build`: passed after formatting the product/server/UI code.
- `npm test`: 28 passed, 0 failed, 1 skipped; real Storage check explicitly skipped. Output saved in docs/evidence/integration-results.txt.
- `npm run smoke`: passed in Chrome 155.0.8059.80 on 2026-10-17 at 15:11 America/New_York, including nine AccessProof tool observations, corrected run, saved replay, EventMedic, approved ImportRescue commit, EconomyBreaker and honest ErasureCheck unavailable state. All five direct URLs/reloads, browser back, and 390px bounds passed. No page errors. JSON report and screenshots in docs/evidence/.
- Built-server direct-route check on temporary port 4311: all five page URLs, root and nested history returned 200 application HTML.
- `npm run ready`: control/target Postgres connected; fixture authentication active; model/Storage not configured.

README.md, per-product READMEs, .env.example, architecture, verification, limitations, evidence bundle, dependencies and CLI service manifest are present. Standard startup is non-destructive. Run-scoped target reset preserves durable evidence.

Remaining blocked work: install/start a Docker-compatible runtime, configure the local Supabase Storage key, then run the real erasure integration check. Configure local Supabase Auth users/memberships to verify actual issued sessions. Configure an existing local model endpoint to validate live mode. No five-product Supabase integration claim is made. Four product domains have actual native PostgreSQL verification; ErasureCheck is implemented but its real Storage path remains unverified. General replay minimization and arbitrary supplier uploads are not implemented; see limitations.

Development website: http://127.0.0.1:4310. Worker and isolated PostgreSQL were left running for use. Future resume: read this file and docs/limitations.md, then work on the blocked integrations rather than rebuilding the suite.

## Completion pass / Breakroom
User requested completion, real Supabase use across all five, working live agents, a playful evidence-driven presentation, and hiring-oriented explanation. Renaming the suite Breakroom (historical source filename retained).

Read-only Supabase connector inspection found no existing projects. Installing free local Colima/Ollama runtimes to unblock verification without paid cloud resources. Separate `breakroom` VM; user Docker context should remain unchanged. Current Supabase careers page reviewed for evidence-backed portfolio guidance. Next: real local stack + Auth setup, all-module agent evaluation, interactive result scenes, CI/docs.

## Sequential completion: 1 / AccessProof verified
2026-10-17. Actual local Supabase now runs in isolated Colima breakroom VM (active Docker context unchanged). Workbench records use separate breakroom_control database; disposable targets use Supabase Postgres. Real GoTrue identities and PostgREST security-invoker probes exercise RLS. Supabase user metadata edit tested: cannot grant membership/update. Local qwen2.5:3b via Ollama completed clean + all five fault cases, alongside baseline (12 matching case verdicts). Desktop/mobile visual boundary playback verified through real sandbox login. See accessproof-evaluation.json, accessproof-browser.json, supabase-auth.json. No custom fine-tuning or customer training data used. Next only: EventMedic completion.

## Sequential completion: 2 / EventMedic verified
All four streams passed in baseline and real live-model modes (8 runs). Agent tools now inspect the ledger, deliver/requeue individual bounded events, inspect receipts, and verify the final inventory. A real worker OS process exited at a post-commit/pre-ack injection point; a new worker reclaimed its lease and completed with 2 operations, stock 4, outstanding 0. Animated event trail/playback verified on desktop/mobile. Next only: ErasureCheck real Storage and coordinated erasure/export tests.

## Sequential completion: 3 / ErasureCheck verified
Real Storage now verified, no adapter mock. Clean and delayed cases pass; incomplete deletion fails in baseline/live (6 runs). Coordinated export-before-delete and export-after-tombstone tests pass; repeat cleanup preserves actual control/shared file contents and absence checks include object download. Exact cleanup remains operator-approved. Resource constellation/browser/mobile passed. Next only: ImportRescue upload/mapping and transactional review.

## Sequential completion: 4 / ImportRescue verified
All 7 named cases matched expected behavior in baseline/live modes (14 runs). Added bounded real CSV upload with quoted-field parser and editable structured mapping. Upload → exact diff review → real API approval → worker commit passed in Chrome; desktop/mobile result conveyor passed. Pack/receipt facts are locked while revalidated and committed in one target transaction. Concurrent same-file replay commits once; malformed, duplicate-header, unsafe quantity and invalid-row batches reject without stock mutation. Next only: EconomyBreaker bounded actions/minimization and visual arena.

## Sequential completion: 5 / EconomyBreaker verified
All 4 named cases matched expected verdicts in baseline/live modes (8 runs). Agent inspects actual initial inventory and coordinates the three allowed action families. Vulnerable traces are replayed against shorter prefixes in owned tables; minimized failures are replayed against corrections. Conservation includes 2 ore → 1 ingot, avoiding a false crafting duplication finding. Browser/mobile visual arena, correction switch and evidence playback verified. All five have now completed their sequential implementation pass. Final shared regression/security/docs pass remains.

## Final Breakroom completion / 2026-10-17
All five completed one after another in the requested order. Actual local Supabase Auth, PostgREST, Postgres and Storage run in the dedicated Colima VM. Runtime workbench and target roles are distinct, non-superuser and non-bypass-RLS; the target role cannot connect to the workbench database. Local Ollama qwen2.5:3b supplies real structured decisions; no custom training was performed.

Final sequential evaluation: 48/48 named runs matched expected verdicts, 24 baseline + 24 live. Actual reports, model usage and run UUIDs are in docs/evidence/*-evaluation.json and evaluation-summary.json. Scope is the named synthetic fixture set, not a general agent benchmark.

Final regression suite: 30 passed, 0 failed, 0 skipped, including real Storage, missing-evidence inconclusive verdict, minimized exploit/correction proof, RLS, idempotence and lease recovery. Actual OS process restart, coordinated Storage race, CSV upload/concurrent import replay, restricted credentials, per-product visual desktop/mobile playback and full shared browser flow are separately verified. Build/typecheck passed. Real image/model digests recorded in runtime-environment.json; secrets are not exported.

User-facing suite renamed Breakroom, with tactile light product pages and five actual-observation visualizations. Preserved internal Supabase CLI project identifier and folder path to retain existing local volumes. Updated README, architecture, limitations, components, hiring evidence and verification docs; prepared GitHub CI but did not claim a hosted run. No production probing, paid API, cloud resource creation or public deployment.

Running website: http://127.0.0.1:4310. Dedicated worker, Supabase/Colima and local Ollama left running. Standard startup is documented in README and preserves data. Runtime secrets are only in ignored .env. Future work should extend the explicit scope (e.g. unseen benchmarks, Realtime, production Auth lifecycle, history pagination), not rebuild these five products.

Final browser regression found and fixed deep-link project restoration: the run page now adopts its stored project/workspace when loading evidence. Correction/replay after a reload cannot accidentally target the default project. The browser smoke now explicitly reloads a run from a newly created project before correcting it. Split the stable React root entrypoint from App.tsx to keep fast refresh from creating duplicate roots. Local Git repository initialized; private .env, generated service state and runtime logs are ignored. No remote publish performed.

## New request: Supa2 / Switchboard in progress
The original five labs remain completed. New lab 06 implements Supa2.md sequentially, with real Realtime A/B paths. See switchboard-status.md for current milestones and pending checks. Alice/Bob are now explicitly synthetic test accounts; login typography is responsive in split panels.

## Supa2 / Switchboard completed
Lab 06 completed with actual Realtime A/B paths, durable ledgers, ordinary-session authorization, paired load runner, live local model selection, deterministic evaluator and interactive receipt-room page. Full baseline 5/20/50 passes (20 experiments/1,804 receipts); full live model completes the same workload but remains inconclusive due an actual 106.9 ms coordinator delay against the 100 ms gate. Both matched seeded broad-policy runs fail with real unauthorized receipts. No model advantage claimed. Actual crash/reclaim/cancel, four-identity permissions, API isolation and complete desktop/mobile browser/project/deep-link/export flows pass. Final regression 37/37, zero skips. See switchboard-status.md, switchboard-case-study.md and hiring-projects.md. All local; no public deployment or cloud changes.

## Practical product experience completed / 2026-10-17
All six primary pages now show customer jobs, attributed public source records, plain-language explanations and concrete examples. Switchboard is first on the home page. The original five have dedicated secondary workbench routes; Switchboard keeps engineering details in a drawer. Five durable practical workflows were implemented sequentially and verified through actual API/database/Storage operations.

Policy Passport is implemented and tested as a narrow declared-permission baseline/candidate CLI. Clean passes; a seeded tenant-read regression fails as expected. `/product-fit` explains realistic packaging and remaining gaps, with official Supabase references and no adoption or hiring guarantee.

Final verification: 42 regression tests pass without skips; all practical API checks and the real-model USGS Realtime workload pass; all six desktop/mobile practical pages and the full original engineering browser smoke pass. Production build/typecheck pass. Prior full Switchboard live benchmark remains explicitly inconclusive; the new smaller workload is separate evidence. Source data details and exact scope are in product-experience.md and data/public/README.md. Everything remains local with services running at http://127.0.0.1:4310; no public deployment or provider-system writes.
