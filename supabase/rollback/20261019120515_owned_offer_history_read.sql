-- Forward-fix: remove the optional historical lookup while keeping purchase data.
revoke all on function public.owned_purchase_offers(uuid[]) from authenticated;
drop function if exists public.owned_purchase_offers(uuid[]);
drop index if exists public.purchases_owner_offer_idx;
