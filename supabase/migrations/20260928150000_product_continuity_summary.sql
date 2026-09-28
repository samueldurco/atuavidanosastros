begin;

-- Metadata only. This is not permission to execute a longitudinal reading.
create function public.read_product_continuity_summary()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  subject uuid := auth.uid();
  counts jsonb;
begin
  if subject is null then raise exception 'auth_required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=subject and deleted_at is null) then
    raise exception 'profile_unavailable' using errcode='42501';
  end if;
  select jsonb_build_object(
    'total',count(*),
    'relevant',count(*) filter(where relevance='relevant'),
    'irrelevant',count(*) filter(where relevance='irrelevant'),
    'unreviewed',count(*) filter(where relevance='unreviewed')
  ) into counts from public.product_continuity_items where user_id=subject;
  return jsonb_build_object(
    'version','atv-continuity-summary/1',
    'enabled',coalesce((select enabled from public.product_continuity_policy where singleton),false),
    'consentState',coalesce((select state from public.product_continuity_consents where user_id=subject),'revoked'),
    'counts',counts
  );
end $$;
revoke all on function public.read_product_continuity_summary() from public,anon,authenticated,service_role;
grant execute on function public.read_product_continuity_summary() to authenticated;

commit;
