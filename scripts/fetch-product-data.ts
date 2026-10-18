import { writeFile, readFile } from "node:fs/promises";
import { hash } from "../server/contracts.ts";
const get = async (url: string) => {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Breakroom local portfolio research",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw Error(`${new URL(url).hostname}: ${r.status}`);
  const s = await r.text();
  if (s.length > 5000000) throw Error("Dataset too large");
  return { json: JSON.parse(s), hash: hash(s) };
};
const now = new Date().toISOString();
const quake = await get(
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
);
await writeFile(
  "data/public/earthquakes.json",
  JSON.stringify(
    {
      id: "earthquakes",
      name: "USGS earthquake observations",
      url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
      feed_url:
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
      retrieved_at: now,
      period:
        "Past-day feed snapshot; not a continuously connected alert service",
      license: "USGS-produced data: public domain; see USGS copyright policy",
      attribution: "U.S. Geological Survey Earthquake Hazards Program",
      source_fingerprint_sha256: quake.hash,
      transformation:
        "First 20 features; public ID, place, magnitude, origin time and source URL only. Replayed as application updates, not newly detected earthquakes.",
      rows: quake.json.features.slice(0, 20).map((f: any) => ({
        id: f.id,
        name: f.properties.place,
        magnitude: f.properties.mag,
        date: new Date(f.properties.time).toISOString(),
        url: f.properties.url,
      })),
    },
    null,
    2,
  ),
);
const info = await get(
    "https://gbfs.citibikenyc.com/gbfs/en/station_information.json",
  ),
  status = await get(
    "https://gbfs.citibikenyc.com/gbfs/en/station_status.json",
  );
const names = new Map(
  info.json.data.stations.map((s: any) => [s.station_id, s]),
);
await writeFile(
  "data/public/stations.json",
  JSON.stringify(
    {
      id: "stations",
      name: "Citi Bike public station availability",
      url: "https://citibikenyc.com/system-data",
      license:
        "NYCBS Data Use Policy — https://citibikenyc.com/data-sharing-policy",
      attribution:
        "Citi Bike / NYC Bike Share, GBFS public feed. No affiliation.",
      retrieved_at: now,
      period:
        "Availability observed at retrieval, not current availability after this timestamp",
      source_fingerprint_sha256: hash([info.hash, status.hash]),
      transformation:
        "First 12 installed stations with at least 2 bikes; public station metadata only. Subsequent checkout/return actions are local simulations, not real rides.",
      rows: status.json.data.stations
        .filter(
          (s: any) =>
            s.is_installed &&
            s.num_bikes_available >= 2 &&
            names.has(s.station_id),
        )
        .slice(0, 12)
        .map((s: any) => ({
          id: s.station_id,
          name: (names.get(s.station_id) as any).name,
          bikes: s.num_bikes_available,
          docks: s.num_docks_available,
          reported_at: s.last_reported,
        })),
    },
    null,
    2,
  ),
);
const issues = await get(
  "https://api.github.com/repos/supabase/supabase/issues?state=open&per_page=30",
);
await writeFile(
  "data/public/issues.json",
  JSON.stringify(
    {
      id: "issues",
      name: "Supabase public GitHub issue titles",
      url: "https://github.com/supabase/supabase/issues",
      license:
        "Public issue metadata; linked to original posts. No author/body data copied.",
      attribution:
        "Public contributors to supabase/supabase. No endorsement or affiliation.",
      retrieved_at: now,
      period: "Open-issue snapshot at retrieval",
      source_fingerprint_sha256: issues.hash,
      transformation:
        "First 8 non-PR titles, IDs, URLs and dates. Fictional project/team assignments are added locally; these are not real private customer tickets.",
      rows: issues.json
        .filter((i: any) => !i.pull_request)
        .slice(0, 8)
        .map((i: any) => ({
          id: String(i.number),
          name: i.title,
          url: i.html_url,
          date: i.updated_at,
        })),
    },
    null,
    2,
  ),
);
const commit = await get(
  "https://api.github.com/repos/luanti-org/minetest_game/commits?path=mods/default/crafting.lua&per_page=1",
);
const revision = commit.json[0].sha;
const r = await fetch(
  `https://raw.githubusercontent.com/luanti-org/minetest_game/${revision}/mods/default/crafting.lua`,
);
if (!r.ok) throw Error("Craft source unavailable");
const lua = await r.text();
const recipes = ["steel", "copper", "gold"].map((m) => {
  const block = lua.match(
    new RegExp('output = "default:' + m + 'block",[\\s\\S]*?\\n\\}\\)'),
  );
  if (!block || block[0].split("default:" + m + "_ingot").length - 1 !== 9)
    throw Error("Recipe changed; review before importing");
  return {
    id: m,
    name: m[0].toUpperCase() + m.slice(1) + " block",
    input: m + " ingot",
    input_units: 9,
    output_units: 1,
  };
});
await writeFile(
  "data/public/recipes.json",
  JSON.stringify(
    {
      id: "recipes",
      name: "Luanti Minetest Game crafting rules",
      url: `https://github.com/luanti-org/minetest_game/blob/${revision}/mods/default/crafting.lua`,
      license:
        "Recipe facts extracted from LGPL-2.1-or-later source; upstream license retained at repository.",
      attribution: "Minetest Game contributors / luanti-org",
      retrieved_at: now,
      period: "Pinned source revision " + revision,
      source_fingerprint_sha256: hash(lua),
      transformation:
        "Three verified 9-ingot → 1-block recipe facts. Starting balances and player actions are authored local examples, not real player telemetry.",
      rows: recipes,
    },
    null,
    2,
  ),
);
console.log(
  "Saved actual USGS, Citi Bike, GitHub and pinned crafting snapshots with attribution and transformations.",
);
