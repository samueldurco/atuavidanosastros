-- Resolve historical offer -> product links for the buyer without exposing
-- paused offer codes or other offer columns through the public RLS policy.
create index if not exists purchases_owner_offer_idx
on public.purchases (user_id, offer_id);

create or replace function public.owned_purchase_offers(offer_ids uuid[])
returns table (offer_id uuid, product_id text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if offer_ids is null or cardinality(offer_ids) > 75 then
    raise exception 'invalid_offer_batch';
  end if;

  return query
    select distinct o.id, o.product_id
    from public.purchases p
    join public.offers o on o.id = p.offer_id
    where p.user_id = (select auth.uid())
      and o.id = any(offer_ids);
end;
$$;

revoke all on function public.owned_purchase_offers(uuid[]) from public, anon;
grant execute on function public.owned_purchase_offers(uuid[]) to authenticated;
