-- A seven-day period includes a calculation sample at the following midnight.
-- Keep that closing sample inside the engine's supported 1900--2099 interval.
-- Some hosted installations use only private trials and have no legacy RPC.
do $migration$
declare
  definition text;
begin
  if to_regprocedure('public.request_week_reading_product_run(uuid,jsonb)') is not null then
    select pg_get_functiondef('public.request_week_reading_product_run(uuid,jsonb)'::regprocedure)
      into definition;
    execute replace(definition, '2099-12-25', '2099-12-24');
  end if;
end;
$migration$;
