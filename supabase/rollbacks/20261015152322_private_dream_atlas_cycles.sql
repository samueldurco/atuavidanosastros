-- Forward-fix: close creation and mutations without deleting cycles, entries or frozen readings.
begin;
revoke execute on function public.start_private_dream_atlas(uuid,text),
  public.save_private_dream_atlas_entry(uuid,uuid,integer,jsonb),
  public.delete_private_dream_atlas_entry(uuid,uuid) from authenticated;
-- Existing private-test grant revocation remains available for an access-wide incident.
commit;
