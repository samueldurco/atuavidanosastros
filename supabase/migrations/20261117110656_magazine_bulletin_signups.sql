-- The public form writes through the server. Preserve signup receipts if the form is rolled back.
create table public.magazine_bulletin_signups (
  email text primary key,
  consent_version text not null,
  consented_at timestamptz not null default now(),
  constraint magazine_bulletin_email_format check (
    length(email) <= 254
    and email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$'
  )
);

alter table public.magazine_bulletin_signups enable row level security;
revoke all on table public.magazine_bulletin_signups from public, anon, authenticated, service_role;
grant insert, select, delete on table public.magazine_bulletin_signups to service_role;
