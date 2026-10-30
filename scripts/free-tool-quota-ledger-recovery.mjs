import { pathToFileURL } from 'node:url';
import { file } from './helpers/product-database.mjs';

const migration = 'supabase/migrations/20261028171546_free_tool_quota_ledger.sql';
const functions = [
  'lock_free_tool_subject', 'read_free_tool_state', 'read_free_tool_history',
  'commit_free_tool_result', 'claim_free_tool_subject'
];

/** Restore the applied expansion's RPC definitions and access controls, never its data. */
export async function freeToolLedgerForwardFix() {
  const source = await file(migration);
  const start = source.indexOf('alter table public.free_tool_subjects enable row level security;');
  if (start < 0) throw new Error('free_tool_recovery_source_changed');
  const recovery = source.slice(start);
  const found = [...recovery.matchAll(/^create function public\.([a-z_]+)\(/gm)].map(match => match[1]);
  if (JSON.stringify(found) !== JSON.stringify(functions)) throw new Error('free_tool_recovery_functions_changed');
  return `-- Generated from ${migration}; run only after the expansion is fully applied.
-- No table, index, row or quota reset. Definitions and access controls only.
begin;
${recovery.replace(/^create function public\./gm, 'create or replace function public.')}
commit;
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(await freeToolLedgerForwardFix());
}
