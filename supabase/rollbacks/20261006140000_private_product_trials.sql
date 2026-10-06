-- Reversible forward-fix: retain private evidence and revoke access. No destructive rollback.
update public.atv_trial_grants set revoked_at=now() where revoked_at is null;
-- Restore an individually verified grant with a reviewed service-role UPDATE, never a public flag.
