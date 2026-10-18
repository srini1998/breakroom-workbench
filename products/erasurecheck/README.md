# erasurecheck

Independent product page: `/erasurecheck`.

- `Page.tsx`: dedicated product workflow.
- `server.ts`: owned fixtures, bounded execution and deterministic checks.
- Tools: inspect_erasure_scope / verify_erasure; shared inspect_contract is also available.

Real Supabase Storage, exact cleanup approval, both coordinated export/deletion claim orderings and cleanup retry are verified.

Public contract: server/contracts.ts. Shared runtime: server/runtime.ts. Actual evaluation and browser reports: docs/evidence/. Start with the root README. Accounts, project navigation, durable execution and evidence are shared; domain behavior is independent of other products.
