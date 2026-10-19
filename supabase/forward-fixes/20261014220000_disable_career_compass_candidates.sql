begin;

-- Reversible operational stop: retain private drafts and the calculated runs,
-- but deny worker selection, persistence and private review until repaired.
revoke execute on function public.select_next_career_compass_candidate(text),
  public.save_career_compass_candidate(uuid, integer, text, jsonb, text, jsonb),
  public.read_career_compass_candidate(uuid, integer, text)
  from service_role;

commit;
