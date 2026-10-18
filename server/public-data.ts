import { readFile } from "node:fs/promises";
import { z } from "zod";
import { hash } from "./contracts.ts";
export const DatasetId = z.enum([
  "earthquakes",
  "stations",
  "issues",
  "retail",
  "recipes",
]);
export async function dataset(raw: string) {
  const id = DatasetId.parse(raw);
  const d = JSON.parse(await readFile(`data/public/${id}.json`, "utf8"));
  if (!Array.isArray(d.rows) || !d.rows.length || d.rows.length > 32)
    throw Error("Public dataset unavailable");
  return { ...d, content_hash: hash(d) };
}
