-- Schema rollback only after the reconciler/checkout is disabled. If the
-- guard itself is suspect while live, use the fail-closed forward-fix instead.
drop trigger if exists purchases_approved_insert_freeze on public.purchases;
drop trigger if exists purchases_state_transition_guard on public.purchases;
drop function if exists public.enforce_purchase_state_transition();
