-- Human test feedback is separate from automatic editorial review and commercial release.
create table public.atv_launch_feedback (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null,
  preparation_id uuid not null references public.atv_launch_readings(preparation_id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  reading_digest text not null check (reading_digest ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('approved','rejected')),
  comment text not null default '' check (length(comment)<=3000),
  created_at timestamptz not null default now(),
  unique(owner_id,request_key),
  constraint launch_feedback_rejection_reason check (decision<>'rejected' or length(trim(comment))>0)
);
alter table public.atv_launch_feedback enable row level security;
create policy launch_feedback_owner_read on public.atv_launch_feedback
  for select to authenticated
  using (owner_id=(select auth.uid()) and (select public.has_atv_trial_access()));
create policy launch_feedback_owner_insert on public.atv_launch_feedback
  for insert to authenticated
  with check (owner_id=(select auth.uid()) and (select public.has_atv_trial_access()));
revoke all on public.atv_launch_feedback from public,anon,authenticated,service_role;
grant select on public.atv_launch_feedback to authenticated,service_role;
grant insert(request_key,preparation_id,owner_id,reading_digest,decision,comment)
  on public.atv_launch_feedback to authenticated;
create index launch_feedback_owner_preparation_created
  on public.atv_launch_feedback(owner_id,preparation_id,created_at desc);

create function public.guard_atv_launch_feedback() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op<>'INSERT' then
    raise exception 'launch_feedback_immutable' using errcode='23514';
  end if;
  if new.owner_id is distinct from auth.uid() or not public.has_atv_trial_access() then
    raise exception 'launch_feedback_access_denied' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.atv_launch_readings r
    where r.preparation_id=new.preparation_id and r.owner_id=new.owner_id
      and r.reading_digest=new.reading_digest
  ) then
    raise exception 'launch_feedback_reading_mismatch' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_atv_launch_feedback() from public,anon,authenticated;
create trigger launch_feedback_guard before insert or update on public.atv_launch_feedback
  for each row execute function public.guard_atv_launch_feedback();
