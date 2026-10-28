import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setupProductDatabase, file } from './helpers/product-database.mjs';

// Test transport only: a loopback PostgREST-shaped adapter around the actual migration.
// It is never imported by the application or deployed. Hosted JWT/PostgREST behavior
// and independent PostgreSQL connections are separately validated at release.
export const serviceKey = 'atv-e2e-only-ledger-service-role-key';
const procedures = {
  read_free_tool_state: ['p_subject', 'p_tool'],
  commit_free_tool_result: ['p_subject', 'p_tool', 'p_input_hash', 'p_input', 'p_result'],
  claim_free_tool_subject: ['p_anonymous_subject', 'p_user_subject', 'p_resolution'],
  read_free_tool_history: ['p_subject', 'p_tool', 'p_before', 'p_result_id']
};
export async function startLedgerRpc(port = 0) {
  const db = await setupProductDatabase({ privateOnly: true });
  await db.exec(await file('supabase/migrations/20261028171546_free_tool_quota_ledger.sql'));
  const server = createServer(async (request, response) => {
    const send = (status, value) => {
      response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify(value));
    };
    if (request.url === '/health' && request.method === 'GET') return send(200, { testOnly: true });
    const name = request.url?.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
    if (request.method !== 'POST' || !Object.hasOwn(procedures, name ?? '')) return send(404, { message: 'not_found' });
    if (request.headers.apikey !== serviceKey || request.headers.authorization !== `Bearer ${serviceKey}`) return send(401, { message: 'invalid_test_key' });
    try {
      let raw = '';
      for await (const chunk of request) {
        raw += chunk.toString();
        if (Buffer.byteLength(raw) > 262144) return send(413, { message: 'body_too_large' });
      }
      const input = JSON.parse(raw);
      const keys = procedures[name];
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key))) return send(400, { message: 'invalid_input' });
      const values = keys.map(key => input[key] ?? null);
      const data = await db.transaction(async transaction => {
        await transaction.exec('set local role service_role');
        const result = await transaction.query(`select public.${name}(${keys.map((_, index) => `$${index + 1}`).join(',')}) as data`, values);
        return result.rows[0].data;
      });
      send(200, data);
    } catch (error) {
      send(400, { message: error instanceof Error ? error.message : 'test_rpc_failed' });
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => { await new Promise(resolve => server.close(resolve)); await db.close(); }
  };
}

async function main() {
  const port = Number(process.env.ATV_E2E_PORT ?? 4173);
  // The operating system assigns the RPC port so independent Auth fixtures can
  // continue to use their own worker ports in the same Playwright run.
  const rpcPort = Number(process.env.ATV_E2E_RPC_PORT ?? 0);
  const validPort = value => Number.isInteger(value) && value > 1024 && value < 65536;
  if (!validPort(port) || (rpcPort !== 0 && !validPort(rpcPort)) || port === rpcPort) throw new Error('invalid_test_ports');
  const ledger = await startLedgerRpc(rpcPort);
  if (process.argv.includes('--rpc-only')) {
    console.log(`Test-only quota RPC ready at ${ledger.url}`);
    const stop = async () => { await ledger.close(); process.exit(0); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    return;
  }
  const receiptKey = 'atv-e2e-only-free-tool-receipt-key-20261013';
  const bindings = { FREE_TOOL_RECEIPT_KEY: receiptKey, PUBLIC_SUPABASE_URL: ledger.url, SUPABASE_SERVICE_ROLE_KEY: serviceKey };
  const cwd = fileURLToPath(new URL('../apps/web/', import.meta.url));
  let child;
  const stop = async () => { child?.kill(); await ledger.close(); process.exit(0); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  const run = args => new Promise((resolve, reject) => {
    // pnpm supplies its own entry point, avoiding Windows shell quoting.
    const pnpmPath = process.env.npm_execpath;
    child = pnpmPath
      ? spawn(process.execPath, [pnpmPath, ...args], { cwd, env: { ...process.env, ...bindings }, stdio: 'inherit' })
      : spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, { cwd, env: { ...process.env, ...bindings }, stdio: 'inherit', shell: process.platform === 'win32' });
    child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`test_server_exit_${code}`)));
  });
  try {
    if (!process.argv.includes('--skip-build')) await run(['build']);
    await run(['exec', 'wrangler', 'pages', 'dev', '.svelte-kit/cloudflare', '--port', String(port), ...Object.entries(bindings).flatMap(([key, value]) => ['--binding', `${key}=${value}`])]);
  } finally { await ledger.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
