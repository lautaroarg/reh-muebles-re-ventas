begin;

create schema if not exists flowsystem_private;
revoke all on schema flowsystem_private from public, anon, authenticated;
grant usage on schema flowsystem_private to authenticated;

create function flowsystem_private.valid_document(client_key text, payload jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  record_value jsonb;
  record_kind text;
  allowed_categories text[];
  total_cents numeric := 0;
  date_value date;
begin
  allowed_categories := case client_key
    when 'hg-galvan' then array['Frente de parrilla','Interior','Proyecto completo']
    when 'reh-muebles-re' then array['Sillones','Juegos de comedor','Muebles a medida','Otros']
    else null end;
  if allowed_categories is null or payload is null or jsonb_typeof(payload) <> 'object'
    or payload->>'clientId' is distinct from client_key
    or payload->'schemaVersion' is distinct from '1'::jsonb
    or jsonb_typeof(payload->'sales') is distinct from 'array'
    or jsonb_typeof(payload->'spend') is distinct from 'array' then return false; end if;
  if jsonb_array_length(payload->'sales') + jsonb_array_length(payload->'spend') > 20000
    or octet_length(payload::text) > 33554432 then return false; end if;
  foreach record_kind in array array['sales','spend'] loop
    if exists (select 1 from jsonb_array_elements(payload->record_kind)
      group by value->>'id' having count(*) > 1) then return false; end if;
    for record_value in select value from jsonb_array_elements(payload->record_kind) loop
      if jsonb_typeof(record_value) is distinct from 'object'
        or jsonb_typeof(record_value->'id') is distinct from 'string'
        or (record_value->>'id') !~ '^[a-zA-Z0-9_-]{1,80}$'
        or jsonb_typeof(record_value->'date') is distinct from 'string'
        or (record_value->>'date') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
        or jsonb_typeof(record_value->'amountCents') is distinct from 'number'
        or (record_value->>'amountCents') !~ '^[0-9]{1,14}$' then return false; end if;
      date_value := (record_value->>'date')::date;
      if to_char(date_value, 'YYYY-MM-DD') <> record_value->>'date'
        or (record_value->>'amountCents')::numeric not between 1 and 10000000000000 then return false; end if;
      total_cents := total_cents + (record_value->>'amountCents')::numeric;
      if record_kind = 'sales' then
        if jsonb_typeof(record_value->'category') is distinct from 'string'
          or not (record_value->>'category') = any(allowed_categories)
          or jsonb_typeof(record_value->'source') is distinct from 'string'
          or not (record_value->>'source') = any(array['Meta','Google','Orgánico','Recomendación','Otro'])
          or jsonb_typeof(record_value->'description') is distinct from 'string'
          or length(record_value->>'description') > 240 then return false; end if;
      else
        if jsonb_typeof(record_value->'platform') is distinct from 'string'
          or not (record_value->>'platform') = any(array['Meta','Google'])
          or jsonb_typeof(record_value->'notes') is distinct from 'string'
          or length(record_value->>'notes') > 240 then return false; end if;
      end if;
    end loop;
  end loop;
  return total_cents <= 9007199254740991;
exception when others then
  return false;
end;
$$;

revoke all on function flowsystem_private.valid_document(text,jsonb) from public, anon, authenticated;
grant execute on function flowsystem_private.valid_document(text,jsonb) to authenticated;

create table public.flowsystem_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (client_id in ('hg-galvan','reh-muebles-re')),
  primary key (user_id, client_id)
);

create table public.flowsystem_data (
  client_id text primary key check (client_id in ('hg-galvan','reh-muebles-re')),
  document jsonb not null,
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  updated_at timestamptz not null default now(),
  constraint flowsystem_document_valid check (flowsystem_private.valid_document(client_id,document))
);

create function flowsystem_private.advance_revision()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function flowsystem_private.advance_revision() from public, anon, authenticated;

create trigger flowsystem_revision before update on public.flowsystem_data
for each row execute function flowsystem_private.advance_revision();

alter table public.flowsystem_memberships enable row level security;
alter table public.flowsystem_data enable row level security;

revoke all on public.flowsystem_memberships from public, anon, authenticated;
revoke all on public.flowsystem_data from public, anon, authenticated;
grant select on public.flowsystem_memberships to authenticated;
grant select on public.flowsystem_data to authenticated;
grant update(document) on public.flowsystem_data to authenticated;

create policy flowsystem_own_memberships on public.flowsystem_memberships
for select to authenticated
using (user_id = (select auth.uid()));

create policy flowsystem_read_client on public.flowsystem_data
for select to authenticated
using (exists (select 1 from public.flowsystem_memberships
  where user_id = (select auth.uid()) and client_id = flowsystem_data.client_id));

create policy flowsystem_write_client on public.flowsystem_data
for update to authenticated
using (exists (select 1 from public.flowsystem_memberships
  where user_id = (select auth.uid()) and client_id = flowsystem_data.client_id))
with check (exists (select 1 from public.flowsystem_memberships
  where user_id = (select auth.uid()) and client_id = flowsystem_data.client_id));

insert into public.flowsystem_data(client_id,document) values
('hg-galvan','{"schemaVersion":1,"clientId":"hg-galvan","sales":[],"spend":[]}'),
('reh-muebles-re','{"schemaVersion":1,"clientId":"reh-muebles-re","sales":[],"spend":[]}');

commit;
