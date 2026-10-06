-- Additive private, free owner testing; independent from commercial entitlement.
create table public.atv_trial_grants (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);
alter table public.atv_trial_grants enable row level security;
create policy trial_grant_read on public.atv_trial_grants for select to authenticated using (owner_id=auth.uid());
revoke all on public.atv_trial_grants from authenticated;
grant select on public.atv_trial_grants to authenticated;
revoke all on public.atv_trial_grants from anon;

create function public.has_atv_trial_access() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.atv_trial_grants g where g.owner_id=auth.uid() and g.revoked_at is null and (g.expires_at is null or g.expires_at>now()));
$$;
revoke all on function public.has_atv_trial_access() from public,anon;
grant execute on function public.has_atv_trial_access() to authenticated,service_role;

create table public.atv_trial_readings (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check(product_id in ('birth-chart','three-pillars','ascendant','life-atlas','horoscope','date-reading','week-reading','personal-calendar','solar-return','pair-preview','synastry','couple-dossier','daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey','midheaven','career-compass','purpose-career','direction-journey','dream-journal','dream-reading','dream-dossier','dream-atlas')),
  request_key uuid not null,
  source_ids uuid[] not null default '{}' check(cardinality(source_ids)<=150),
  input jsonb not null check(jsonb_typeof(input)='object' and coalesce(input->>'productId'=product_id,false)),
  calculation jsonb not null check(jsonb_typeof(calculation)='object'),
  reading jsonb not null check(jsonb_typeof(reading)='object' and coalesce(reading->>'productId'=product_id,false)),
  approval jsonb not null check(coalesce(approval->>'status'='approved' and approval->>'scope'='private-free-test' and approval->>'policy'='atv-private-trial-approval/1.0.0' and approval->>'digest' ~ '^[0-9a-f]{64}$',false)),
  created_at timestamptz not null default now(),
  unique(owner_id,request_key), unique(owner_id,product_id,id), unique(owner_id,id),
  check(pg_column_size(input)+pg_column_size(calculation)+pg_column_size(reading)<2000000)
);
alter table public.atv_trial_readings enable row level security;
create policy trial_readings_read on public.atv_trial_readings for select to authenticated using(owner_id=auth.uid() and public.has_atv_trial_access());
revoke all on public.atv_trial_readings from authenticated;
grant select on public.atv_trial_readings to authenticated;
revoke all on public.atv_trial_readings from anon;
create index trial_readings_owner_date on public.atv_trial_readings(owner_id,created_at desc);

create function public.guard_atv_trial_insert() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.atv_trial_grants g where g.owner_id=new.owner_id and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())) then
    raise exception 'trial_access_revoked' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_atv_trial_insert() from public,anon,authenticated;
create trigger trial_insert_grant before insert on public.atv_trial_readings for each row execute function public.guard_atv_trial_insert();

create table public.atv_trial_feedback (
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  reading_id uuid not null,
  decision text not null check(decision in ('approved','rejected')),
  comment text not null default '' check(length(comment)<=3000),
  updated_at timestamptz not null default now(),
  primary key(owner_id,product_id),
  foreign key(owner_id,product_id,reading_id) references public.atv_trial_readings(owner_id,product_id,id) on delete cascade
);
alter table public.atv_trial_feedback enable row level security;
create policy trial_feedback_owner on public.atv_trial_feedback for all to authenticated using(owner_id=auth.uid() and public.has_atv_trial_access()) with check(owner_id=auth.uid() and public.has_atv_trial_access());
revoke all on public.atv_trial_feedback from authenticated;
grant select,insert,update,delete on public.atv_trial_feedback to authenticated;
revoke all on public.atv_trial_feedback from anon;

create table public.atv_trial_dreams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid not null,
  data jsonb not null check(jsonb_typeof(data)='object' and pg_column_size(data)<15000),
  revision integer not null default 1 check(revision>0),
  created_at timestamptz not null default now(),
  unique(owner_id,reading_id),
  foreign key(owner_id,reading_id) references public.atv_trial_readings(owner_id,id) on delete cascade
);
alter table public.atv_trial_dreams enable row level security;
create policy trial_dreams_owner on public.atv_trial_dreams for select to authenticated using(owner_id=auth.uid() and public.has_atv_trial_access());
revoke all on public.atv_trial_dreams from authenticated;
grant select on public.atv_trial_dreams to authenticated;
revoke all on public.atv_trial_dreams from anon;
create trigger trial_dream_insert_grant before insert on public.atv_trial_dreams for each row execute function public.guard_atv_trial_insert();

create table public.atv_trial_notes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid not null,
  step integer not null check(step between 0 and 30),
  text text not null check(length(text) between 1 and 3000),
  updated_at timestamptz not null default now(),
  primary key(owner_id,reading_id,step),
  foreign key(owner_id,reading_id) references public.atv_trial_readings(owner_id,id) on delete cascade
);
alter table public.atv_trial_notes enable row level security;
create policy trial_notes_owner on public.atv_trial_notes for all to authenticated using(owner_id=auth.uid() and public.has_atv_trial_access()) with check(owner_id=auth.uid() and public.has_atv_trial_access());
revoke all on public.atv_trial_notes from authenticated;
grant select,insert,update,delete on public.atv_trial_notes to authenticated;
revoke all on public.atv_trial_notes from anon;
-- service_role inserts only after server review; clients cannot forge an approved reading.
grant all on public.atv_trial_grants,public.atv_trial_readings,public.atv_trial_feedback,public.atv_trial_dreams,public.atv_trial_notes to service_role;

create table public.atv_trial_club_feedback (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  decision text not null check(decision in ('approved','rejected')),
  comment text not null default '' check(length(comment)<=3000),
  updated_at timestamptz not null default now()
);
alter table public.atv_trial_club_feedback enable row level security;
create policy trial_club_feedback_owner on public.atv_trial_club_feedback for all to authenticated using(owner_id=auth.uid() and public.has_atv_trial_access()) with check(owner_id=auth.uid() and public.has_atv_trial_access());
revoke all on public.atv_trial_club_feedback from anon,authenticated;
grant select,insert,update,delete on public.atv_trial_club_feedback to authenticated;
grant all on public.atv_trial_club_feedback to service_role;
