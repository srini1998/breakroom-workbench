# Switchboard — completed local build, October 17, 2026

Supa2.md is implemented as lab 06 in Breakroom, after the original five. No public deployment, paid/cloud resource, upstream defect claim, model training or hiring guarantee.

All five milestones completed:
1. Real local Realtime v2.143.4, ordinary Auth subscribers/writers, owner/viewer RLS, publication and actual trigger-driven private Broadcast. Confirmed CDC readiness before writes. Synthetic Alice/Bob login copy clarified and split-panel layout fixed.
2. Independent recipient oracle, durable operation intents/receipts, correlated deterministic IDs, deadline/miss/late/duplicate/unauthorized accounting, nearest-rank quantiles, hashes and raw export.
3. Leased dedicated worker, one active run per workspace, global coordinator lock, deadlines, bounded attempts, scoped cleanup, cancellation and actual process-death recovery. Interrupted experiments retain accounting and cannot pass a comparison.
4. Strict local-model group selection, persisted plans, output/token/call bounds and validated tool/verdict envelopes. Fixed matrix and model use identical experiment/time budgets. Real Qwen decisions and usage verified.
5. Configure/run/inspect/compare/export page with actual receipt-room visualization, evidence playback, history, correction configuration, project creation/switching and direct links. Desktop/mobile browser checks passed.

## Actual results
- Original four baseline fixtures, eight experiments each: scoped pass; broad fail with real unauthorized receipt; dropped fail with missing recipients; starved inconclusive with measurable coordinator delay.
- Full 5/20/50 baseline: 20 experiments, 1,804 receipts, pass.
- Full same-budget live model: 20 experiments, 1,804 receipts, no unauthorized/missing intended receipts, **inconclusive** because one 106.889215 ms event-loop delay exceeded the unchanged 100 ms gate. Preserved as measured; not cherry-picked or relabeled pass.
- Final matched broad-policy baseline/live: eight experiments each; both fail with real wrong-tenant receipts. Baseline also records 20 intended-pair misses. Initial broad result retained separately. No model superiority established.
- Actual SIGKILL, natural lease expiry, replacement and cancellation: passed, partial accounting retained, no cross-run receipt mixing or duplicate operation identities, owned target rows cleaned.
- Ordinary API workspace detail/export/cancel denial, hidden catalog and foreign-origin rejection: passed.
- All four actual Auth owner/viewer identities denied foreign private joins and forbidden writes: passed.
- Final shared regression: 37 pass, zero failures/skips. Final actual A/B smoke and build/typecheck pass. Browser configure/full run, actual evidence, playback, download, new project, direct reload, project switching and 390px layout pass with zero page errors/overflow.

Evidence lives in docs/evidence/switchboard-*. The case study is docs/switchboard-case-study.md. Architecture/components/verification/limitations and root README are updated. Reproduction commands are in products/switchboard/README.md; smoke, verification, browser, lifecycle and scoped reset scripts exist. CI configuration includes Realtime/setup/smoke but no hosted CI result is claimed.

Open http://127.0.0.1:4310/switchboard. App, worker, local Supabase and Ollama are left running. Standard start preserves data. Source folder and internal CLI identifier stay supa1 to preserve existing volumes; user-facing product is Breakroom / Switchboard.

Hiring assessment: useful evidence for benchmarking/reliability/tooling work, not proof of readiness for every Supabase role. See docs/hiring-projects.md for concrete Auth lifecycle, Postgres plan regression and upstream-contribution directions. Since Supa2 is relevant, no speculative alternative product was required by the user's conditional request.
