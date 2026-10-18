import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
// Local-only credentials are saved in gitignored .env; never printed or exported to browsers.
const result = execFileSync("npx", ["supabase", "status", "--output", "json"], {
  encoding: "utf8",
  env: {
    ...process.env,
    DOCKER_HOST:
      process.env.DOCKER_HOST ||
      (existsSync(homedir() + "/.colima/breakroom/docker.sock")
        ? "unix://" + homedir() + "/.colima/breakroom/docker.sock"
        : undefined),
  },
});
const status = JSON.parse(result.slice(result.indexOf("{")));
if (!status.DB_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY)
  throw Error("Local Supabase status missing required values");
const target = new URL(status.DB_URL);
if (!["127.0.0.1", "localhost"].includes(target.hostname))
  throw Error("Local stack only");
const control = new URL(target);
control.pathname = "/breakroom_control";
await writeFile(
  ".env",
  [
    `DATABASE_URL=${control}`,
    `TARGET_DATABASE_URL=${target}`,
    `LOCAL_FIXTURE_AUTH=false`,
    `DEMO_AUTH_ENABLED=true`,
    `SUPABASE_URL=${status.API_URL}`,
    `SUPABASE_ANON_KEY=${status.ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
    `TARGET_SUPABASE_URL=${status.API_URL}`,
    `TARGET_SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
    `FIXTURE_PASSWORD=${randomBytes(24).toString("base64url")}`,
    `MODEL_BASE_URL=http://127.0.0.1:11434/v1`,
    `MODEL_NAME=qwen2.5:3b`,
    `MODEL_TIMEOUT_MS=30000`,
    "",
  ].join("\n"),
  { mode: 0o600 },
);
console.log(
  "Saved local Supabase profile to gitignored .env (secrets omitted). Next: npm run setup:supabase.",
);
