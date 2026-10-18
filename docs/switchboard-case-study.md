# Switchboard case study

Built October 17, 2026, as lab 06 in Breakroom.

## Question
Can the supported two-tenant INSERT/UPDATE order workload move from Postgres Changes to database-triggered private Broadcast without changing the permitted audience, while meeting an explicitly configured local delivery objective?

## Evidence
Run 404d5df3-c011-494a-8679-8f05dbc20004, deterministic planner: 20 actual experiments, three alternating pairs at each of 5/20/50 subscribers, 1804 persisted receipts. Both paths use ordinary real Supabase Auth sessions. The workbench control database and target credentials are separate. Every operation records its expected audience before writes.

Configured on-time objective: 1200 ms and 100% intended recipient coverage, with 1500 ms observation window per operation. 8 operations per measured experiment, 8 target writes/second, 128-byte payload.

| Subscribers | Changes per-repetition p95 (ms) | Broadcast per-repetition p95 (ms) | On-time pairs: A / B |
|---|---|---|---|
| 5 | 411.6, 437.7, 460.9 | 17.0, 19.4, 17.4 | 60/60 / 60/60 |
| 20 | 496.5, 447.9, 494.3 | 28.1, 17.8, 16.4 | 240/240 / 240/240 |
| 50 | 510.2, 528.9, 451.6 | 14.8, 16.8, 16.4 | 600/600 / 600/600 |

These are actual per-experiment nearest-rank p95 values, not pooled percentiles or hosted capacity predictions. Timing is observed write-start-to-receipt on one coordinator monotonic clock, including coordination overhead. Missing pairs stay in coverage; p99 is marked unstable for small samples.

## Failure checks
A deliberately broad private-topic policy produced actual wrong-tenant observations and failed regardless of latency. Dropping an observer reduced intended recipient coverage and failed. Deliberately starving the coordinator returned inconclusive. Actual SIGKILL and lease reclaim preserved interrupted operation/receipt accounting; it could not turn into a passing measurement. Cancellation preserved partial evidence and removed owned target rows.

## Implementation decision discovered in testing
A channel join is not necessarily confirmation that Postgres Changes is ready. The first unconfirmed smoke missed its events. The runner now waits for the installed SDK's explicit CDC confirmation option before any timed writes. This was a harness correction using an existing supported feature, not an upstream bug fix.

## Agent boundaries
A real local Qwen model selects the next permitted load group. It cannot issue SQL, modify policies, replace the independent oracle or declare a verdict. The fixed planner runs the same matrix and total budget. See switchboard-planner-comparison.json for actual planner evaluation; no model advantage is assumed. No training or customer data was used.

## Limits and hiring relevance
Local Supabase/Colima only. Fixed memberships, INSERT/UPDATE only. No DELETE, reconnect/replay delivery, revocation, arbitrary schema migration, server resource attribution or production guarantee. Interrupted comparisons remain inconclusive. The repository includes raw ledgers, hashes, actual versions, reproduction commands and ordinary-user authorization checks. This is evidence of integration and experimental engineering; a focused reviewed upstream contribution would add stronger evidence of collaborative open-source work.

## Reproduce
Follow the root README local setup, run app and worker, open /switchboard and select the full matrix. Use the broad, dropped and starved fixtures to inspect the negative cases. Export retains raw evidence. Lifecycle verification owns its processes and requires the ordinary worker to be stopped. Nothing was publicly deployed.

## Actual planner comparison

The fixed matrix reached a passing clean conclusion; the live clean comparison was inconclusive due measured coordinator event-loop delay above the same 100 ms gate. Both detected the seeded authorization failure under equal budgets. No agent superiority established; model selects group order only. The clean planners each used 20 experiments and a 720-second limit. The live planner used the order 50/20/5 and recorded three real Qwen decisions. Its largest coordinator delay was 106.9 ms against the 100 ms gate; all 1,804 expected receipts were observed, with no unauthorized receipts, but that does not remove the quality failure. Both seeded-defect runs used eight experiments and detected actual unauthorized receipt. The deterministic seeded-defect rerun also recorded 20 missed intended pairs; those failures are retained in its raw bundle rather than dropped from coverage.
