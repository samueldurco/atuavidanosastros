begin;

-- Preserve candidate rows while disabling the server-side curation path.
revoke all on public.shop_taxonomy_candidates, public.shop_catalog_candidates,
  public.shop_candidate_taxonomy, public.shop_candidate_signs from service_role;

commit;
