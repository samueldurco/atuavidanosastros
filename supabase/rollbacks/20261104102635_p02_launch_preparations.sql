-- Forward-fix: close the launch surface and writer without deleting private preparation evidence.
begin;
revoke all on public.atv_launch_preparations from public,anon,authenticated,service_role;
commit;
