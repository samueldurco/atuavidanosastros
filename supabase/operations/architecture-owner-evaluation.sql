-- OPERATIONAL TEMPLATE, NOT A MIGRATION OR SEED. Run only after release gates.
-- Supply atvna.release_owner_id transaction-locally from the privately verified
-- canonical owner identity. Never commit or print its value. No new trial grant.
-- The caller wraps set_config + this block in one BEGIN/COMMIT transaction.
do $owner_evaluation$
declare
  v_owner uuid := nullif(current_setting('atvna.release_owner_id', true), '')::uuid;
  v_changed integer;
begin
  if v_owner is null then raise exception 'verified_owner_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atvna:architecture-owner-evaluation', 0));
  if exists(select 1 from public.atv_trial_grants where owner_evaluation and owner_id <> v_owner) then
    raise exception 'unexpected_existing_owner_evaluation';
  end if;
  if not exists(
    select 1 from auth.users u
    join public.atv_trial_grants g on g.owner_id = u.id
    where u.id = v_owner and u.email_confirmed_at is not null
      and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
      and exists(select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google')
  ) then raise exception 'verified_active_owner_grant_required'; end if;
  update public.atv_trial_grants set owner_evaluation = true
    where owner_id = v_owner and revoked_at is null and (expires_at is null or expires_at > now());
  get diagnostics v_changed = row_count;
  if v_changed <> 1 then raise exception 'owner_grant_count_mismatch'; end if;
end;
$owner_evaluation$;
-- Return counts only. This operation never changes expiry, email or identity.
select count(*) = 1 as exactly_one_owner_evaluation
from public.atv_trial_grants where owner_evaluation;
