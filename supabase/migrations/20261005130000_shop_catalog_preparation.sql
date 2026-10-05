begin;

-- Private curation only. There is deliberately no published state, price, stock,
-- checkout, or public read policy until real merchandise and policies are approved.
create table public.shop_taxonomy_candidates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('CATEGORY', 'COLLECTION')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  state text not null default 'DRAFT' check (state in ('DRAFT', 'REVIEW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);

create table public.shop_catalog_candidates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 1 and 160),
  item_kind text not null check (item_kind in ('SIMPLE', 'VARIANT', 'PERSONALIZED', 'MEMBER', 'EXTERNAL')),
  state text not null default 'DRAFT' check (state in ('DRAFT', 'REVIEW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_candidate_taxonomy (
  candidate_id uuid not null references public.shop_catalog_candidates(id) on delete cascade,
  taxonomy_id uuid not null references public.shop_taxonomy_candidates(id) on delete cascade,
  primary key (candidate_id, taxonomy_id)
);

create table public.shop_candidate_signs (
  candidate_id uuid not null references public.shop_catalog_candidates(id) on delete cascade,
  sign_slug text not null check (sign_slug in (
    'aries', 'touro', 'gemeos', 'cancer', 'leao', 'virgem',
    'libra', 'escorpiao', 'sagitario', 'capricornio', 'aquario', 'peixes'
  )),
  primary key (candidate_id, sign_slug)
);

create index shop_candidate_taxonomy_by_taxonomy on public.shop_candidate_taxonomy(taxonomy_id, candidate_id);
create index shop_candidate_signs_by_sign on public.shop_candidate_signs(sign_slug, candidate_id);

create trigger shop_taxonomy_candidates_updated_at before update on public.shop_taxonomy_candidates
  for each row execute function public.set_updated_at();
create trigger shop_catalog_candidates_updated_at before update on public.shop_catalog_candidates
  for each row execute function public.set_updated_at();

alter table public.shop_taxonomy_candidates enable row level security;
alter table public.shop_catalog_candidates enable row level security;
alter table public.shop_candidate_taxonomy enable row level security;
alter table public.shop_candidate_signs enable row level security;

-- Explicitly remove Supabase/default grants. Only the server-side service role may
-- curate candidates; no client role can read even the names of draft merchandise.
revoke all on public.shop_taxonomy_candidates, public.shop_catalog_candidates,
  public.shop_candidate_taxonomy, public.shop_candidate_signs from anon, authenticated;
grant select, insert, update, delete on public.shop_taxonomy_candidates,
  public.shop_catalog_candidates, public.shop_candidate_taxonomy,
  public.shop_candidate_signs to service_role;

commit;
