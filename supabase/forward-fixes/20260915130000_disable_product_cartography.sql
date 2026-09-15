-- Remove geometry without destroying readings/history or restoring raw table access.
create or replace function public.product_cartography_projection(p_product text,p_calculation jsonb)
returns jsonb language sql immutable set search_path = '' as $$ select null::jsonb $$;
revoke all on function public.product_cartography_projection(text,jsonb) from public,anon,authenticated,service_role;
