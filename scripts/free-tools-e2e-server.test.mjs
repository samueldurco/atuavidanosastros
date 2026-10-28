import test from 'node:test';
import assert from 'node:assert/strict';
import { startLedgerRpc, serviceKey } from './free-tools-e2e-server.mjs';

test('test RPC executes migration as service_role and keeps canonical result across HTTP calls', async () => {
  const rpc = await startLedgerRpc(0);
  const invoke = (name, input, key = serviceKey) => fetch(`${rpc.url}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: { 'content-type': 'application/json', apikey: key, authorization: `Bearer ${key}` }, body: JSON.stringify(input)
  });
  const subject = 'anon:10000000-0000-4000-8000-000000000001';
  const stateInput = { p_subject: subject, p_tool: 'carta-do-dia' };
  try {
    assert.equal((await invoke('read_free_tool_state', stateInput, 'invalid')).status, 401);
    assert.equal((await invoke('unexpected', stateInput)).status, 404);
    assert.equal((await (await invoke('read_free_tool_state', stateInput)).json()).result, null);
    const result = { version: 'atv-free-tool-result/1.0.0', tool: 'carta-do-dia', id: '20000000-0000-4000-8000-000000000001', createdAt: new Date().toISOString(), title: 'Synthetic test', facts: [], sections: [], limits: [] };
    const initial = await invoke('commit_free_tool_result', { ...stateInput, p_input_hash: 'a'.repeat(64), p_input: {}, p_result: result });
    assert.equal(initial.status, 200);
    const envelope = await initial.json();
    assert.equal(envelope.result.id, result.id);
    const repeated = await invoke('commit_free_tool_result', { ...stateInput, p_input_hash: 'b'.repeat(64), p_input: { focus: 'Another question' }, p_result: { ...result, id: '20000000-0000-4000-8000-000000000002' } });
    assert.deepEqual((await repeated.json()).result, envelope.result);
    assert.deepEqual((await (await invoke('read_free_tool_state', stateInput)).json()).result, envelope.result);
    const history = await invoke('read_free_tool_history', { p_subject: subject, p_tool: 'registro-de-sonho', p_before: null, p_result_id: null });
    assert.deepEqual(await history.json(), { history: [], nextCursor: null });
  } finally { await rpc.close(); }
});
