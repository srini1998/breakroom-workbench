create table switch_runs (
 id uuid primary key, workspace_id uuid not null references workspaces, project_id uuid not null,
 fixture_version text not null references fixture_versions, spec jsonb not null, config_hash text not null,
 parent_id uuid references switch_runs, status text not null default 'queued' check(status in ('queued','running','completed','failed','cancelled')),
 verdict jsonb, created_at timestamptz default now(), updated_at timestamptz default now(),
 lease_until timestamptz, worker_id uuid, attempts int default 0, cancel_requested boolean default false,
 deadline_at timestamptz default now()+interval '12 minutes',
 foreign key(project_id,workspace_id) references projects(id,workspace_id), unique(id,workspace_id)
);
create table switch_experiments (
 id uuid primary key, run_id uuid not null, workspace_id uuid not null,
 ordinal int not null, config jsonb not null, config_hash text not null, status text not null,
 summary jsonb, created_at timestamptz default now(),
 foreign key(run_id,workspace_id) references switch_runs(id,workspace_id),unique(run_id,ordinal)
);
create table switch_operations (
 run_id uuid not null, workspace_id uuid not null, experiment_id uuid not null references switch_experiments,
 event_id uuid not null, seq int not null, observation jsonb not null,
 foreign key(run_id,workspace_id) references switch_runs(id,workspace_id),primary key(experiment_id,event_id)
);
create table switch_receipts (
 id bigint generated always as identity primary key,run_id uuid not null,workspace_id uuid not null,
 experiment_id uuid not null references switch_experiments,observation jsonb not null,
 foreign key(run_id,workspace_id) references switch_runs(id,workspace_id)
);
create table switch_evidence (
 id uuid primary key,run_id uuid not null,workspace_id uuid not null,kind text not null,content jsonb not null,content_hash text not null,created_at timestamptz default now(),
 foreign key(run_id,workspace_id) references switch_runs(id,workspace_id)
);
do $$ declare t text; begin foreach t in array array['switch_runs','switch_experiments','switch_operations','switch_receipts','switch_evidence'] loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy workspace_access on %I for select to authenticated using(exists(select 1 from memberships m where m.workspace_id=%I.workspace_id and m.user_id=(select auth.uid())))',t,t);
 execute format('grant select on %I to authenticated',t);
 end loop; end $$;
create index switch_claim on switch_runs(status,lease_until,created_at);
create index switch_receipts_experiment on switch_receipts(experiment_id);
create index switch_evidence_run on switch_evidence(run_id);
