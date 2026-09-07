begin;

create table public.calculation_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('MIDHEAVEN')),
  input_fingerprint text not null,
  result jsonb not null,
  provenance jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, input_fingerprint)
);

create trigger calculation_results_set_updated_at
before update on public.calculation_results
for each row execute function public.set_updated_at();

alter table public.calculation_results enable row level security;

create policy calculation_results_own on public.calculation_results
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

commit;
