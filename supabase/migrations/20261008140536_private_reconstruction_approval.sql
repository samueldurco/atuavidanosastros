-- Expand only the approved-edition constraint. Ownership, grants and historical
-- readings retain their existing policies and privileges.
alter table public.atv_trial_readings
  drop constraint atv_trial_readings_approval_check;
alter table public.atv_trial_readings
  add constraint atv_trial_readings_approval_check check (
    coalesce(
      approval->>'status' = 'approved'
      and approval->>'scope' = 'private-free-test'
      and approval->>'policy' in (
        'atv-private-trial-approval/1.0.0',
        'atv-private-trial-approval/2.0.0',
        'atv-private-trial-approval/3.0.0',
        'atv-private-interpretation-review/4.0.0'
      )
      and approval->>'digest' ~ '^[0-9a-f]{64}$',
      false
    )
  );
