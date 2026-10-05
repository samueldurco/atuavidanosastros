create table public.tiktok_connections (
  id text primary key check (id = 'primary'),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  open_id text not null,
  display_name text not null,
  avatar_url text not null,
  scopes text[] not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  token_ciphertext text not null,
  token_iv text not null,
  last_verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tiktok_connections enable row level security;
revoke all on public.tiktok_connections from public,anon,authenticated,service_role;
grant select,insert,update on public.tiktok_connections to service_role;

create trigger tiktok_connections_set_updated_at
before update on public.tiktok_connections
for each row execute function public.set_updated_at();

comment on table public.tiktok_connections is
  'Conexão administrativa única com TikTok; tokens são cifrados na aplicação antes da persistência.';
