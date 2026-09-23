-- Containment only: retain read/recovery and all data. Does not restore bypassing direct writes.
begin;
revoke execute on function public.update_natal_onboarding(jsonb) from public, anon, authenticated, service_role;
commit;
