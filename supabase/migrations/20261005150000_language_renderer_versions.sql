begin;

-- Editorial wording versions; no workflow release or editorial authority is granted.
-- Forward-fix: supabase/forward-fixes/disable_language_renderer_versions.sql.
-- Preserve prior renderers, ownership, receipts, revocation, byte validation and quotas.
create or replace function public.persist_product_artifact(p_run_id uuid,p_owner uuid,p_revision integer,
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
  if expected_renderer is null or p_renderer is null or (p_renderer is distinct from expected_renderer and not
      ((p_format='web' and p_renderer in ('atv-web-export/1.1.0','atv-web-export/1.2.0')) or
       (p_format='pdf' and p_renderer in ('atv-pdf-export/1.1.0','atv-pdf-export/1.2.0','atv-pdf-export/1.3.0')) or
       (p_format='svg' and p_renderer='atv-svg-export/1.1.0') or
       (p_format='card' and p_renderer='atv-reading-card/1.1.0'))) or p_section is null
    or (p_format='card' and (p_section<0 or p_section>=jsonb_array_length(r.editorial->'sections') or p_section>39))
    or (p_format<>'card' and p_section<>-1)
    or (p_format='svg' and (r.product_id not in ('birth-chart','ascendant')
      or public.product_cartography_projection(r.product_id,r.calculation) is null))
    or (p_format='pdf' and r.product_id not in ('birth-chart','life-atlas','personal-calendar','solar-return',
      'synastry','couple-dossier','purpose-career','dream-dossier','dream-atlas','week-reading'))
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

commit;
