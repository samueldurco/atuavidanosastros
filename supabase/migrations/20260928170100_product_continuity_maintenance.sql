begin;

-- Bounded service-only maintenance. Does not enable policy, decide retention or schedule work.
-- A zero result does NOT certify an empty backlog: another transaction may hold row locks.
create or replace function public.purge_expired_product_continuity_access()
returns integer language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
  with batch as (
    select id from public.product_continuity_access
    where expires_at<=now()
    order by expires_at,id
    limit 500
    for update skip locked
  )
  delete from public.product_continuity_access a using batch b
    where a.id=b.id and a.expires_at<=now();
  get diagnostics removed=row_count;
  return removed;
end $$;
revoke all on function public.purge_expired_product_continuity_access() from public,anon,authenticated,service_role;
grant execute on function public.purge_expired_product_continuity_access() to service_role;
commit;
