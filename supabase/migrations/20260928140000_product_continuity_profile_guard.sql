begin;

-- Expand-only guard at persistence boundary, including existing SECURITY DEFINER RPCs.
-- Revocation and deletion remain available to a soft-deleted owner.
create function public.guard_product_continuity_profile()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='product_continuity_consents' then
    if new.state='revoked' then return new; end if;
  elsif tg_table_name<>'product_continuity_items' then
    raise exception 'invalid_continuity_target' using errcode='42501';
  end if;
  -- SHARE conflicts with UPDATE/DELETE of this profile until transaction end.
  -- No durable authorization for a later provider call is implied.
  perform 1 from public.profiles where id=new.user_id and deleted_at is null for share;
  if not found then raise exception 'profile_unavailable' using errcode='42501'; end if;
  return new;
end $$;
revoke all on function public.guard_product_continuity_profile() from public,anon,authenticated,service_role;

create trigger product_continuity_consents_profile_guard
before insert or update on public.product_continuity_consents
for each row execute function public.guard_product_continuity_profile();
create trigger product_continuity_items_profile_guard
before insert or update on public.product_continuity_items
for each row execute function public.guard_product_continuity_profile();

commit;
