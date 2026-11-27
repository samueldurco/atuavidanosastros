-- Isolated P03 synthetic preview. No manuscripts, real addresses or payment data.
create table if not exists public.p03_preview_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 0 check (version >= 0),
  data_json jsonb not null default '{"quotes":[],"orders":[],"shipments":[],"events":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint p03_preview_document_limit check (octet_length(data_json::text) <= 2000000)
);
alter table public.p03_preview_accounts enable row level security;
revoke all on public.p03_preview_accounts from anon, authenticated;
grant select, insert, update on public.p03_preview_accounts to service_role;
drop policy if exists p03_preview_owner_select on public.p03_preview_accounts;
drop policy if exists p03_preview_owner_insert on public.p03_preview_accounts;
drop policy if exists p03_preview_owner_update on public.p03_preview_accounts;
comment on table public.p03_preview_accounts is 'P03 synthetic preview only. Server-only writes after verified Auth allowlist; owner-filtered CAS preserves atomic orders, shipment competencies and event deduplication. No client RLS policies.';
