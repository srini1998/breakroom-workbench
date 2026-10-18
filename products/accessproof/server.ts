import { target, tx, schema } from "../../server/db.ts";
import { accessSession, installProbeRpc } from "./supabase.ts";
import type { AgentAction } from "../../server/contracts.ts";
const people = {
  owner: "10000000-0000-4000-8000-000000000001",
  member: "10000000-0000-4000-8000-000000000002",
  contractor: "10000000-0000-4000-8000-000000000003",
};
// Evaluator-only manifest. This module is never supplied to the model or shipped to the browser.
const faults: Record<string, string> = {
  "candidate-1": "tenant_read",
  "candidate-2": "document_update",
  "candidate-3": "owner_transfer",
  "candidate-4": "attachment_read",
  "candidate-5": "contractor_filter",
};
export async function prepareAccess(run: string, candidate: string) {
  const s = schema(run),
    fault = faults[candidate] || "";
  if (process.env.LOCAL_FIXTURE_AUTH === "false") await installProbeRpc();
  await tx(target, async (c) => {
    await c.query("select pg_advisory_xact_lock(hashtext($1))", [s]);
    if (
      (await c.query("select 1 from pg_namespace where nspname=$1", [s]))
        .rowCount
    )
      return;
    await c.query(`create schema ${s}; grant usage on schema ${s} to authenticated;
 create table ${s}.project_memberships(user_id uuid primary key,tenant text not null, role text not null);
 insert into ${s}.project_memberships values('${people.owner}','a','owner'),('${people.member}','a','member'),('${people.contractor}','a','contractor');
 create table ${s}.profiles(user_id uuid primary key,claimed_role text not null);insert into ${s}.profiles select user_id,'member' from ${s}.project_memberships;alter table ${s}.profiles enable row level security;create policy profile_self on ${s}.profiles for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());grant update(claimed_role) on ${s}.profiles to authenticated;
 create table ${s}.projects(id text primary key,tenant text not null,owner_id uuid not null,title text not null,assigned_to uuid);
 insert into ${s}.projects values('a-assigned','a','${people.owner}','Assigned project','${people.contractor}'),('a-unassigned','a','${people.owner}','Unassigned project',null),('b-secret','b','20000000-0000-4000-8000-000000000001','Other tenant project',null);
 create table ${s}.documents(id text primary key,project_id text references ${s}.projects,tenant text not null,body text not null);
 insert into ${s}.documents values('doc-a','a-assigned','a','Original'),('doc-b','b-secret','b','Foreign content');
 create table ${s}.attachment_records(id text primary key,project_id text references ${s}.projects,tenant text not null,path text not null);
 insert into ${s}.attachment_records values('attachment-a','a-assigned','a','a/report.pdf'),('attachment-b','b-secret','b','b/private.pdf');
 alter table ${s}.project_memberships enable row level security;
 create policy self on ${s}.project_memberships for select to authenticated using(user_id=(select auth.uid()));
 alter table ${s}.projects enable row level security;
 create policy read_projects on ${s}.projects for select to authenticated using(${fault === "tenant_read" ? `exists(select 1 from ${s}.project_memberships m where m.user_id=auth.uid() and (m.role<>'contractor' or projects.assigned_to=m.user_id))` : `exists(select 1 from ${s}.project_memberships m where m.user_id=(select auth.uid()) and m.tenant=projects.tenant ${fault === "contractor_filter" ? "" : "and (m.role <> 'contractor' or projects.assigned_to=m.user_id)"})`});
 create policy update_projects on ${s}.projects for update to authenticated using(exists(select 1 from ${s}.project_memberships m where m.user_id=(select auth.uid()) and m.tenant=projects.tenant and m.role in ('owner','member'))) with check(exists(select 1 from ${s}.project_memberships m where m.user_id=(select auth.uid()) and m.tenant=projects.tenant));
 create function ${s}.protect_owner() returns trigger language plpgsql security invoker as $$ begin if new.owner_id<>old.owner_id and ${fault === "owner_transfer" ? "false" : `not exists(select 1 from ${s}.project_memberships where user_id=auth.uid() and role='owner')`} then raise exception 'owner transfer forbidden' using errcode='42501'; end if; return new; end $$;
 create trigger owner_guard before update on ${s}.projects for each row execute function ${s}.protect_owner();
 alter table ${s}.documents enable row level security;
 create policy read_documents on ${s}.documents for select to authenticated using(exists(select 1 from ${s}.projects p where p.id=documents.project_id));
 create policy write_documents on ${s}.documents for update to authenticated using(exists(select 1 from ${s}.project_memberships m where m.user_id=auth.uid() and m.tenant=documents.tenant and ${fault === "document_update" ? "m.role in ('owner','member')" : "m.role='owner'"})) with check(exists(select 1 from ${s}.project_memberships m where m.user_id=auth.uid() and m.tenant=documents.tenant));
 alter table ${s}.attachment_records enable row level security;
 create policy read_attachments on ${s}.attachment_records for select to authenticated using(${fault === "attachment_read" ? "true" : `exists(select 1 from ${s}.project_memberships m where m.user_id=auth.uid() and m.tenant=attachment_records.tenant) and exists(select 1 from ${s}.projects p where p.id=attachment_records.project_id)`});
 grant select on all tables in schema ${s} to authenticated; grant update(body) on ${s}.documents to authenticated; grant update(owner_id,title) on ${s}.projects to authenticated;`);
  });
}
export async function probeAccess(
  run: string,
  action: Extract<AgentAction, { tool: "probe_access" }>,
) {
  const s = schema(run);
  const { identity, operation } = action;
  // Public contract-derived oracle; independent from fault/implementation selection.
  const expected =
    (operation === "profile_escalation" && identity === "owner") ||
    operation === "read_own" ||
    (operation === "write_own" && identity === "owner") ||
    (operation === "update" && identity === "owner") ||
    (operation === "reassign" && identity === "owner") ||
    (operation === "unassigned" && identity !== "contractor");
  const queries = {
    profile_escalation: `update ${s}.documents set body='Profile escalation edit' where id='doc-a' returning id`,
    read_own: `select id from ${s}.projects where id='a-assigned'`,
    write_own: `update ${s}.documents set body='Owner edit' where id='doc-a' returning id`,
    read_foreign: `select id from ${s}.projects where id='b-secret'`,
    update: `update ${s}.documents set body='Member edit' where id='doc-a' returning id`,
    reassign: `update ${s}.projects set owner_id='${people.member}' where id='a-assigned' returning id,owner_id`,
    attachment: `select id,path from ${s}.attachment_records where id='attachment-b'`,
    unassigned: `select id from ${s}.projects where id='a-unassigned'`,
  };
  let rows: unknown[] = [],
    denial: string | null = null;
  try {
    if (process.env.LOCAL_FIXTURE_AUTH === "false") {
      const client = await accessSession(identity);
      const response = await client.rpc("breakroom_access_probe", {
        run_id: run,
        operation,
      });
      if (response.error) throw response.error;
      rows = response.data || [];
    } else {
      rows = await tx(
        target,
        async (c) => {
          if (operation === "profile_escalation")
            await c.query(
              `update ${s}.profiles set claimed_role='owner' where user_id=auth.uid()`,
            );
          return (await c.query(queries[operation])).rows;
        },
        people[identity],
      );
    }
  } catch (e) {
    if ((e as { code?: string }).code !== "42501") throw e;
    denial = "permission denied";
  }
  return {
    invariant_id: "access." + operation,
    identity,
    session_user_id: people[identity],
    operation,
    expected,
    actual: rows.length > 0,
    rows,
    denial,
    scope:
      process.env.LOCAL_FIXTURE_AUTH === "false"
        ? "Real Supabase Auth JWT → PostgREST security-invoker RPC → RLS; attachment metadata only"
        : "Bounded SQL session with authenticated role and subject; attachment metadata only",
    passed: expected === rows.length > 0,
  };
}
