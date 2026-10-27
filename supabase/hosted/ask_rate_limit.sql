-- Hosted project "breakroom-ask" only (not part of the local stack migrations).
-- Per-visitor hourly cap plus a site-wide daily cap for the ask-breakroom Edge Function.
create table if not exists public.ask_usage (
  visitor_hash text not null,          -- daily-salted SHA-256 of the IP; no raw IPs stored
  window_start timestamptz not null,
  calls int not null default 0,
  primary key (visitor_hash, window_start)
);
alter table public.ask_usage enable row level security;   -- no policies: anon/authenticated get nothing
revoke all on public.ask_usage from anon, authenticated;

create or replace function public.take_ask_slot(p_visitor text, p_per_hour int, p_per_day_total int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calls int;
  v_day_total int;
begin
  select coalesce(sum(calls), 0) into v_day_total
    from public.ask_usage where window_start >= date_trunc('day', now());
  if v_day_total >= p_per_day_total then
    return false;
  end if;
  insert into public.ask_usage as u (visitor_hash, window_start, calls)
    values (p_visitor, date_trunc('hour', now()), 1)
    on conflict (visitor_hash, window_start) do update set calls = u.calls + 1
    returning calls into v_calls;
  delete from public.ask_usage where window_start < now() - interval '2 days';
  return v_calls <= p_per_hour;
end;
$$;
revoke all on function public.take_ask_slot(text, int, int) from public, anon, authenticated;
grant execute on function public.take_ask_slot(text, int, int) to service_role;
