-- Expand: retain historical approved editions and add independent reader state.
alter table public.atv_trial_readings drop constraint atv_trial_readings_approval_check;
alter table public.atv_trial_readings add constraint atv_trial_readings_approval_check check (
  coalesce(approval->>'status'='approved' and approval->>'scope'='private-free-test'
    and approval->>'policy' in ('atv-private-trial-approval/1.0.0','atv-private-trial-approval/2.0.0','atv-private-trial-approval/3.0.0')
    and approval->>'digest' ~ '^[0-9a-f]{64}$',false)
);

create table public.atv_trial_reader_state (
  owner_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid not null,
  chapter integer not null default 0 check(chapter between 0 and 59),
  bookmarks integer[] not null default '{}' check(cardinality(bookmarks)<=60 and 0<=all(bookmarks) and 60>all(bookmarks) and array_position(bookmarks,null) is null),
  updated_at timestamptz not null default now(),
  primary key(owner_id,reading_id),
  foreign key(owner_id,reading_id) references public.atv_trial_readings(owner_id,id) on delete cascade
);
alter table public.atv_trial_reader_state enable row level security;
create policy trial_reader_owner on public.atv_trial_reader_state for all to authenticated
  using(owner_id=auth.uid() and public.has_atv_trial_access())
  with check(owner_id=auth.uid() and public.has_atv_trial_access());
revoke all on public.atv_trial_reader_state from anon,authenticated;
grant select,insert,update,delete on public.atv_trial_reader_state to authenticated;
grant all on public.atv_trial_reader_state to service_role;

-- Opaque, expiring links created explicitly by the owner. Never store the bearer token.
create table public.atv_trial_shares (
  owner_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid not null,
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(owner_id,reading_id),
  foreign key(owner_id,reading_id) references public.atv_trial_readings(owner_id,id) on delete cascade
);
alter table public.atv_trial_shares enable row level security;
create policy trial_share_owner on public.atv_trial_shares for all to authenticated
  using(owner_id=auth.uid() and public.has_atv_trial_access())
  with check(owner_id=auth.uid() and public.has_atv_trial_access()
    and exists(select 1 from public.atv_trial_readings r where r.owner_id=auth.uid() and r.id=reading_id and r.product_id in ('synastry','pair-preview','couple-dossier')));
revoke all on public.atv_trial_shares from anon,authenticated;
grant select,insert,update,delete on public.atv_trial_shares to authenticated;
grant all on public.atv_trial_shares to service_role;
