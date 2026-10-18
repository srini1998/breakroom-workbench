-- Reviewed local fixture. Applied with local bootstrap admin; no browser has these credentials.
create table if not exists public.switch_members(user_id uuid primary key,tenant int not null check(tenant in (1,2)),role text not null check(role in ('owner','viewer')));
alter table public.switch_members enable row level security;
drop policy if exists own_membership on public.switch_members;
create policy own_membership on public.switch_members for select to authenticated using(user_id=(select auth.uid()));
grant select on public.switch_members to authenticated;
insert into public.switch_members values
('20000000-0000-4000-8000-000000000001',1,'owner'),('20000000-0000-4000-8000-000000000002',1,'viewer'),
('20000000-0000-4000-8000-000000000003',2,'owner'),('20000000-0000-4000-8000-000000000004',2,'viewer') on conflict do nothing;
create table if not exists public.switch_orders (
 id uuid primary key,run_id uuid not null,experiment_id uuid not null,tenant int not null check(tenant in (1,2)),
 event_id uuid not null,seq int not null,seed int not null,version int not null,payload text not null,
 transport text not null check(transport in ('changes','broadcast')),variant text not null check(variant in ('scoped','broad','dropped','starved'))
);
alter table public.switch_orders owner to breakroom_target_owner;
alter table public.switch_orders enable row level security;
drop policy if exists observe_tenant on public.switch_orders;
create policy observe_tenant on public.switch_orders for select to authenticated using(exists(select 1 from public.switch_members m where m.user_id=(select auth.uid()) and m.tenant=switch_orders.tenant));
drop policy if exists owner_insert on public.switch_orders;
create policy owner_insert on public.switch_orders for insert to authenticated with check(exists(select 1 from public.switch_members m where m.user_id=(select auth.uid()) and m.tenant=switch_orders.tenant and m.role='owner'));
drop policy if exists owner_update on public.switch_orders;
create policy owner_update on public.switch_orders for update to authenticated using(exists(select 1 from public.switch_members m where m.user_id=(select auth.uid()) and m.tenant=switch_orders.tenant and m.role='owner')) with check(exists(select 1 from public.switch_members m where m.user_id=(select auth.uid()) and m.tenant=switch_orders.tenant and m.role='owner'));
grant select,insert,update on public.switch_orders to authenticated;
grant select on public.switch_orders to anon;
-- Private internal trigger is the only caller of the privileged Broadcast function.
create schema if not exists breakroom_internal;
create or replace function breakroom_internal.switch_emit() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if TG_OP='UPDATE' and (NEW.tenant<>OLD.tenant or NEW.experiment_id<>OLD.experiment_id or NEW.run_id<>OLD.run_id or NEW.transport<>OLD.transport or NEW.variant<>OLD.variant) then raise exception 'Fixture ownership and transport are immutable';end if;
 if NEW.transport='broadcast' then
 perform realtime.broadcast_changes('switch:'||NEW.experiment_id::text||':'||NEW.variant||':'||NEW.tenant::text,TG_OP,TG_OP,TG_TABLE_NAME,TG_TABLE_SCHEMA,NEW,OLD);
 end if; return NEW;end $$;
revoke all on function breakroom_internal.switch_emit() from public,anon,authenticated;
drop trigger if exists switch_emit on public.switch_orders;
create trigger switch_emit after insert or update on public.switch_orders for each row execute function breakroom_internal.switch_emit();
drop policy if exists switch_receive on realtime.messages;
create policy switch_receive on realtime.messages for select to authenticated using (
 extension='broadcast' and (select realtime.topic()) ~ '^switch:[0-9a-f-]{36}:(scoped|broad|dropped|starved):[12]$'
 and exists(select 1 from public.switch_members m where m.user_id=(select auth.uid()) and (
 split_part((select realtime.topic()),':',3)='broad' or split_part((select realtime.topic()),':',4)=m.tenant::text))
);
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='switch_orders') then alter publication supabase_realtime add table public.switch_orders;end if;end $$;
create index if not exists switch_orders_experiment on public.switch_orders(experiment_id);
notify pgrst,'reload schema';
