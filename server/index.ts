import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { resolve } from "node:path";
import { control, tx, ids } from "./db.ts";
import {
  contracts,
  Module,
  ExperimentSpec,
  ImportSource,
  hash,
  uuid,
} from "./contracts.ts";
import { router as switchboard } from "../products/switchboard/service.ts";
import { dataset } from "./public-data.ts";
import { applications } from "./applications.ts";
import { starter } from "./policy-passport.ts";
import { readFile } from "node:fs/promises";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
const secret = randomBytes(32);
const local = process.env.LOCAL_FIXTURE_AUTH !== "false";
const sign = (data: string) =>
  createHmac("sha256", secret).update(data).digest("hex");
function authClient() {
  const url = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
    throw Error("Auth must use local service");
  return createClient(url, process.env.SUPABASE_ANON_KEY || "missing", {
    auth: { persistSession: false },
  });
}
app.use((req, res, next) => {
  if (
    !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
      req.socket.remoteAddress || "",
    )
  )
    return res.status(403).json({ error: "Loopback only" });
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== `http://${req.headers.host}`
  )
    return res.status(403).json({ error: "Origin mismatch" });
  next();
});
app.get("/api/health", async (_req, res) => {
  let database = false;
  try {
    await control.query("select 1");
    database = true;
  } catch {}
  res.json({
    database,
    auth_mode: local ? "local fixture identities" : "Supabase Auth",
    model_configured: Boolean(process.env.MODEL_NAME),
    demo_auth: process.env.DEMO_AUTH_ENABLED === "true",
    database_provider:
      process.env.LOCAL_FIXTURE_AUTH === "false"
        ? "Supabase Postgres"
        : "Native PostgreSQL",
    storage_configured: Boolean(process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY),
    version: "0.1.0",
  });
});
app.post("/api/login", async (req, res) => {
  let session: string;
  if (local) {
    const identity = z.enum(["alice", "bob"]).parse(req.body.identity);
    const payload = Buffer.from(
      JSON.stringify({ id: ids[identity], expires: Date.now() + 3600000 }),
    ).toString("base64url");
    session = payload + "." + sign(payload);
  } else {
    const credentials =
      process.env.DEMO_AUTH_ENABLED === "true" && req.body.identity
        ? {
            email:
              z.enum(["alice", "bob"]).parse(req.body.identity) +
              "@breakroom.test",
            password: process.env.FIXTURE_PASSWORD,
          }
        : req.body;
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(credentials);
    const { data, error } = await authClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw Error("Login failed");
    session = data.session!.access_token;
  }
  res
    .cookie("breakroom", session, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 3600000,
      path: "/",
    })
    .json({ ok: true });
});
app.post("/api/logout", (_req, res) =>
  res.clearCookie("breakroom").json({ ok: true }),
);
app.use("/api", async (req, res, next) => {
  try {
    const cookie = req.headers.cookie
      ?.split("; ")
      .find((c) => c.startsWith("breakroom="))
      ?.slice(10);
    if (!cookie)
      return res.status(401).json({ error: "Sign in to your local workspace" });
    const token = decodeURIComponent(cookie);
    let user: string;
    if (local) {
      const [payload, sig] = token.split(".");
      const expected = sign(payload);
      if (
        sig?.length !== expected.length ||
        !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
      )
        throw Error("Invalid session");
      const data = JSON.parse(Buffer.from(payload, "base64url").toString());
      if (data.expires < Date.now()) throw Error("Session expired");
      user = data.id;
    } else {
      const { data, error } = await authClient().auth.getUser(token);
      if (error || !data.user) throw Error("Session invalid");
      user = data.user.id;
    }
    res.locals.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired; sign in again" });
  }
});
app.get("/api/product-data/:id", async (req, res) =>
  res.json(await dataset(req.params.id)),
);
app.get("/api/product-fit/contract", (_req, res) =>
  res
    .set("Content-Disposition", 'attachment; filename="team-isolation.json"')
    .json(starter),
);
app.get("/api/product-fit/example", async (_req, res) =>
  res
    .set(
      "Content-Disposition",
      'attachment; filename="policy-passport-seeded-example.json"',
    )
    .type("json")
    .send(
      await readFile("docs/evidence/policy-passport-candidate-1.json", "utf8"),
    ),
);
app.use("/api/applications", applications);
app.use("/api/switchboard", switchboard);
async function visibleRun(id: string, user: string) {
  z.string().uuid().parse(id);
  const r = await tx(
    control,
    async (c) =>
      (await c.query("select * from runs where id=$1", [id])).rows[0],
    user,
  );
  if (!r) throw Object.assign(Error("Run not found"), { status: 404 });
  return r;
}
app.get("/api/bootstrap", async (_req, res) => {
  const data = await tx(
    control,
    async (c) => ({
      workspaces: (await c.query("select * from workspaces")).rows,
      projects: (await c.query("select * from projects order by created_at"))
        .rows,
      runs: (
        await c.query("select * from runs order by created_at desc limit 100")
      ).rows,
    }),
    res.locals.user,
  );
  res.json({ ...data, contracts, user: res.locals.user });
});
app.post("/api/projects", async (req, res) => {
  const p = z
    .object({
      workspace_id: z.string().uuid(),
      name: z.string().trim().min(1).max(80),
    })
    .parse(req.body);
  const project = await tx(
    control,
    async (c) =>
      (
        await c.query(
          "insert into projects(id,workspace_id,name) values($1,$2,$3) returning *",
          [uuid(), p.workspace_id, p.name],
        )
      ).rows[0],
    res.locals.user,
  );
  res.json(project);
});
app.post("/api/runs", async (req, res) => {
  const p = z
    .object({
      project_id: z.string().uuid(),
      module: Module,
      scenario: z.string(),
      mode: z.enum(["baseline", "live", "replay"]).default("baseline"),
      parent_id: z.string().uuid().optional(),
      import_source: ImportSource.optional(),
    })
    .parse(req.body);
  if (
    !(contracts[p.module].scenarios as readonly string[]).includes(p.scenario)
  )
    throw Error("Unsupported scenario");
  const project = await tx(
    control,
    async (c) =>
      (await c.query("select * from projects where id=$1", [p.project_id]))
        .rows[0],
    res.locals.user,
  );
  if (!project) throw Error("Project not found");
  if (p.parent_id) {
    const source = await visibleRun(p.parent_id, res.locals.user);
    if (
      source.project_id !== p.project_id ||
      source.spec.supported_parameters.module !== p.module
    )
      throw Error("Source run belongs to another product or project");
    if (
      p.mode === "replay" &&
      source.spec.supported_parameters.scenario !== p.scenario
    )
      throw Error("Replay scenario must match source");
  }
  if (p.import_source && p.module !== "ImportRescue")
    throw Error("CSV source belongs to ImportRescue only");
  if (p.mode === "replay" && !p.parent_id)
    throw Error("Replay requires source");
  const spec = ExperimentSpec.parse({
    version: 1,
    project_id: p.project_id,
    contract_hash: hash(contracts[p.module]),
    fixture_version: p.module + "-v1",
    seed: 17,
    supported_parameters: {
      module: p.module,
      scenario: p.scenario,
      mode: p.mode,
      parent_id: p.parent_id,
      import_source: p.import_source,
    },
    limits: {
      steps: 16,
      milliseconds: 120000,
      tokens: 16000,
      estimated_spend: 0,
    },
  });
  const id = uuid();
  await control.query(
    "insert into runs(id,workspace_id,project_id,fixture_version,spec,config_hash,parent_id) values($1,$2,$3,$4,$5,$6,$7)",
    [
      id,
      project.workspace_id,
      p.project_id,
      spec.fixture_version,
      spec,
      hash(spec),
      p.parent_id || null,
    ],
  );
  res.status(201).json({ id });
});
app.get("/api/runs/:id", async (req, res) => {
  const run = await visibleRun(req.params.id, res.locals.user);
  const detail = await tx(
    control,
    async (c) => {
      const out: any = { run };
      for (const table of [
        "steps",
        "tool_calls",
        "artifacts",
        "findings",
        "approvals",
      ])
        out[table] = (
          await c.query(`select * from ${table} where run_id=$1`, [run.id])
        ).rows;
      return out;
    },
    res.locals.user,
  );
  res.json(detail);
});
app.get("/api/runs/:id/export", async (req, res) => {
  const run = await visibleRun(req.params.id, res.locals.user);
  const bundle: any = {
    format: "breakroom.evidence.v1",
    exported_at: new Date().toISOString(),
    run,
  };
  await tx(
    control,
    async (c) => {
      for (const table of ["steps", "tool_calls", "artifacts", "findings"])
        bundle[table] = (
          await c.query(`select * from ${table} where run_id=$1`, [run.id])
        ).rows;
    },
    res.locals.user,
  );
  res.attachment("breakroom-" + run.id + ".json").json(bundle);
});
app.post("/api/runs/:id/cancel", async (req, res) => {
  const r = await visibleRun(req.params.id, res.locals.user);
  await control.query(
    "update runs set cancel_requested=true,status=case when status='queued' then 'cancelled' else status end,updated_at=now() where id=$1 and status in ('queued','running')",
    [r.id],
  );
  res.json({ ok: true });
});
app.post("/api/runs/:id/approve", async (req, res) => {
  const r = await visibleRun(req.params.id, res.locals.user);
  const body = z
    .object({
      approval_id: z.string().uuid(),
      action_hash: z.string().length(64),
    })
    .parse(req.body);
  const a = (
    await control.query("select * from approvals where id=$1 and run_id=$2", [
      body.approval_id,
      r.id,
    ])
  ).rows[0];
  if (
    !a ||
    a.action_hash !== body.action_hash ||
    hash(a.plan) !== body.action_hash ||
    new Date(a.expires_at).getTime() < Date.now()
  )
    throw Error("Exact approval is stale or expired");
  await control.query(
    "update approvals set approved_by=$1,approved_at=now() where id=$2",
    [res.locals.user, a.id],
  );
  // Approval only authorizes work. The dedicated worker executes the mutation in a new bounded run phase.
  await control.query(
    "update runs set status='queued',lease_until=null,deadline_at=now()+interval '120 seconds',attempts=0,updated_at=now() where id=$1 and status='completed'",
    [r.id],
  );
  res.json({ ok: true });
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API route not found" }),
);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(JSON.stringify({ event: "api.error", message: err.message }));
  res.status(err.status || 400).json({
    error:
      err instanceof z.ZodError
        ? "Invalid request"
        : err.message || "Request failed",
  });
});
const port = Number(process.env.PORT || 4310);
app.listen(port, "127.0.0.1", () =>
  console.log("Breakroom: http://127.0.0.1:" + port),
);
