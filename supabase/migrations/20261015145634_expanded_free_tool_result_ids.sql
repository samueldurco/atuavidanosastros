-- Preserve all six historical IDs while accepting the three new free tools.
alter table public.free_tool_results drop constraint free_tool_results_tool_check;
alter table public.free_tool_results add constraint free_tool_results_tool_check check (
 tool in ('ascendente','mapa-astral','carta-do-dia','tarot-sim-ou-nao','combinacao-do-casal','registro-de-sonho',
 'meio-do-ceu','dinheiro-no-mapa','carta-do-amor')
);
