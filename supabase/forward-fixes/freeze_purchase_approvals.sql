-- Fail-closed containment: no new APPROVED purchase can be inserted or reached
-- by UPDATE, while existing approved purchases can still be revoked/refunded.
-- Apply only after 20261019143000_purchase_state_guard.sql.
create or replace function public.enforce_purchase_state_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.state = 'APPROVED' then
      raise exception 'purchase_approval_frozen' using errcode = '23514';
    end if;
    return new;
  end if;
  if tg_op <> 'UPDATE' then
    raise exception 'invalid_purchase_state_operation' using errcode = '23514';
  end if;
  if new.state is not distinct from old.state or
     (old.state = 'PENDING' and new.state = 'CANCELLED') or
     (old.state = 'APPROVED' and new.state in ('CANCELLED', 'REFUNDED', 'CHARGEDBACK')) then
    return new;
  end if;
  raise exception 'purchase_approval_frozen' using errcode = '23514';
end $$;

revoke all on function public.enforce_purchase_state_transition()
  from public, anon, authenticated, service_role;

drop trigger if exists purchases_approved_insert_freeze on public.purchases;
create trigger purchases_approved_insert_freeze
before insert on public.purchases
for each row execute function public.enforce_purchase_state_transition();
