# Switchboard / Realtime Transition Lab

Lab 06 in Breakroom, from Supa2.md. Open `/switchboard` in the existing site. It compares actual Supabase Postgres Changes with actual database-triggered private Broadcast. It does not emulate delivery, train a model, migrate arbitrary customer schemas or claim a Supabase bug.

Local setup:
```
npm run services
npm run setup:switchboard
npm run dev
npm run worker
```
The ordinary Breakroom local Supabase setup and restricted credentials must already exist (see root README). `services` now includes Realtime. If an older stack is already running without it, use `DOCKER_HOST=unix://$HOME/.colima/breakroom/docker.sock npx supabase stop --project-id supa1` then `npm run services`; default stop preserves data volumes. Never use `--no-backup` for a normal restart. All infrastructure is local and disposable; no cloud or paid service required.

## Components
- `contract.ts`: strict workload/config schemas, independent declarative recipient oracle, deterministic classifications and nearest-rank quantiles.
- `target.sql`: reviewed owner/viewer RLS, public orders publication and private Broadcast trigger; broad variant only authorizes experiment-specific fixture topics. Only setup uses the bootstrap admin.
- `runner.ts`: ordinary Auth clients and writers, confirmed subscriptions, monotonic timestamps, durable operation intents/receipt capture, negative checks, coordinator measurements, scoped cleanup.
- `service.ts`: authenticated API, workspace RLS, raw export, lease/lock worker, cancellation and restart reconciliation, fixed matrix and bounded live-model group selection, independent verdict.
- `src/Switchboard.tsx`: configure/run, receipt-room playback, comparisons, history, export, failure and empty states.

The model selects load-level group order. Within a pair, order alternates deterministically. Both planners use the same workload, number of experiments, evaluator and 12-minute limit. No performance advantage is presumed. Live inference is the configured existing local Qwen model; cost is unknown, not fabricated. Structured choices cannot execute SQL, URLs, policies or shell commands.

## Limits and interpretation
Only two tenants, fixed memberships and INSERT/UPDATE are supported. The synthetic order payloads are generated at runtime; four synthetic ordinary users use real local Supabase Auth. Observer and workload credentials are distinct from workbench/admin credentials. No real customer data or model fine-tuning.

Rows have deterministic event UUIDs derived from seed, experiment UUID and sequence; the export retains all correlation identifiers, expected recipients and raw receipt timestamps. Row version increases on UPDATE. Same seed with a fresh experiment uses a fresh correlation namespace to avoid mixing runs.

Timing is write-start-to-receipt on one monotonic process clock. Durable timestamp persistence before dispatch adds coordinator overhead; write completion is a separate metric. It is not server-only latency. CPU, RSS, maximum/mean event loop delay, connection counts/errors and actual write rate describe the coordinator. Server-side CPU and tracing are not collected. More than 100 ms maximum event loop delay marks quality compromised; the explicitly starved fixture creates a measurable 180 ms pause per operation.

Missing pairs remain in the denominator. On-time means within both the latency objective and observation deadline; receipts over the objective but within the window are late. `after_deadline` counts received pairs outside the deadline, which remain missing for reliability coverage. Quantiles only include the first authorized receipts observed within the deadline. p99 is unstable below 100 observed samples. Negative absence is bounded by the window, never proof of permanent non-delivery. Unauthorized observations fail regardless of speed or coordinator quality.

A dropped first candidate observer remains in the expected set. A broad topic authorization fixture permits a real ordinary wrong-tenant subscription; this is deliberately seeded, not an upstream vulnerability.

No restart resumes a monotonic clock from another process. An in-flight experiment is marked interrupted, its persisted accounting is retained, and only its own target rows are cleaned. Completed experiments are not repeated. Remaining experiments continue with new IDs. The overall comparison remains inconclusive if any experiment was interrupted. Cancellation retains partial accounting and ends inconclusive. A cancelled or dead process is never reported as successful.

Evidence playback is rendering recorded receipts. It does not test transport replay or reconnect delivery. See `docs/switchboard-status.md` and `docs/evidence/switchboard-*` for actual verification; unrun profiles are not claimed as passed.
