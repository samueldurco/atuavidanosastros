-- Enforce the purchase state graph already defined by packages/domain/src/commerce.ts.
-- This guard does not interpret a webhook or grant access. A reconciler still needs
-- an approved offer mapping, verified owner binding and Hotmart authority check.
create or replace function public.enforce_purchase_state_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'UPDATE' then
    raise exception 'invalid_purchase_state_operation' using errcode = '23514';
  end if;
  if new.state is not distinct from old.state or
     (old.state = 'PENDING' and new.state in ('APPROVED', 'CANCELLED')) or
     (old.state = 'APPROVED' and new.state in ('CANCELLED', 'REFUNDED', 'CHARGEDBACK')) then
    return new;
  end if;
  raise exception 'invalid_purchase_state_transition: % -> %', old.state, new.state
    using errcode = '23514';
end $$;

revoke all on function public.enforce_purchase_state_transition()
  from public, anon, authenticated, service_role;

-- Reapplying this migration after the containment forward-fix restores the
-- original guard and removes the temporary approval freeze.
drop trigger if exists purchases_approved_insert_freeze on public.purchases;
drop trigger if exists purchases_state_transition_guard on public.purchases;
create trigger purchases_state_transition_guard
before update of state on public.purchases
for each row execute function public.enforce_purchase_state_transition();
