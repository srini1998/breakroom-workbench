# Actual public data used in the practical pages

These are small recorded snapshots, not generated records and not continuous live feeds. Every JSON records source URL, retrieval time, attribution, period, transformations and a source fingerprint. Pages show source provenance and distinguish derived local actions from facts about the provider. No source system is modified.

| File | Source and purpose | Boundaries |
|---|---|---|
| earthquakes.json | USGS past-day GeoJSON observations → Switchboard update payloads | 20 recorded observations. Replaying them through local Supabase is not a new earthquake detection or a warning service. |
| stations.json | Citi Bike public GBFS information/status → EventMedic starting availability | 12 observed stations. Local checkout/return events are synthetic; no rides/reservations are made. Data use policy: https://citibikenyc.com/data-sharing-policy |
| issues.json | Public supabase/supabase issue metadata → AccessProof work desk | Eight titles/URLs/IDs; no author/body data. Team assignments/roles are fictional; no GitHub changes or private support data. |
| retail.json | Chen, D. (2015), UCI Online Retail, DOI 10.24432/C5BW33, CC BY 4.0 → import/deletion examples | First 24 positive-quantity historical rows, not a representative sample. CustomerID, InvoiceNo and Country excluded. Actual period 2010–2011; not current sales/supplier deliveries. |
| recipes.json | Three ingredient/output recipe facts from a pinned luanti-org/minetest_game source revision | Real 9-ingot → 1-block facts, authored player balances. Upstream LGPL-2.1-or-later source is linked; no source code/game assets redistributed. |

For the four JSON/text API sources, `source_fingerprint_sha256` is SHA-256 of JSON-encoded source text (the same canonical helper as the application); the station fingerprint combines two text fingerprints. It is not a raw byte checksum. `content_hash`, added when served, hashes the full sanitized JSON snapshot. The UCI `raw_sha256` is the downloaded ZIP byte checksum. Older execution artifacts retain the initial metadata field spelling and original snapshot fingerprint; their actual observation rows remain recorded.

Refresh four public API/source snapshots with `npm run data:refresh`; this is an explicit operator action, not a background scraper. Snapshot changes do not update already-created application cases. Switchboard freezes selected rows and source metadata at scheduling, and current runs include serialized source metadata for fingerprint verification.

The retail snapshot is included. To reproduce extraction, download the ZIP from its recorded official URL and run `python3 scripts/extract-retail-data.py /path/to/online+retail.zip`. This uses only Python's standard library for one-time XLSX preprocessing; web/worker runtime remains TypeScript. It reads only the necessary selected columns; the output excludes customer and invoice identifiers. The upstream file is not committed.

USGS policies: https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
API documentation: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
Citi Bike source documentation: https://citibikenyc.com/system-data
UCI source/license: https://archive.ics.uci.edu/dataset/352/online+retail
GitHub issue API: https://docs.github.com/en/rest/issues/issues
