-- Forward-fix: stop new Tarot generation without discarding private draws or historical readings.
-- Existing recorded readings remain recoverable. A repaired migration must explicitly restore RPC grants.
do $$ begin
if to_regclass('public.workflow_releases') is not null then
update public.workflow_releases set enabled=false,engine_approved=false where product_id in
  ('tarot-single-card','tarot-situation-challenge-advice','tarot-peladan-cross','tarot-celtic-cross','tarot-aphrodite-temple','tarot-astrological-mandala');
end if;
end; $$;
revoke execute on function public.reserve_atv_tarot_draw(uuid,uuid,jsonb) from service_role;
revoke execute on function public.record_atv_tarot_draw(uuid,uuid,jsonb) from service_role;
