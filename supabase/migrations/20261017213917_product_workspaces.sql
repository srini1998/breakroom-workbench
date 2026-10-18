create table application_cases (
 id uuid primary key,project_id uuid not null,workspace_id uuid not null references workspaces,
 slug text not null check(slug in ('accessproof','eventmedic','erasurecheck','importrescue','economybreaker')),
 source jsonb not null,state jsonb not null,events jsonb not null default '[]',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(project_id,workspace_id) references projects(id,workspace_id)
);
alter table application_cases enable row level security;
create policy workspace_case on application_cases for select to authenticated using(exists(select 1 from memberships m where m.workspace_id=application_cases.workspace_id and m.user_id=(select auth.uid())));
grant select on application_cases to authenticated;
create index application_project on application_cases(project_id,slug,created_at desc);
