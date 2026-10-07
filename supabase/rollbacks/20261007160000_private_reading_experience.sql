-- Application rollback may leave this additive table and policy versions in place.
-- Keep reader progress and approved historical editions; no destructive contraction.
begin;
select to_regclass('public.atv_trial_reader_state') is not null as reader_state_preserved;
commit;
