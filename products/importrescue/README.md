# importrescue

Independent product page: `/importrescue`.

- `Page.tsx`: dedicated product workflow.
- `server.ts`: owned fixtures, bounded execution and deterministic checks.
- Tools: inspect_import / propose_mapping / dry_run_import; shared inspect_contract is also available.

Bounded CSV upload/quoting, declarative mapping, exact approval, fact locks, atomic rejection and concurrent replay are verified.

Public contract: server/contracts.ts. Shared runtime: server/runtime.ts. Actual evaluation and browser reports: docs/evidence/. Start with the root README. Accounts, project navigation, durable execution and evidence are shared; domain behavior is independent of other products.
