-- Forward fix: retain human feedback; disable new writes and owner reads until reviewed.
revoke all on public.atv_launch_feedback from anon,authenticated,service_role;
drop policy if exists launch_feedback_owner_read on public.atv_launch_feedback;
drop policy if exists launch_feedback_owner_insert on public.atv_launch_feedback;
