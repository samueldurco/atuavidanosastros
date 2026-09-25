begin;

-- Display-only eligibility. request_product_run still checks release, access and quotas at write time.
create function public.read_product_request_access(p_product_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); definition public.workflow_releases;
begin
  if owner_id is null or not exists (
    select 1 from public.profiles where id=owner_id and deleted_at is null
  ) then raise exception 'auth_required' using errcode='42501'; end if;
  select * into definition from public.workflow_releases where product_id=p_product_id;
  if not found or not definition.enabled then
    return jsonb_build_object('state','UNRELEASED');
  end if;
  if definition.contract_version <> 'atv-workflow/1.0.0' then
    raise exception 'contract_unavailable' using errcode='55000';
  end if;
  if definition.access_policy='entitlement' and not exists (
    select 1 from public.entitlements e where e.user_id=owner_id and e.product_id=p_product_id
      and e.state='ACTIVE' and (e.starts_at is null or e.starts_at<=now())
      and (e.ends_at is null or e.ends_at>now())
  ) then return jsonb_build_object('state','ACCESS_REQUIRED'); end if;
  return jsonb_build_object('state','AVAILABLE');
end;
$$;
revoke all on function public.read_product_request_access(text) from public,anon,authenticated,service_role;
grant execute on function public.read_product_request_access(text) to authenticated;

commit;
