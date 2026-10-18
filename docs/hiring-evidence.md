# What Breakroom demonstrates

This portfolio can demonstrate engineering judgment; no project can prove a hiring outcome. It is strongest when the author can explain, change, and debug the implementation without treating the AI-generated code as a black box.

The suite is designed to show permission boundaries, database concurrency, idempotent recovery, resource lifecycle, structured tool execution, reproducible testing, and usable developer tooling. All defects are authored local fixtures. No upstream Supabase bug, company adoption, or security certification is claimed.

## Reviewer path

Start with AccessProof: watch a real Supabase-issued JWT reach PostgREST and a security-invoker function, then inspect a denied or forbidden operation and its RLS evidence. Continue to EventMedic for transaction/recovery behavior, ErasureCheck for actual Storage and delayed-job fencing, ImportRescue for approval and conversion correctness, and EconomyBreaker for coordinated race reproduction.

Each page retains clean and defective runs, a corrected counterpart, a public contract, reproducible observations, content hashes, and an export. Live-model decisions are logged separately from deterministic verdicts. Baseline and live evaluations use the same fixture set; the model never receives the fault manifest.

## Strong follow-on work

- Contribute a narrowly scoped regression test, documentation improvement, or fix to a relevant Supabase open-source repository. Reproduce first; do not label an issue an upstream defect without evidence.
- Build a focused Postgres performance investigation with EXPLAIN (ANALYZE, BUFFERS), data skew, controlled concurrent load, and before/after latency distributions. Record hardware and versions.
- Build an Auth session lifecycle test suite covering refresh-token rotation, revocation, cookie handling and SSR boundaries through actual SDK clients.
- Build a Realtime reconnect/backpressure laboratory that measures missed/duplicate delivery behavior and reconciles through a durable source of truth.

Choose one follow-on according to the role. A deep, reviewable artifact plus an upstream contribution is a stronger signal than adding more lightly verified demos.

## Preparation before sharing

Be able to explain the schema and transaction boundaries; demonstrate a failure live; explain what the test cannot establish; modify one permission or invariant and update its test; and discuss one engineering tradeoff. Write a short incident-style case study for each product. Keep the evidence and setup reproducible. Do not claim you trained five models: the suite uses an existing local model with five domain toolsets.

Source context checked October 17, 2026: https://supabase.com/careers. The careers page describes collaborative open source and traits including truth seeking, ownership and reliable delivery. The relevance of these portfolio artifacts is our engineering assessment, not a statement from Supabase's hiring team.
