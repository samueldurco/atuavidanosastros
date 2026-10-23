-- Add the two current career tools to their catalog universe without removing
-- historical IDs or changing saved result payloads, ownership, RLS or grants.
-- Keep the Auth-cascade fix from 20261013145855.
create or replace function public.link_free_tool_result() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'DELETE' then
  if current_user = 'supabase_auth_admin' then
   return old;
  end if;
  delete from public.library_items where user_id = old.user_id and item_type = 'FREE_TOOL_RESULT' and source_id = old.id::text;
  return old;
 end if;
 insert into public.library_items(user_id,title,universe,item_type,source_id,occurred_at)
 values(new.user_id,new.result->>'title',case
  when new.tool in ('ascendente','mapa-astral') then 'meu-ceu'
  when new.tool in ('meio-do-ceu','dinheiro-no-mapa') then 'proposito'
  when new.tool = 'combinacao-do-casal' then 'amor'
  when new.tool = 'registro-de-sonho' then 'sonhos'
  else 'tarot' end,'FREE_TOOL_RESULT',new.id::text,new.created_at)
 on conflict(user_id,item_type,source_id) do nothing;
 return new;
end;
$$;

-- Repair only metadata produced by the old ELSE branch, joined by both owner
-- and source. Archived entries remain correctly classified if later restored.
update public.library_items as item
set universe = 'proposito'
from public.free_tool_results as result
where item.user_id = result.user_id
 and item.item_type = 'FREE_TOOL_RESULT'
 and item.source_id = result.id::text
 and result.tool in ('meio-do-ceu','dinheiro-no-mapa')
 and item.universe = 'tarot';
