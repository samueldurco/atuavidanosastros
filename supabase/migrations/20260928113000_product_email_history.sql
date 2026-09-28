begin;

-- Read-only owner discovery survives lost browser keys and revoked reading gates.
-- unique(run_id, revision), with revision 1..8, bounds the projection to eight.
create function public.list_product_email_requests(p_run_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'auth_required'; end if;
  if p_run_id is null then raise exception 'invalid_input'; end if;
  return coalesce((
    select jsonb_agg(public.product_email_projection(r) order by r.revision desc)
    from public.product_email_requests r
    where r.user_id = v_owner and r.run_id = p_run_id
  ), '[]'::jsonb);
end $$;

revoke all on function public.list_product_email_requests(uuid) from public, anon, authenticated, service_role;
grant execute on function public.list_product_email_requests(uuid) to authenticated;
commit;
