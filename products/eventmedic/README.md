# eventmedic

Independent product page: `/eventmedic`.

- `Page.tsx`: dedicated product workflow.
- `server.ts`: owned fixtures, bounded execution and deterministic checks.
- Tools: inspect_events / deliver_event / verify_inventory; shared inspect_contract is also available.

Individual bounded deliveries, dependency replay, unique receipts and real worker OS crash/restart are verified on Supabase Postgres.

Public contract: server/contracts.ts. Shared runtime: server/runtime.ts. Actual evaluation and browser reports: docs/evidence/. Start with the root README. Accounts, project navigation, durable execution and evidence are shared; domain behavior is independent of other products.
