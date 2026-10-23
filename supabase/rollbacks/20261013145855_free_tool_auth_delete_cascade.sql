-- Restore the previous implementation; no schema or data changes.
create or replace function public.link_free_tool_result() returns trigger language plpgsql security invoker set search_path = '' as $$
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
