begin;

-- No production retention period is presumed. Null refuses selected reads even when enabled.
alter table public.product_continuity_policy add column access_retention_days integer
  check (access_retention_days between 1 and 30);
alter table public.product_continuity_items add constraint product_continuity_items_id_owner unique(id,user_id);
create table public.product_continuity_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_revision integer not null check(consent_revision>0),
  purpose text not null default 'reading-context' check(purpose='reading-context'),
  outcome text not null default 'selected' check(outcome='selected'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null check(expires_at>created_at),
  unique(id,user_id)
);
create index product_continuity_access_owner on public.product_continuity_access(user_id,created_at desc);
create index product_continuity_access_expiry on public.product_continuity_access(expires_at);
create table public.product_continuity_access_items (
  access_id uuid not null,
  user_id uuid not null,
  position integer not null check(position between 1 and 12),
  item_id uuid not null,
  item_revision integer not null check(item_revision>0),
  run_id uuid not null,
  run_revision integer not null check(run_revision>0),
  primary key(access_id,position),
  unique(access_id,item_id),
  foreign key(access_id,user_id) references public.product_continuity_access(id,user_id) on delete cascade,
  foreign key(item_id,user_id) references public.product_continuity_items(id,user_id) on delete cascade,
  foreign key(run_id,user_id) references public.product_runs(id,user_id) on delete cascade
);
create index product_continuity_access_items_item on public.product_continuity_access_items(item_id,user_id);
create index product_continuity_access_items_run on public.product_continuity_access_items(run_id,user_id);
alter table public.product_continuity_access enable row level security;
alter table public.product_continuity_access_items enable row level security;
revoke all on public.product_continuity_access,public.product_continuity_access_items from public,anon,authenticated,service_role;

-- Removing any selected item (including a source/profile cascade) removes the complete receipt.
create function public.discard_product_continuity_access() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  delete from public.product_continuity_access a where a.user_id=old.user_id and exists(
    select 1 from public.product_continuity_access_items i where i.access_id=a.id and i.user_id=old.user_id
      and case when tg_table_name='product_runs' then i.run_id=old.id else i.item_id=old.id end);
  return old;
end $$;
revoke all on function public.discard_product_continuity_access() from public,anon,authenticated,service_role;
create trigger product_continuity_items_discard_access before delete on public.product_continuity_items
for each row execute function public.discard_product_continuity_access();
-- Before FK cascades, independent of their internal trigger order.
create trigger product_runs_discard_continuity_access before delete on public.product_runs
for each row execute function public.discard_product_continuity_access();

-- Preserve the established wire contract while withdrawing all access to the unaudited core.
alter function public.read_product_continuity_selection(uuid[]) rename to product_continuity_selection_snapshot;
revoke all on function public.product_continuity_selection_snapshot(uuid[]) from public,anon,authenticated,service_role;
create function public.read_product_continuity_selection(p_item_ids uuid[])
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); snapshot jsonb; retention integer; receipt_id uuid;
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('atv-continuity:'||actor::text,0));
  select access_retention_days into retention from public.product_continuity_policy where singleton for share;
  snapshot:=public.product_continuity_selection_snapshot(p_item_ids);
  if snapshot->>'status'<>'selected' then return snapshot; end if;
  if retention is null then raise exception 'continuity_audit_unavailable' using errcode='55000'; end if;
  delete from public.product_continuity_access where user_id=actor and expires_at<=now();
  if (select count(*) from public.product_continuity_access where user_id=actor)>=1000 then
    raise exception 'continuity_audit_capacity' using errcode='54000';
  end if;
  insert into public.product_continuity_access(user_id,consent_revision,expires_at)
    values(actor,(snapshot->>'consentRevision')::integer,now()+make_interval(days=>retention)) returning id into receipt_id;
  insert into public.product_continuity_access_items(access_id,user_id,position,item_id,item_revision,run_id,run_revision)
    select receipt_id,actor,ordinality::integer,(item->>'id')::uuid,(revision->>'revision')::integer,
      (item->>'runId')::uuid,(source->'run'->>'revision')::integer
    from jsonb_array_elements(snapshot->'items') with ordinality as chosen(item,ordinality)
    join jsonb_array_elements(snapshot->'itemRevisions') revision on revision->>'itemId'=item->>'id'
    join jsonb_array_elements(snapshot->'sources') source on source->'run'->>'id'=item->>'runId';
  if (select count(*) from public.product_continuity_access_items i where i.access_id=receipt_id)<>cardinality(p_item_ids) then
    raise exception 'continuity_audit_unavailable' using errcode='55000';
  end if;
  return snapshot;
end $$;
revoke all on function public.read_product_continuity_selection(uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.read_product_continuity_selection(uuid[]) to authenticated;

-- Owner-only metadata history, not content, usage authority, or a source for model context.
create function public.read_product_continuity_access()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=actor and deleted_at is null) then
    raise exception 'profile_unavailable' using errcode='42501';
  end if;
  return jsonb_build_object('version','atv-continuity-access/1','events',(
    select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'purpose',a.purpose,'outcome',a.outcome,
      'createdAt',a.created_at,'expiresAt',a.expires_at,'consentRevision',a.consent_revision,'items',(
        select jsonb_agg(jsonb_build_object('itemId',i.item_id,'itemRevision',i.item_revision,
          'runId',i.run_id,'runRevision',i.run_revision) order by i.position)
        from public.product_continuity_access_items i where i.access_id=a.id)) order by a.created_at desc,a.id),'[]'::jsonb)
    from public.product_continuity_access a where a.user_id=actor and a.expires_at>now()));
end $$;
revoke all on function public.read_product_continuity_access() from public,anon,authenticated,service_role;
grant execute on function public.read_product_continuity_access() to authenticated;

-- Explicit owner control, including when disabled/revoked or the profile is soft-deleted.
create function public.clear_product_continuity_access()
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); removed integer;
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('atv-continuity:'||actor::text,0));
  delete from public.product_continuity_access where user_id=actor;
  get diagnostics removed=row_count;
  return removed;
end $$;
revoke all on function public.clear_product_continuity_access() from public,anon,authenticated,service_role;
grant execute on function public.clear_product_continuity_access() to authenticated;

-- Narrow maintenance capability. No scheduler is installed or invoked by this migration.
create function public.purge_expired_product_continuity_access()
returns integer language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  delete from public.product_continuity_access where expires_at<=now();
  get diagnostics removed=row_count;
  return removed;
end $$;
revoke all on function public.purge_expired_product_continuity_access() from public,anon,authenticated,service_role;
grant execute on function public.purge_expired_product_continuity_access() to service_role;
commit;
