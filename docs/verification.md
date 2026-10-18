# Verification record

Verified October 17, 2026. Products were completed and verified sequentially: AccessProof, EventMedic, ErasureCheck, ImportRescue, EconomyBreaker. Earlier native-only/blocked checkpoints are historical; the final profile uses actual local Supabase and local inference.

## Actual environment

Node 26.0.0, TypeScript 7.0.2, React 19.3.1, Vite 8.3.4, Express 5.3.0, pg 8.23.1, Zod 4.6.7, Supabase JS 2.118.0 and CLI 2.121.0. Installed Colima 0.10.3 runs the dedicated local VM without changing the user's active Docker context. Ollama 0.40.6 serves qwen2.5:3b locally. Model digest: `357c53fb659c5076de1d65ccb0b397446227b71a42be9d1603d46168015c9e4b`. No model weights are distributed in this repository.

Actual running Supabase image digests and database version are recorded in `evidence/runtime-environment.json`. Exact JS dependencies are in `evidence/dependencies.txt` and package-lock.json. Container-service manifests are version records, not a claim that excluded services such as Realtime were exercised.

## Acceptance evidence

| Product | Named cases per mode | Expected results | Additional checks |
|---|---:|---|---|
| AccessProof | 6 | Clean passes; five seeded variants fail | Real Auth/PostgREST/RLS, metadata escalation denial, workspace isolation, visual playback |
| EventMedic | 4 | All streams recover to valid state | Real OS worker crash/restart, unique receipts, append-only history, delivery visualization |
| ErasureCheck | 3 | Clean/delayed pass; incomplete fails | Actual Storage, content preservation, both claim orderings, retry, reviewed plan |
| ImportRescue | 7 | Supported commit; invalid/stale/missing facts reject or abstain correctly | Quoted upload, exact review, concurrent replay, fact locks and stock transaction |
| EconomyBreaker | 4 | Clean passes; three seeded variants fail | Same-trace corrections pass; bounded minimization and corrected replay; inventory arena |

Each case runs in baseline and live-model mode: 48 total named runs, 24 per mode. The final aggregate checks actual verdicts against the evaluator truth manifest; see `evidence/evaluation-summary.json`. The model does not receive that manifest. This is a named fixture evaluation, not an unseen/general model benchmark.

`npm test` passed all 30 database/integration checks with **0 failures and 0 skips**, including the formerly blocked real Storage check. Tests run under separate restricted control/target database credentials. Output: `evidence/integration-results.txt`.

Independent reports:

- `supabase-auth.json`: actual signInWithPassword/getUser, ordinary-role workspace isolation, and editable Auth metadata cannot grant permission.
- `credential-isolation.json`: separate non-superuser/non-bypass-RLS login roles; target credential denied control database connection.
- `eventmedic-process-restart.json`: real worker exits 75 after commit before ack; replacement process reclaims lease and reaches stock 4/outstanding 0 with two business effects.
- `erasurecheck-concurrency.json`: actual Storage and two coordinated export/deletion orderings, plus cleanup retry and unchanged control/shared contents.
- `importrescue-atomicity.json`: quoted CSV, concurrent same-file commit once, malformed/invalid batch atomic rejection.
- `*-browser.json`: per-product desktop/mobile results and recorded playback; `importrescue-upload-browser.json` proves file input → mapping → exact review → worker commit.
- `browser-smoke.json`: full shared website navigation, project/run creation, all five workflows, correction/replay, export, direct page reloads, browser back and 390px bounds with zero page errors.

## Problems found during implementation

Canonical hashing initially changed after JSONB reordered keys; canonical key sorting fixed approval/evidence hash stability. An early tenant-free fault also removed contractor filtering; its fixture was corrected to isolate the intended defect. Mobile overflow came from an absolutely positioned accessibility label escaping its scroll container; a positioned scroll container fixed it. Upload provenance initially displayed the supplier fixture name; the UI now identifies uploaded CSV runs. Restricted target-role setup exposed a missing Auth schema/function grant; the grant is now provisioned by the local Supabase administrator while runtime roles remain restricted.

## Official references checked

- https://supabase.com/changelog.md (fetched via curl because the web reader rejected markdown MIME); https://supabase.com/changelog/cbc-tls-ciphers-deprecated
- https://supabase.com/docs/guides/local-development
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/reference/javascript/storage-from-upload
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- Supabase Auth JS installed TypeScript definitions verified admin createUser's explicit id support.
- https://docs.ollama.com/api/openai-compatibility and https://ollama.com/library/qwen2.5:3b
- https://csv.js.org/parse/api/sync/ and https://csv.js.org/parse/options/
- https://www.postgresql.org/docs/17/sql-grant.html and https://www.postgresql.org/docs/14/explicit-locking.html
- https://vite.dev/guide/ and https://github.com/abiosoft/colima/blob/main/docs/INSTALL.md
- https://supabase.com/careers for portfolio context; no hiring outcome inferred.

No production probing, paid inference, cloud resource creation or public deployment was performed. GitHub-hosted CI is not claimed as run unless its workflow result is attached separately.

## Switchboard / Supa2 extension
The Realtime service is now actually exercised: local image `public.ecr.aws/supabase/realtime:v2.143.4`, with its actual digest in the updated runtime-environment.json. The statement above about excluded Realtime describes the original five-lab checkpoint only.

Official Realtime database-change, authorization and Postgres Changes documentation and the current changelog HTML were checked during implementation. The markdown changelog reader still rejected its MIME type. Installed `@supabase/realtime-js` source verified `postgres_changes_options: {wait:true,timeout:15000}`; this holds SUBSCRIBED until actual CDC readiness. An initial unconfirmed smoke missed its changes and was kept inconclusive, then confirmed-readiness A/B smoke passed.

The four baseline fixture runs each completed eight actual experiments (two smoke plus three paired repetitions at five subscribers): scoped passed; broad authorization failed with actual wrong-tenant receipts; dropped observer failed with intended recipients missing; starved coordinator returned inconclusive with measured >100 ms event-loop delay. Raw bundles: switchboard-{scoped,broad,dropped,starved}-baseline.json. Ordinary Auth API isolation/origin results are in switchboard-isolation.json.

Actual SIGKILL after a persisted operation, natural lease expiry, replacement worker reconciliation and cancellation passed: switchboard-lifecycle.json retains both complete raw bundles and kill signal. Interrupted accounting remains, rows are cleaned per owned run, and no cross-run receipts or duplicate operation identities were found. Interrupted comparison is inconclusive.

The browser configured and started the complete 5/20/50 matrix, completed 20 real experiments, recorded 1,804 receipts, and passed correctness/latency objectives. Full raw bundle: switchboard-scoped-baseline-full.json. It then exercised evidence playback, raw download and 390px responsive layout with no page errors or horizontal page overflow. Screenshots and switchboard-browser.json are actual outputs.

Final shared `npm test` now passes 37 checks, zero failures/skips: switchboard-regression.txt. This includes independent oracle/classification tests, denominator/miss accounting, correctness-over-speed gate, unsupported inputs, paired order invalid model choices and remote-target rejection. The final one-subscriber smoke passed both actual transports again (switchboard-final-smoke.txt).

Live full matrix also completed 20 real experiments and 1,804 receipts, with zero unauthorized or missing intended receipts. Its comparison correctly returned inconclusive because one coordinator maximum event-loop delay was 106.889215 ms, above the unchanged 100 ms gate. This result was preserved, not rerun until green. The verifier initially assumed a clean fixture always passes; its assertion was corrected to account for measured quality and the same existing run was validated/exported. Raw bundle: switchboard-scoped-live-full.json.

The final baseline and live broad-policy runs use the same negative-probe setup and eight-experiment budget. Both detected actual wrong-tenant receipt and failed; the baseline rerun also retained 20 missing intended pairs. The earlier broad-policy result is retained as switchboard-broad-baseline-initial.json. Comparison verifies matching workload fields, budgets, actual usage, conclusions, misses and quality: switchboard-planner-comparison.json. It establishes no model advantage.

Final browser check also creates a project, reloads a direct run URL, restores its actual project and switches projects without a stale response reverting the selection. All pass with zero page errors. A real four-identity owner/viewer negative subscription/write matrix passed: switchboard-recipient-matrix.json.

## Practical applications and Policy Passport / latest verification
All five practical workflows were implemented and verified sequentially. Full regression: **42 passed, 0 failed, 0 skipped** (evidence/practical-regression.txt). API checks cover cross-workspace denial, concurrent rental duplicate delivery, exact erasure approval with actual Storage deletion, atomic import/replay and concurrent crafting/value conservation. Artifacts are evidence/practical-{product}.json.

Final Switchboard live-model run aa5add2b-fd64-4e47-a589-b7a5c40e9c03 passes its small level-1 workload with 8 experiments and 32 operation intents carrying frozen actual USGS rows. Source manifest/fingerprint and real provider decisions are checked. This does not supersede the earlier full live benchmark's inconclusive coordinator-delay result.

Policy Passport clean/clean passes. The seeded candidate-1 pair has a passing baseline, two forbidden foreign-read changes and an expected exit code 1. Reports retain observed roles/actions and scope. Each probe has a fresh fixture to prevent state contamination.

Final practical browser check passes all six pages: real source records, interactive business actions, home order, secondary technical interface, product-fit download, desktop and 390px mobile bounds, zero page errors. The full existing engineering-workbench browser smoke also passes sequentially, including direct URLs, project restoration, real Storage approval and mobile navigation. A prior concurrent invocation timed out waiting behind Realtime work; the final smoke completed after the queue drained. Added horizontal tab scrolling fixes mobile overflow from the new Workbench tab. Typecheck/production build pass. These are local checks, not hosted CI/deployment claims.
