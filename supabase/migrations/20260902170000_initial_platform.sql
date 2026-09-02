begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'pt-BR' check (locale = 'pt-BR'),
  timezone text,
  onboarding_state text not null default 'NOT_STARTED' check (onboarding_state in ('NOT_STARTED','IN_PROGRESS','COMPLETE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.natal_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  version integer not null check (version > 0),
  local_date date not null,
  local_time time not null,
  time_precision text not null default 'EXACT' check (time_precision in ('EXACT','APPROXIMATE')),
  location_label text not null,
  country_code char(2) not null,
  timezone_iana text not null,
  utc_instant timestamptz not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_source text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);
create unique index natal_profiles_one_current_per_user on public.natal_profiles(user_id) where is_current;

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id uuid,
  consent_type text not null check (consent_type in ('ESSENTIAL','ANALYTICS','MARKETING','PARTNER_DATA','TERMS','PRIVACY')),
  granted boolean not null,
  policy_version text not null,
  source text not null,
  occurred_at timestamptz not null default now(),
  check (user_id is not null or anonymous_id is not null)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content_type text not null,
  universe text,
  state text not null default 'DRAFT' check (state in ('DRAFT','REVIEW','PUBLISHED','ARCHIVED')),
  canonical_path text not null unique,
  body jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  universe text not null,
  state text not null default 'DRAFT' check (state in ('DRAFT','PREPARING','ACTIVE','PAUSED','ARCHIVED')),
  personalized boolean not null default false,
  physical boolean not null default false,
  delivery_modes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id),
  code text not null unique,
  state text not null default 'DRAFT' check (state in ('DRAFT','ACTIVE','PAUSED','RETIRED')),
  checkout_provider text not null default 'hotmart' check (checkout_provider = 'hotmart'),
  hotmart_product_id text,
  hotmart_offer_code text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state <> 'ACTIVE' or (hotmart_product_id is not null and hotmart_offer_code is not null))
);

create table public.price_versions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id),
  currency char(3) not null default 'BRL' check (currency = 'BRL'),
  amount_minor integer not null check (amount_minor >= 0),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','RETIRED')),
  valid_from timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from)
);
create unique index price_versions_one_active_per_offer on public.price_versions(offer_id) where status = 'ACTIVE';

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  offer_id uuid references public.offers(id),
  provider text not null check (provider = 'hotmart'),
  transaction_ref text not null unique,
  external_buyer_ref text,
  state text not null default 'PENDING' check (state in ('PENDING','APPROVED','CANCELLED','REFUNDED','CHARGEDBACK')),
  currency char(3),
  amount_minor integer,
  purchased_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  signature_verified boolean not null,
  payload_hash text not null,
  payload jsonb not null,
  processing_state text not null default 'RECEIVED' check (processing_state in ('RECEIVED','PROCESSING','PROCESSED','FAILED','QUARANTINED')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_event_id)
);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  event_version integer not null default 1,
  payload jsonb not null,
  correlation_id uuid not null,
  processing_state text not null default 'PENDING' check (processing_state in ('PENDING','PROCESSING','PUBLISHED','FAILED')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index outbox_events_pending_idx on public.outbox_events(available_at) where processing_state in ('PENDING','FAILED');

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id),
  purchase_id uuid references public.purchases(id),
  state text not null default 'PENDING' check (state in ('PENDING','ACTIVE','SUSPENDED','REVOKED','EXPIRED')),
  starts_at timestamptz,
  ends_at timestamptz,
  reason_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, purchase_id)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  idempotency_key text not null unique,
  payload jsonb not null,
  state text not null default 'QUEUED' check (state in ('QUEUED','RUNNING','RETRY','SUCCEEDED','FAILED','CANCELLED')),
  priority smallint not null default 0,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_attempts between 1 and 20 and attempts >= 0)
);
create index jobs_ready_idx on public.jobs(priority desc, available_at) where state in ('QUEUED','RETRY');

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id),
  entitlement_id uuid references public.entitlements(id),
  format text not null check (format in ('WEB','PDF','SVG','AUDIO','CLUB_LINK')),
  version integer not null default 1,
  state text not null default 'PENDING' check (state in ('PENDING','PROCESSING','READY','FAILED','REVOKED')),
  storage_path text,
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  unique (user_id, product_id, format, version)
);

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deliverable_id uuid references public.deliverables(id),
  title text not null,
  universe text not null,
  item_type text not null,
  source_id text not null,
  occurred_at timestamptz not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, source_id)
);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null,
  rules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.location_cache (
  cache_key text primary key,
  provider text not null,
  provider_version text not null,
  query_normalized text not null,
  response jsonb not null,
  attribution text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_type text not null check (actor_type in ('USER','ADMIN','SYSTEM','PROVIDER')),
  action text not null,
  target_type text not null,
  target_id text,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger content_items_set_updated_at before update on public.content_items for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger offers_set_updated_at before update on public.offers for each row execute function public.set_updated_at();
create trigger purchases_set_updated_at before update on public.purchases for each row execute function public.set_updated_at();
create trigger entitlements_set_updated_at before update on public.entitlements for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.natal_profiles enable row level security;
alter table public.consent_events enable row level security;
alter table public.content_items enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.price_versions enable row level security;
alter table public.purchases enable row level security;
alter table public.webhook_inbox enable row level security;
alter table public.outbox_events enable row level security;
alter table public.entitlements enable row level security;
alter table public.jobs enable row level security;
alter table public.deliverables enable row level security;
alter table public.library_items enable row level security;
alter table public.feature_flags enable row level security;
alter table public.location_cache enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy natal_profiles_own on public.natal_profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy content_items_published on public.content_items for select to anon, authenticated using (state = 'PUBLISHED' and published_at <= now());
create policy products_active on public.products for select to anon, authenticated using (state = 'ACTIVE' and physical = false);
create policy offers_active on public.offers for select to anon, authenticated using (state = 'ACTIVE' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy prices_active on public.price_versions for select to anon, authenticated using (status = 'ACTIVE' and valid_from <= now() and (valid_until is null or valid_until > now()));
create policy purchases_select_own on public.purchases for select to authenticated using ((select auth.uid()) = user_id);
create policy entitlements_select_own on public.entitlements for select to authenticated using ((select auth.uid()) = user_id);
create policy deliverables_select_own on public.deliverables for select to authenticated using ((select auth.uid()) = user_id);
create policy library_items_own on public.library_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('deliverables','deliverables',false,26214400,array['application/pdf','image/svg+xml','audio/mpeg']),
       ('share-cards','share-cards',false,5242880,array['image/png','image/webp'])
on conflict (id) do nothing;

create policy deliverable_objects_select_own on storage.objects for select to authenticated
using (bucket_id in ('deliverables','share-cards') and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
