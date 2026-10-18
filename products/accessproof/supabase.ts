import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { target } from "../../server/db.ts";
const clients = new Map<string, SupabaseClient>();
export async function accessSession(identity: string) {
  if (!["owner", "member", "contractor", "alice", "bob"].includes(identity))
    throw Error("Unknown fixture identity");
  let client = clients.get(identity);
  if (client) {
    const session = await client.auth.getSession();
    if ((session.data.session?.expires_at || 0) * 1000 > Date.now() + 30000)
      return client;
  }
  client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword({
    email: identity + "@breakroom.test",
    password: process.env.FIXTURE_PASSWORD!,
  });
  if (error) throw error;
  clients.set(identity, client);
  return client;
}
export async function installProbeRpc() {
  await target.query(`
create or replace function public.breakroom_access_probe(run_id uuid,operation text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s text; result jsonb; q text;
begin
 s:='r_'||replace(run_id::text,'-','');
 if operation='profile_escalation' then execute format('update %I.profiles set claimed_role=''owner'' where user_id=auth.uid()',s);end if;
 case operation
 when 'read_own' then q:=format('select id from %I.projects where id=''a-assigned''',s);
 when 'read_foreign' then q:=format('select id from %I.projects where id=''b-secret''',s);
 when 'attachment' then q:=format('select id,path from %I.attachment_records where id=''attachment-b''',s);
 when 'unassigned' then q:=format('select id from %I.projects where id=''a-unassigned''',s);
 when 'write_own','update','profile_escalation' then
 execute format('with changed as (update %I.documents set body=''Authenticated API edit'' where id=''doc-a'' returning id) select coalesce(jsonb_agg(changed),''[]''::jsonb) from changed',s) into result;return result;
 when 'reassign' then
 execute format('with changed as (update %I.projects set owner_id=''10000000-0000-4000-8000-000000000002'' where id=''a-assigned'' returning id,owner_id) select coalesce(jsonb_agg(changed),''[]''::jsonb) from changed',s) into result;return result;
 else raise exception 'unsupported bounded operation';
 end case;
 execute 'select coalesce(jsonb_agg(t),''[]''::jsonb) from ('||q||') t' into result;
 return result;
end $$;
revoke all on function public.breakroom_access_probe(uuid,text) from public,anon;
grant execute on function public.breakroom_access_probe(uuid,text) to authenticated;
notify pgrst,'reload schema';`);
}
