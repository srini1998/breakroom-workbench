# Supported scope and limitations

All five product domains are implemented and verified against an actual local Supabase stack. Baseline and live-model modes use the same bounded tools and independent evaluator. Evidence reports identify their exact runs and times.

## Data and model

Fixtures are authored synthetic application data. They are not scraped customer data, production event feeds, or model training datasets. ImportRescue additionally accepts bounded operator-uploaded CSV files, checked against the declared sandbox catalog, packs and receipt evidence. No custom model training or fine-tuning occurred. Local Qwen 2.5 3B chooses bounded actions; its quality is evaluated only on the named fixture set. This is not an unseen/general discovery benchmark. Original model training data is outside this project's control; no assertion is made about its complete contents.

## Product boundaries

AccessProof tests named role/resource/action combinations and five isolated seeded policy variants. The broad document-update fault also permits a document write after editing a profile field; these are two observations of one defect. Attachment checks cover metadata, not blob permissions. Actual permission evidence uses Supabase-issued JWTs and PostgREST's security-invoker RPC under RLS. Privileged fixture inspection is not treated as proof of ordinary access.

EventMedic models equipment rentals and transactional SQL business effects. It preserves the incoming ledger and append-only recovery history. Actual process crash/restart is verified at an injected post-commit/pre-ack boundary. It does not promise exactly-once effects for unrelated external payment/email systems.

ErasureCheck covers live resources in a generated owned bucket and SQL ownership graph. Deletion and export coordinate through an account-row claim/tombstone; Storage is not part of a distributed ACID transaction. Cleanup retry and both coordinated claim orderings are verified with actual Storage. It does not erase a real person's global Auth identity, inspect backups or certify legal compliance. Shared-resource behavior follows the small declared fixture, not a generalized ownership engine.

ImportRescue accepts at most 64 KiB and 1,000 rows, with bounded record size, supported CSV quoting, declarative mapping fields, versioned pack facts, and sandbox purchase/receipt evidence. It does not infer absent pack facts, scrape supplier sites, or connect to a production warehouse. Approval binds file/mapping/plan hashes. Facts are locked during transactional revalidation and stock commit. File replay is idempotent within its owned inventory fixture; a new run intentionally starts a fresh sandbox.

EconomyBreaker is an authoritative inventory simulator, not a full game engine. Its minimizer finds the shortest failing prefix of the supported small action trace and replays that prefix against the correction. It is not a general sequence-search/fuzzing minimizer. The actual weighted conservation rule accounts for crafting consumption and production.

## Runtime and security

All targets are loopback-only. Browser keys do not contain privileged credentials. Workbench records and disposable targets use separate databases and different restricted login roles. Target credentials cannot connect to the workbench database. Supabase services retain their own internal service accounts. No cloud resources or public deployment were created.

The sandbox account picker signs in through real local Supabase Auth using server-held generated passwords; it is not public account management. Membership invitations, self-service signup, full refresh-cookie lifecycle, global session revocation and production hardening are not implemented. Ordinary email/password login is available when the sandbox picker is disabled. API logout clears its cookie; it is not a global Supabase logout.

Runs use bounded tools, per-statement timeouts, leases, retries, cancellation and total deadlines. Local model output is constrained with JSON Schema and validated again with Zod and an executor allowlist. The agent cannot use arbitrary SQL, shell, URLs or files. Model explanations do not override deterministic verdicts. Provider billing cost is unknown; the verified profile uses local inference with no paid API.

## Portfolio interpretation

These tests reproduce deliberate application defects on Supabase. They do not establish upstream Supabase bugs, universal security, production readiness, benchmark superiority or a hiring guarantee. Screenshots and example bundles are dated outputs of real checks. The portfolio is strongest when its author can explain the code, change an invariant, reproduce the failure and discuss the limits without relying on generated descriptions.

The main history listing is bounded to the 100 most recent accessible runs. Older durable evidence remains retrievable by its run URL/UUID; history pagination is not implemented.

## Switchboard
Switchboard measures a synthetic local INSERT/UPDATE orders fixture with two fixed tenants and owner/viewer roles. DELETE, reconnect delivery, transport replay, membership revocation, per-row exceptions and arbitrary existing schemas are unsupported. Evidence playback is not a transport replay test. The local Colima environment and shared coordinator cannot establish hosted performance or isolate authorization cost from server fanout. Coordinator metrics and compromises are explicit; server-side resource metrics are not collected. The model currently selects load-group ordering only, under the same fixed matrix budget; no benefit over the baseline is asserted. An interrupted experiment retains partial ledgers and makes the comparison inconclusive. See the lab README for exact deadline, percentile and denominator definitions.

## Practical public-data pages (latest scope)
The primary pages now additionally use actual attributed public snapshots: USGS observations, Citi Bike station counts, public GitHub issue titles, UCI historical retail lines and pinned Minetest recipe facts. These are runtime source records, not training data. Team assignments, accounts, rides and player actions are fictional/local; no provider records change. Availability is a retrieval-time observation, historical retail sales are not current inventory, and recorded earthquakes are not predictions or a warning service. Source licenses, omissions and fingerprints appear in data/public/README.md and the UI.

Practical business operations are deterministic; the AI investigator remains a separate bounded verification interface. AccessProof's role preview does not authenticate real colleagues. Erasure performs actual local Storage cleanup but does not cover backups or legal certification. Policy Passport covers only its reviewed two-tenant fixture and declared action vocabulary; it is not an arbitrary-schema scanner, native Supabase CLI feature, production migration runner or evidence of adoption demand. The product-fit assessment is a hypothesis grounded in existing official capabilities, not a claim about Supabase's internal priorities.
