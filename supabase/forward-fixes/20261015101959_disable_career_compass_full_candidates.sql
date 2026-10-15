begin;

-- Operational stop: preserve private drafts while disabling every private RPC.
revoke execute on function public.select_next_career_compass_full_candidate(text),
  public.save_career_compass_full_candidate(uuid, integer, text, jsonb, jsonb, text, jsonb),
  public.read_career_compass_full_candidate(uuid, integer, text)
  from service_role;

commit;
