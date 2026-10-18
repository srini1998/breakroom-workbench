import { switchNext } from "../products/switchboard/service.ts";
import { control, target } from "../server/db.ts";
import { uuid } from "../server/contracts.ts";
try {
  await switchNext(uuid());
} finally {
  await control.end();
  await target.end();
  process.exit(0);
}
