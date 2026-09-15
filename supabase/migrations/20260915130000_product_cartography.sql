-- Optional geometry only. No input, coordinates of birthplace, timestamps, latitude,
-- distance, raw provenance or arbitrary calculation data are exposed by this helper.
create function public.product_cartography_projection(p_product text,p_calculation jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare d jsonb := p_calculation->'data'; p jsonb; x jsonb;
begin
  if p_product not in ('birth-chart','ascendant')
    or p_calculation->>'version' is distinct from 'atv-natal-product-calculation/1.0.0'
    or p_calculation->>'status' is distinct from 'experimental'
    or d->>'productId' is distinct from p_product
    or d#>>'{provenance,zodiac}' is distinct from 'tropical'
    or d#>>'{provenance,referenceFrame}' is distinct from 'geocentric-apparent-ecliptic-of-date'
    or jsonb_typeof(d->'positions') is distinct from 'array'
    or jsonb_typeof(d#>'{houses,cusps}') is distinct from 'array'
    or d#>>'{houses,system}' is distinct from 'placidus'
    or coalesce(d#>>'{houses,status}','') not in ('ok','not-applicable','not-requested') then return null; end if;
  if jsonb_array_length(d->'positions')>10 or jsonb_array_length(d#>'{houses,cusps}')>12 then return null; end if;
  if p_product='birth-chart' then
    if jsonb_array_length(d->'positions')<>10 or d#>>'{houses,status}'='not-requested'
      or jsonb_typeof(d#>'{angles,midheaven}') is distinct from 'number' then return null; end if;
  else
    if jsonb_array_length(d->'positions')<>0 or d#>>'{houses,status}'<>'not-requested'
      or jsonb_typeof(d#>'{angles,midheaven}') is distinct from 'null'
      or jsonb_typeof(d#>'{angles,ascendant}') is distinct from 'number' then return null; end if;
  end if;
  if d#>>'{houses,status}'='ok' then
    if jsonb_array_length(d#>'{houses,cusps}')<>12 or jsonb_typeof(d#>'{angles,ascendant}') is distinct from 'number' then return null; end if;
  elsif jsonb_array_length(d#>'{houses,cusps}')<>0 then return null; end if;
  if d#>>'{houses,status}'='not-applicable' and jsonb_typeof(d#>'{angles,ascendant}') is distinct from 'null' then return null; end if;
  if (select count(distinct value->>'body') from jsonb_array_elements(d->'positions'))<>jsonb_array_length(d->'positions') then return null; end if;
  for p in select value from jsonb_array_elements(d->'positions') loop
    if coalesce(p->>'body','') not in ('sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto')
      or jsonb_typeof(p->'longitude') is distinct from 'number' then return null; end if;
    if (p->>'longitude')::numeric<0 or (p->>'longitude')::numeric>=360 then return null; end if;
  end loop;
  foreach x in array array[d#>'{angles,ascendant}',d#>'{angles,midheaven}'] loop
    if x is null or jsonb_typeof(x) not in ('number','null') then return null; end if;
    if jsonb_typeof(x)='number' then
      if x::numeric<0 or x::numeric>=360 then return null; end if;
    end if;
  end loop;
  for x in select value from jsonb_array_elements(d#>'{houses,cusps}') loop
    if jsonb_typeof(x) is distinct from 'number' then return null; end if;
    if x::numeric<0 or x::numeric>=360 then return null; end if;
  end loop;
  return jsonb_build_object('version','atv-cartography/1.0.0','sourceVersion',p_calculation->>'version',
    'zodiac','tropical','referenceFrame','geocentric-apparent-ecliptic-of-date','accuracyStatus','experimental',
    'positions',(select coalesce(jsonb_agg(jsonb_build_object('body',value->'body','longitude',value->'longitude') order by ordinal),'[]'::jsonb)
      from jsonb_array_elements(d->'positions') with ordinality as entries(value,ordinal)),
    'angles',jsonb_build_object('ascendant',d#>'{angles,ascendant}','midheaven',d#>'{angles,midheaven}'),
    'houses',jsonb_build_object('system','placidus','status',d#>'{houses,status}','cusps',d#>'{houses,cusps}'));
end $$;
revoke all on function public.product_cartography_projection(text,jsonb) from public,anon,authenticated,service_role;

-- Preserve the exact owner and publication gates of the existing reader.
create or replace function public.read_product_run(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  current_run public.product_runs;
  definition public.workflow_releases;
  released boolean;
  has_access boolean;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode='42501'; end if;
  select * into current_run from public.product_runs where id=p_id and user_id=auth.uid();
  if not found then return null; end if;
  select * into definition from public.workflow_releases where product_id=current_run.product_id;
  has_access := definition.access_policy='free' or exists (
    select 1 from public.entitlements where user_id=auth.uid() and product_id=current_run.product_id
      and state='ACTIVE' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
  );
  released := coalesce(current_run.state='READY' and definition.enabled
    and current_run.contract_version=definition.contract_version
    and (definition.engine_approved or (definition.kind in ('tarot','dream') and current_run.calculation->>'status'='recorded'))
    and exists (select 1 from public.editorial_promotions where id=current_run.editorial->>'promotionId'
      and product_id=current_run.product_id and contract_version=current_run.contract_version and revoked_at is null),false);
  return jsonb_build_object(
    'id',current_run.id,'productId',current_run.product_id,'state',current_run.state,
    'revision',current_run.revision,'parentId',current_run.parent_id,
    'createdAt',current_run.created_at,'updatedAt',current_run.updated_at,'released',released,
    'canReprocess',definition.enabled and has_access and current_run.state in ('READY','FAILED','CANCELLED','AWAITING_EDITORIAL'),
    'libraryItemId',(select id from public.library_items where user_id=auth.uid() and item_type='PRODUCT_RUN'
      and source_id=current_run.id::text and archived_at is null limit 1),
    'history',(select coalesce(jsonb_agg(jsonb_build_object('revision',revision,'state',state,'at',occurred_at) order by revision),'[]'::jsonb)
      from public.product_run_events where run_id=current_run.id and user_id=auth.uid()),
    'calculation',case when released then jsonb_build_object('version',current_run.calculation->'version',
      'facts',(select jsonb_agg(jsonb_build_object('id',fact->'id','kind',fact->'kind','display',fact->'display','source',fact->'source'))
        from jsonb_array_elements(current_run.calculation->'facts') fact),'limits',current_run.calculation->'limits') else null end,
    'cartography',case when released then public.product_cartography_projection(current_run.product_id,current_run.calculation) else null end,
    'editorial',case when released then jsonb_build_object('version',current_run.editorial->'version',
      'title',current_run.editorial->'title','promotionId',current_run.editorial->'promotionId','reviewDigest',current_run.editorial->'reviewDigest',
      'sections',(select jsonb_agg(jsonb_build_object('title',section->'title','text',section->'text','evidence',section->'evidence'))
        from jsonb_array_elements(current_run.editorial->'sections') section),'limits',current_run.editorial->'limits') else null end
  );
end $$;
-- CREATE OR REPLACE preserves the existing reader ACL, including an emergency revocation.
-- No release or promotion registry is changed; no new grants are made.
