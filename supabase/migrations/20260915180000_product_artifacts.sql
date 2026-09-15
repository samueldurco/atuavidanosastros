begin;

-- Bounded private binary store; atomic deletion with its run. No bucket/public URL.
-- Disabled independently of product/editorial release; hosted storage budgets are not certified.
create table public.product_artifact_policy (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.product_artifact_policy default values;
create table public.product_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  user_id uuid not null,
  revision integer not null check (revision between 1 and 8),
  review_digest text not null check (review_digest ~ '^[a-f0-9]{64}$'),
  format text not null check (format in ('web','pdf','svg','card')),
  section_index integer not null check (section_index between -1 and 39),
  renderer_version text not null,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  body bytea not null check (octet_length(body) between 1 and 8388608),
  created_at timestamptz not null default now(),
  foreign key (run_id,user_id) references public.product_runs(id,user_id) on delete cascade,
  check ((format='card' and section_index>=0) or (format<>'card' and section_index=-1)),
  unique(run_id,revision,format,section_index,renderer_version)
);
create index product_artifacts_owner on public.product_artifacts(user_id,run_id);
alter table public.product_artifact_policy enable row level security;
alter table public.product_artifacts enable row level security;
revoke all on public.product_artifact_policy,public.product_artifacts from public,anon,authenticated,service_role;

-- Private helper, with the same delivery gates as read_product_run. Never grants entitlement.
create function public.product_artifact_run_allowed(p_run_id uuid,p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.product_runs r join public.workflow_releases d on d.product_id=r.product_id
    where r.id=p_run_id and r.user_id=p_owner and r.state='READY' and d.enabled
      and r.contract_version=d.contract_version
      and (d.engine_approved or (d.kind in ('tarot','dream') and r.calculation->>'status'='recorded'))
      and exists(select 1 from public.editorial_promotions p where p.id=r.editorial->>'promotionId'
        and p.product_id=r.product_id and p.contract_version=r.contract_version and p.revoked_at is null)
      and exists(select 1 from public.product_artifact_policy where enabled))
$$;
revoke all on function public.product_artifact_run_allowed(uuid,uuid) from public,anon,authenticated,service_role;

-- Only a trusted renderer service may write bytes; an owner must never forge approved artifacts.
create function public.persist_product_artifact(p_run_id uuid,p_owner uuid,p_revision integer,
  p_review_digest text,p_format text,p_section integer,p_renderer text,p_body_base64 text,p_sha256 text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  r public.product_runs;
  saved public.product_artifacts;
  content bytea;
  actual_hash text;
  expected_renderer text;
begin
  if p_owner is null or p_run_id is null then raise exception 'artifact_unavailable'; end if;
  -- Owner quota and tuple idempotency serialize together. Row locks also fence deletion/revocation.
  perform pg_advisory_xact_lock(hashtextextended('artifact:'||p_owner::text,0));
  select * into r from public.product_runs where id=p_run_id and user_id=p_owner for share;
  if not found then raise exception 'artifact_unavailable'; end if;
  perform 1 from public.product_artifact_policy where singleton for share;
  perform 1 from public.workflow_releases where product_id=r.product_id for share;
  perform 1 from public.editorial_promotions where id=r.editorial->>'promotionId' for share;
  if not public.product_artifact_run_allowed(p_run_id,p_owner) or p_revision is distinct from r.revision
    or p_review_digest is distinct from r.editorial->>'reviewDigest'
    then raise exception 'artifact_unavailable'; end if;
  expected_renderer := case p_format when 'web' then 'atv-web-export/1.0.0'
    when 'pdf' then 'atv-pdf-export/1.0.0' when 'svg' then 'atv-svg-export/1.0.0'
    when 'card' then 'atv-reading-card/1.0.0' end;
  if expected_renderer is null or p_renderer is distinct from expected_renderer or p_section is null
    or (p_format='card' and (p_section<0 or p_section>=jsonb_array_length(r.editorial->'sections') or p_section>39))
    or (p_format<>'card' and p_section<>-1)
    or (p_format='svg' and (r.product_id not in ('birth-chart','ascendant')
      or public.product_cartography_projection(r.product_id,r.calculation) is null))
    or (p_format='pdf' and r.product_id not in ('birth-chart','life-atlas','personal-calendar','solar-return',
      'synastry','couple-dossier','purpose-career','dream-dossier','dream-atlas'))
    then raise exception 'artifact_invalid'; end if;
  if p_body_base64 is null or length(p_body_base64)>11184812 or p_sha256 is null
    or p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'artifact_invalid'; end if;
  begin content := decode(p_body_base64,'base64');
  exception when others then raise exception 'artifact_invalid'; end;
  if octet_length(content) not between 1 and 8388608
    or replace(encode(content,'base64'),E'\n','')<>p_body_base64
    or (p_format in ('svg','card') and octet_length(content)>2000000)
    then raise exception 'artifact_invalid'; end if;
  actual_hash := encode(extensions.digest(content,'sha256'),'hex');
  if actual_hash<>p_sha256 then raise exception 'artifact_invalid'; end if;
  select * into saved from public.product_artifacts where run_id=p_run_id and revision=p_revision
    and format=p_format and section_index=p_section and renderer_version=p_renderer;
  if found then
    if saved.review_digest<>p_review_digest or saved.checksum_sha256<>actual_hash or saved.body<>content
      then raise exception 'artifact_conflict'; end if;
  else
    if (select coalesce(sum(octet_length(body)),0) from public.product_artifacts where user_id=p_owner)+octet_length(content)>33554432
      or (select coalesce(sum(octet_length(body)),0) from public.product_artifacts where run_id=p_run_id)+octet_length(content)>16777216
      or (select count(*) from public.product_artifacts where user_id=p_owner)>=200
      then raise exception 'artifact_limit'; end if;
    insert into public.product_artifacts(run_id,user_id,revision,review_digest,format,section_index,renderer_version,checksum_sha256,body)
      values(p_run_id,p_owner,p_revision,p_review_digest,p_format,p_section,p_renderer,actual_hash,content) returning * into saved;
  end if;
  return jsonb_build_object('id',saved.id,'runId',saved.run_id,'revision',saved.revision,
    'reviewDigest',saved.review_digest,'format',saved.format,'section',saved.section_index,
    'rendererVersion',saved.renderer_version,'sha256',saved.checksum_sha256,'bytes',octet_length(saved.body),'createdAt',saved.created_at);
end $$;
revoke all on function public.persist_product_artifact(uuid,uuid,integer,text,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.persist_product_artifact(uuid,uuid,integer,text,text,integer,text,text,text) to service_role;

create function public.list_product_artifacts(p_run_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode='42501'; end if;
  if not public.product_artifact_run_allowed(p_run_id,auth.uid()) then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'runId',a.run_id,'revision',a.revision,
    'reviewDigest',a.review_digest,'format',a.format,'section',a.section_index,'rendererVersion',a.renderer_version,
    'sha256',a.checksum_sha256,'bytes',octet_length(a.body),'createdAt',a.created_at) order by a.created_at,a.id),'[]'::jsonb)
    from public.product_artifacts a join public.product_runs r on r.id=a.run_id
    where a.run_id=p_run_id and a.user_id=auth.uid() and a.revision=r.revision and a.review_digest=r.editorial->>'reviewDigest');
end $$;
create function public.read_product_artifact(p_run_id uuid,p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode='42501'; end if;
  if not public.product_artifact_run_allowed(p_run_id,auth.uid()) then return null; end if;
  return (select jsonb_build_object('id',a.id,'runId',a.run_id,'revision',a.revision,'reviewDigest',a.review_digest,
    'format',a.format,'section',a.section_index,'rendererVersion',a.renderer_version,'sha256',a.checksum_sha256,
    'bytes',octet_length(a.body),'createdAt',a.created_at,'bodyBase64',replace(encode(a.body,'base64'),E'\n',''))
    from public.product_artifacts a join public.product_runs r on r.id=a.run_id
    where a.id=p_id and a.run_id=p_run_id and a.user_id=auth.uid() and a.revision=r.revision
      and a.review_digest=r.editorial->>'reviewDigest');
end $$;
revoke all on function public.list_product_artifacts(uuid),public.read_product_artifact(uuid,uuid) from public,anon,service_role;
grant execute on function public.list_product_artifacts(uuid),public.read_product_artifact(uuid,uuid) to authenticated;
commit;
