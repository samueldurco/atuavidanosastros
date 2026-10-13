-- Additive storage for optional, owner-only saving after an anonymous public result.
create table public.free_tool_results (
 user_id uuid not null references public.profiles(id) on delete cascade,
 id uuid not null,
 tool text not null check (tool in ('ascendente','mapa-astral','carta-do-dia','tarot-sim-ou-nao','combinacao-do-casal','registro-de-sonho')),
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key (user_id,id),
 constraint free_tool_result_shape check (coalesce((
  jsonb_typeof(result) = 'object' and octet_length(result::text) <= 110000
  and result->>'version' = 'atv-free-tool-result/1.0.0'
  and result->>'tool' = tool and result->>'id' = id::text
  and jsonb_typeof(result->'title') = 'string' and length(result->>'title') between 1 and 180
  and jsonb_typeof(result->'facts') = 'array' and jsonb_typeof(result->'sections') = 'array'
  and jsonb_typeof(result->'limits') = 'array'
 ), false))
);
alter table public.free_tool_results enable row level security;
revoke all on public.free_tool_results from public, anon, authenticated, service_role;
grant select, delete on public.free_tool_results to authenticated;
grant select, insert on public.free_tool_results to service_role;
create policy free_tool_owner_read on public.free_tool_results for select to authenticated using ((select auth.uid()) = user_id);
create policy free_tool_owner_delete on public.free_tool_results for delete to authenticated using ((select auth.uid()) = user_id);

create function public.link_free_tool_result() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'DELETE' then
  delete from public.library_items where user_id = old.user_id and item_type = 'FREE_TOOL_RESULT' and source_id = old.id::text;
  return old;
 end if;
 insert into public.library_items(user_id,title,universe,item_type,source_id,occurred_at)
 values(new.user_id,new.result->>'title',case
  when new.tool in ('ascendente','mapa-astral') then 'meu-ceu'
  when new.tool = 'combinacao-do-casal' then 'amor'
  when new.tool = 'registro-de-sonho' then 'sonhos'
  else 'tarot' end,'FREE_TOOL_RESULT',new.id::text,new.created_at)
 on conflict(user_id,item_type,source_id) do nothing;
 return new;
end;
$$;
revoke all on function public.link_free_tool_result() from public,anon,authenticated;
create trigger free_tool_library_link after insert or delete on public.free_tool_results for each row execute function public.link_free_tool_result();
