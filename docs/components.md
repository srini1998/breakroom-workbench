# Components used in Breakroom

## Website
React 19 and TypeScript implement a single website with a shared product directory and six dedicated URLs. Vite builds the client; Express serves the UI and validated API. CSS uses a tactile, light experiment-bench theme with Lucide icons. The result playground visualizes recorded tool observations, exposes playback and evidence references, and respects reduced motion. It does not generate fake successes or turn a model explanation into a verdict.

## Supabase
The local Supabase CLI starts the actual Supabase Postgres, Auth (GoTrue), PostgREST and Storage services in an isolated Colima VM. Connection variables and local sandbox passwords live only in ignored `.env`. The user's default Docker context is not changed.

Workbench records live in a separate `breakroom_control` database. Disposable experiments use run-owned schemas in the Supabase target database and generated per-run Storage buckets. The server uses privileged credentials for fixture provisioning and internal worker state. AccessProof permission evidence comes from ordinary Supabase-authenticated users, through a security-invoker PostgREST RPC and RLS. Authorization comes from database memberships, never editable Auth metadata.

## Agent runtime
One shared runtime exposes five domain toolsets. Baseline mode uses a deterministic plan. Live mode calls an existing local Qwen 2.5 3B model through Ollama's compatible structured-output API. We have not trained or fine-tuned this model. JSON Schema narrows output to available bounded actions; Zod and the executor validate it again. The evaluator independently checks permissions, inventory and lifecycle facts.

Allowed actions, deadlines, token limits and prior observations are explicit. The model cannot execute shell, arbitrary SQL, arbitrary URLs or unrestricted filesystem actions. Logs contain public decision summaries, selected arguments, usage and evidence references, not private chain of thought. Hosted model spend is not used by the local profile. Provider billing cost is labeled unknown.

## Durability and evidence
Postgres stores workspaces, memberships, projects, fixture versions, runs, steps, tool calls, artifacts, findings and exact approvals. A dedicated Node worker claims runs using row locks and leases. Business effects use separate unique operation receipts and atomic domain transactions. Canonical SHA-256 hashes bind configurations, observations and approvals. Replay names its source; corrected runs link to parents and execute fresh fixtures.

## Verification
Node's test runner exercises actual database behavior. Playwright drives installed Chrome against the real app/API/worker. Product evaluation scripts run baseline and local-model cases sequentially, recording each run and verdict. Coordinated concurrency tests use explicit gates rather than random timing. The event restart check terminates a real worker process at a post-commit boundary; the erasure race checks coordinate actual Storage and SQL claims.

## What the portfolio does not mean
These are synthetic application failures on a real Supabase stack. They do not establish an upstream Supabase defect, universal security, legal compliance, or production readiness. Model success on this small named fixture set is not a general benchmark. The hiring value comes from the implementation, failure analysis, reproducibility and the author's ability to explain and modify it.

## Switchboard (Supa2, lab 06)
Switchboard adds actual Supabase Realtime, using both Postgres Changes and a trigger calling `realtime.broadcast_changes`. Postgres RLS and ordinary Supabase Auth owner/viewer sessions control row access; private-topic policies control Broadcast receipt. React provides the receipt-room visualization and configuration page. Zod validates supported parameters and model choices. A leased TypeScript worker persists operation and receipt ledgers to the separate control database. Node performance APIs measure the coordinator and a deterministic evaluator enforces correctness and delivery objectives. The existing local Qwen provider chooses load-level group order; it cannot generate SQL or change verdicts. Raw exports include expected recipients and observed timestamps, not credentials. No custom training or real customer data is used.

## Practical product layer / public datasets
`ProductExperience.tsx`, `useCases.ts` and `RealData.tsx` implement five practical pages, source attribution, detailed examples and side workbench access. Switchboard has its own practical explanation and USGS source cards; HomePage features it first. `ProductFit.tsx` documents existing Supabase capabilities, realistic packaging paths and Policy Passport.

`server/applications.ts` implements durable permission-preview, rental, account cleanup, sales import and crafting/transfer operations. These business actions are deterministic. `server/public-data.ts` serves bounded sanitized snapshots from data/public with canonical content hashes. Fixed-source TypeScript refresh fetches USGS, Citi Bike, GitHub and recipe records; a Python standard-library preprocessing script extracts the historical UCI sample. Python is not an application runtime dependency. `server/policy-passport.ts` and its CLI execute declared permission checks using the existing ordinary-session AccessProof probes. Migration 20261017213917 adds workspace-scoped application cases.
