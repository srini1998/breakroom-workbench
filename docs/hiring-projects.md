# Supabase hiring evidence: what these projects demonstrate

Researched October 17, 2026. This is an assessment of portfolio relevance, not a statement of Supabase's internal roadmap, endorsement, or a hiring prediction.

## Alice and Bob
They are conventional fictional test-person names. Here Alice owns Northstar Lab, and Bob owns a separate control workspace. They are actual accounts in the disposable local Supabase Auth instance, but neither represents a real person, customer, employee or collaborator. Switching identities tests that API and database policies prevent cross-workspace access. The login picker now explicitly says synthetic test accounts.

## Does Supa2 help?
Yes, particularly for performance engineering, database tooling, developer relations and reliability work. Supabase's current careers page lists performance engineering roles for benchmarking and analysis/tuning, along with Auth, Postgres, platform security, SRE and developer relations roles. The detailed role pages require JavaScript and were not used to infer unverified requirements.

The official database-change guide explicitly recommends Broadcast for scalability and security and documents trigger-driven private topics. A transition verifier addresses that documented engineering tradeoff. It does not prove an upstream bug, universal superiority, user demand or that a hiring team will value this exact product. The original five labs already provide broader evidence; Switchboard adds actual Realtime integration and experimental methodology.

Sources:
- https://supabase.com/careers
- https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/realtime/authorization
- https://supabase.com/changelog

## Focused project directions

| Project | Concrete engineering question | Evidence that makes it useful | Portfolio relevance (our assessment) |
|---|---|---|---|
| Switchboard, built here | Does a supported Changes → private Broadcast transition preserve recipients and meet the workload objective? | Real subscriptions, independent audience oracle, deliberately unsafe candidate rejected, missing receipts counted, paired raw evidence, coordinator headroom and explicit uncertainty | Benchmarking, reliability, database integration and developer tooling |
| Auth session lifecycle lab, proposed | Under refresh rotation, simultaneous tabs and sign-out, what happens to sessions and protected data access? | Actual GoTrue flows, controlled clock/token expiry, ordinary JWT requests, refresh concurrency, reproducible regression, clear distinction between JWT validity and session revocation checks | Auth/security, client libraries, support engineering |
| Postgres plan regression lab, proposed | Does an index or query rewrite remain beneficial across tenant skew and parameter values? | Versioned data generator, EXPLAIN (ANALYZE, BUFFERS), p50/p95 query measurements, write overhead, connection-pool load, before/after plan artifacts, no blanket “add an index” recommendation | Postgres, performance analysis/tuning, database support |
| Upstream regression contribution, requires a reproduced issue | Can a real reported behavior be reproduced and explained with a minimal case? | Failing test before a focused fix, passing test after, compatibility analysis and a concise case study; documentation/test contribution is valuable when no bug is found | Collaborative open source across roles |

These are separate future directions, not built features. Since Supa2 is relevant, the user's conditional request for an alternative if it is not useful does not require adding another speculative product. Finish and explain Switchboard first, as requested, rather than spreading effort across concurrent builds.

## What to show a reviewer
1. Start with the ordinary-user contract and the unsupported cases.
2. Run the seeded broad authorization candidate. Show an actual wrong-tenant receipt and its hard-fail verdict even when its latency is attractive.
3. Run the scoped candidate; compare all three paired repetitions. Show raw receipts, denominator, misses, local quality and hashes.
4. Drop an observer and starve the coordinator. Explain why those outcomes cannot be presented as a speedup.
5. Explain the real CDC readiness issue discovered during implementation: channel join is not necessarily confirmed replication subscription. Show the SDK's explicit wait option and the verified correction.
6. Describe the bounded agent's role honestly: it chooses a load-group ordering; the same fixed matrix, executor and evaluator work without a model. It cannot change policies or mark itself correct. Compare experiments used and conclusions rather than claiming an advantage.
7. Present a short case study with setup, measured results, limitations, design decisions and one improvement you personally implement/debug.

No custom training occurred. Runtime data is synthetic generated tenant orders, real local Auth/Realtime responses and recorded experimental receipts. The model is an existing local Qwen model and receives compact experiment summaries. A polished website is supporting presentation; the stronger evidence is engineering you understand, can change and can reproduce.

Supabase explicitly emphasizes collaborative open source on its careers page. A reviewed upstream contribution would complement this portfolio more strongly than accumulating additional similar dashboards. No outreach or publishing has been performed.

## What this portfolio still does not prove
This demonstrates Supabase application integration, permission reasoning, experiment design, durable job handling and product communication. It does not, by itself, demonstrate database internals expertise, operating a hosted distributed service under incidents, or making changes to Supabase's own implementation. For a performance role, the next depth improvement is server-side profiling and a reproducible plan/load investigation. For Auth, it is actual session/refresh lifecycle behavior and a minimal upstream regression. For developer relations, it is a clear runnable tutorial and case study that a second developer can reproduce. Tailor that next contribution to the specific public role, rather than assuming all roles want the same portfolio.
