-- Forward-fix: stop new simulations and consumption without deleting delivered readings.
update public.atv_trial_grants set owner_evaluation=false where owner_evaluation;
update public.atv_plus_test_cycles set cancelled_at=coalesce(cancelled_at,now());
revoke execute on function public.start_atv_plus_test_cycle(text,uuid) from authenticated;
revoke execute on function atv_private.start_plus_test_cycle(text,uuid) from authenticated;
