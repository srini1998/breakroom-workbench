# Breakroom

Six practical Supabase applications in one website, with real public data, plain-language examples and a separate agent verification workbench. Switchboard is featured first at `/`.

| Product | Page | Practical workflow / real source |
|---|---|---|
| Switchboard | `/switchboard` | Replay actual USGS observations through two real Realtime transports and check who received each update |
| AccessProof | `/accessproof` | Work with public GitHub issue titles in fictional teams; preview access and update local copies |
| EventMedic | `/eventmedic` | Try safe local checkout/return operations using real Citi Bike station starting counts |
| ErasureCheck | `/erasurecheck` | Review and execute real local Storage/SQL cleanup for a fictional account referencing public retail lines |
| ImportRescue | `/importrescue` | Map, approve and atomically import real historical UCI sales rows into a local ledger |
| EconomyBreaker | `/economybreaker` | Race concurrent crafting requests using a real Minetest recipe and fictional player inventory |

The practical actions are deterministic business operations. The separate agent workbench explains and verifies supported failure scenarios; no model was trained on these datasets. All source facts, retrieval times, transformations and simulation limits are shown on the pages. Nothing changes a source provider's system.

The original five engineering interfaces are at `/product/workbench`, with existing history/environment/run deep links retained. Switchboard's engineering configuration and traces are in a secondary drawer. Auth, projects, durable runs and evidence are shared.

`/product-fit` assesses realistic Supabase integration paths and includes **Policy Passport**, a working declared-permission regression CLI. It compares baseline/candidate behavior through ordinary real Auth/RLS probes in isolated local fixtures:

```sh
npm run preflight -- --candidate=clean
npm run preflight -- --candidate=candidate-1
```

The seeded candidate intentionally violates tenant-read rules and exits 1. This is a narrow tested prototype, not an installed native Supabase feature or arbitrary-schema migration checker. See [practical implementation and verification](docs/product-experience.md), [public data provenance](data/public/README.md), and [component walkthrough](docs/components.md).

## What is verified

The original five execute against an actual local Supabase stack. AccessProof uses ordinary Supabase-issued sessions through PostgREST, not service-role permission evidence. ErasureCheck uses actual Supabase Storage, not a filesystem mock. Control and target databases have separate restricted credentials. Both deterministic and real local-model modes are exercised.

The UI visualizes recorded observations: permission boundaries, event deliveries, erasure resource states, supplier conversions/stock and player inventories. Playback is labeled with its source tool and evidence reference. The model never decides whether an invariant passed.

`docs/evidence/evaluation-summary.json` records the named baseline/live acceptance set. `docs/evidence/integration-results.txt` records 30 passing integration checks with no skips. The model has not been trained or fine-tuned for these projects; engineering fixtures are authored synthetic runtime data. Practical pages additionally use attributed public snapshots. These results are not a general model benchmark or a claim of upstream Supabase defects.

## First-time local setup

Tested on macOS Apple silicon with Node 26, Docker CLI, Colima, and Ollama. The project CLI and JS dependencies are pinned in `package-lock.json`.

```sh
cd /Users/srinivenigalla/My-Projects/supa1
npm ci
# Install local runtimes if missing:
brew install colima docker ollama
npm run services
npm run env:supabase
npm run setup:supabase
npm run setup:isolation
npm run setup:switchboard
```

The services script uses a dedicated `breakroom` VM and loopback Docker network. It does not change the active Docker context. Auth, PostgREST, Storage, Realtime and Supabase Postgres run locally. The existing internal CLI project identifier remains `supa1` to preserve its local volumes; the application is named Breakroom.

`env:supabase` generates a private `.env`; `setup:supabase` creates local Auth fixture accounts and the separate control database; `setup:isolation` assigns distinct non-superuser, non-bypass-RLS database roles. These provisioning commands deliberately rotate local fixture/database credentials; use them for initial setup or an intentional reprovision, not on every app start. No credentials are printed by these scripts.

Start the model server in another terminal:

```sh
ollama serve
```

Then download the tested model and start the app:

```sh
ollama pull qwen2.5:3b
npm run dev
```

In another terminal:

```sh
cd /Users/srinivenigalla/My-Projects/supa1
npm run worker
```

Open **http://127.0.0.1:4310**. The sandbox account selector signs in through actual Supabase Auth. Alice and Bob are fictional test identities belonging to separate workspaces. Generated passwords and privileged keys remain server-side. To expose an ordinary email/password form instead, set `DEMO_AUTH_ENABLED=false` and provision the user's workspace membership.

## Subsequent starts

Reuse `.env` and the existing data. Run `npm run services`, `ollama serve` if it is stopped, `npm run dev`, and `npm run worker`. Standard startup does not delete data. The services use several GB of disk/RAM; stop the dedicated VM with `colima stop breakroom` when finished. Stop app/worker/Ollama terminals with Ctrl-C.

The old native-Postgres development profile remains in `npm run local:db`; it is a fallback for database-only work, not the verified full Supabase profile.

## Verify and reproduce

With the worker stopped, run:

```sh
npm run build
npm test
npm run verify:auth
npm run verify:isolation
npm run verify:restart
npm run verify:erasure
npm run verify:import
npm run evaluate
```

`evaluate` runs products sequentially: AccessProof, EventMedic, ErasureCheck, ImportRescue, EconomyBreaker. Each named scenario runs once in baseline and once in live mode. Local Ollama must be running. Cost is labeled unknown; no paid API is used.

With the app and worker running:

```sh
npm run smoke
node --import tsx scripts/browser-import-upload.ts
node --import tsx scripts/browser-product.ts AccessProof
```

Browser checks use installed Chrome; set `CHROME_PATH` if its executable differs from the macOS default. Screenshots, real exported JSON evidence and reports are saved in `docs/evidence/`. They are snapshots of actual checks, not prepopulated dashboard results.

## Demo walkthrough

1. Open AccessProof; run `candidate-4` in live mode. Inspect the actual forbidden metadata read, then run its corrected candidate. Play recorded probes across the boundary diagram.
2. Open EventMedic; run `interrupted`. Follow the delivery history and operation receipts. Final stock is four, with no outstanding rental and one effect per operation.
3. Open ErasureCheck; run `delayed`. Review the exact cleanup scope before approving. Owned objects disappear; control/shared content survives; the delayed export is fenced. `incomplete` deliberately leaves resources and should fail.
4. Open ImportRescue; run `supplier-b`, or upload a quoted CSV using the sandbox BOLT/NUT catalog and R-1/R-2 receipt facts. Review the mapping and stock changes before approval. `missing-pack` abstains and `stale-approval` rejects without changing stock.
5. Open EconomyBreaker; run `withdrawal`. Switch between seeded and corrected inventories. Inspect the minimized reproduction and correction replay. Crafting accounts for two ore consumed per ingot.
6. Export the evidence bundle or replay a saved run. Replay explicitly names its source and does not execute a new experiment.

## Learn the implementation

- `docs/components.md`: what each component does and how it fits together.
- `docs/architecture.md`: accounts, roles, durable execution and transaction boundaries.
- `docs/verification.md`: actual results, official sources and test environment.
- `docs/limitations.md`: supported scope and remaining boundaries.
- `docs/hiring-evidence.md`: portfolio relevance, reviewer path and stronger follow-on projects.
- `docs/status.md`: sequential milestones and resume notes.

## Maintenance

`npm run migrate` applies pending control migrations; `npm run seed` adds missing fixture definitions without resetting data. `npm run start` serves the built app locally after `npm run build`; the dedicated worker is still required.

`npm run reset:run -- <uuid>` removes only a known finished run's target resources while preserving evidence. It refuses active runs. No production targets, arbitrary SQL console, general security scan, legal certification, supplier scraping or automatic production repair is supported. No cloud resources were created and no site was publicly deployed.

## Switchboard / Supa2

The sixth lab implements Supa2.md using the same website and shared projects. See [lab components and scope](products/switchboard/README.md), [implementation status](docs/switchboard-status.md), and [hiring project assessment](docs/hiring-projects.md). It uses actual Realtime, an independent recipient contract, durable raw ledgers, alternating repeated comparisons, unsafe/dropped/starved fixtures and bounded live local model group selection. Correctness takes precedence over measured speed.

Existing installations: `npm run services` then `npm run setup:switchboard`. If the old CLI stack omitted Realtime, perform the data-preserving restart documented in the lab README first.

With app and worker running, `npm run verify:switchboard` checks four sequential fixture cases; `npm run verify:switchboard -- --full` measures all 5/20/50 levels; add `--live` for actual model selection. `npm run verify:switchboard:browser` checks the page, playback and export in installed Chrome. With the ordinary worker stopped, `npm run verify:switchboard:lifecycle` owns its worker processes and checks real crash/reclaim and cancellation. `npm run reset:switchboard -- <finished-run-uuid>` only cleans that known run's target rows and preserves evidence.

Final Switchboard acceptance evidence is summarized in `docs/evidence/switchboard-acceptance-summary.json` (37 passing regression checks plus actual service/browser/process results). `npm run report:switchboard` validates those stored artifacts; it does not run a fresh benchmark. The full live-model comparison is deliberately inconclusive due measured coordinator delay, while the fixed matrix passed. Both planners rejected the actual seeded authorization leak. See [the measured case study](docs/switchboard-case-study.md) and [component walkthrough](docs/components.md).
