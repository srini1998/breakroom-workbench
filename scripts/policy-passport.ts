import { readFile, writeFile } from "node:fs/promises";
import { compareContract, starter } from "../server/policy-passport.ts";
import { control, target } from "../server/db.ts";
const candidate =
  process.argv.find((a) => a.startsWith("--candidate="))?.split("=")[1] ||
  "clean";
const file = process.argv
  .find((a) => a.startsWith("--contract="))
  ?.slice("--contract=".length);
try {
  const contract = file ? JSON.parse(await readFile(file, "utf8")) : starter;
  const report = await compareContract(contract, candidate);
  await writeFile(
    `docs/evidence/policy-passport-${candidate}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      result: report.result,
      baseline: report.baseline.result,
      candidate: report.candidate.result,
      changed_permissions: report.changes,
      violations: report.candidate.violations,
    }),
  );
  process.exitCode = report.result === "pass" ? 0 : 1;
} finally {
  await control.end();
  await target.end();
}
