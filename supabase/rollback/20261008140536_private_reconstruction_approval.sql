-- Rolling back application code does not require removing the expanded check.
-- Refuse this optional schema rollback after a new edition has been persisted.
do $$
begin
  if exists (
    select 1 from public.atv_trial_readings
    where approval->>'policy' = 'atv-private-interpretation-review/4.0.0'
  ) then
    raise exception 'Retain expanded approval constraint: reconstructed readings exist';
  end if;
end;
$$;
alter table public.atv_trial_readings drop constraint atv_trial_readings_approval_check;
alter table public.atv_trial_readings add constraint atv_trial_readings_approval_check check (
  coalesce(approval->>'status'='approved' and approval->>'scope'='private-free-test'
    and approval->>'policy' in ('atv-private-trial-approval/1.0.0','atv-private-trial-approval/2.0.0','atv-private-trial-approval/3.0.0')
    and approval->>'digest' ~ '^[0-9a-f]{64}$',false)
);
