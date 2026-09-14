begin;
revoke execute on function public.claim_product_run_work(text[],integer),public.complete_product_run_work(uuid,uuid,integer,jsonb),
  public.fail_product_run_work(uuid,uuid,text) from service_role;
-- Do not restore the unfenced writer or delete pending work/history. Owner read/delete still work.
commit;
