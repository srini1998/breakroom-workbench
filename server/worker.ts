import { claim, runClaimed } from "./runtime.ts";
import { uuid } from "./contracts.ts";
import { control, target } from "./db.ts";
import { switchNext } from "../products/switchboard/service.ts";
const worker = uuid();
let stopped = false;
process.on("SIGINT", () => (stopped = true));
process.on("SIGTERM", () => (stopped = true));
console.log(JSON.stringify({ event: "worker.started", worker_id: worker }));
while (!stopped) {
  try {
    const run = await claim(worker);
    if (run) await runClaimed(run);
    else if (!(await switchNext(worker)))
      await new Promise((r) => setTimeout(r, 700));
  } catch (e) {
    console.error(
      JSON.stringify({
        event: "worker.error",
        worker_id: worker,
        message: (e as Error).message,
      }),
    );
    await new Promise((r) => setTimeout(r, 2000));
  }
}
await control.end();
await target.end();
