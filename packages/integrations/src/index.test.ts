import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHotmartNotification, sha256Hex, verifyHotmartHottok } from './index.ts';

test('valida hottok sem expor o valor', async () => {
  assert.equal(await verifyHotmartHottok('segredo', 'segredo'), true);
  assert.equal(await verifyHotmartHottok('outro', 'segredo'), false);
  assert.equal(await verifyHotmartHottok(null, 'segredo'), false);
});

test('hash SHA-256 é determinístico', async () => {
  assert.equal(await sha256Hex('atv'), await sha256Hex('atv'));
  assert.equal((await sha256Hex('atv')).length, 64);
});

test('parser recusa payload sem identidade idempotente', () => {
  assert.equal(parseHotmartNotification({ event: 'PURCHASE_APPROVED', data: {} }), null);
  assert.equal(parseHotmartNotification({ id: 'evt-1', event: 'PURCHASE_APPROVED', data: {} })?.id, 'evt-1');
});
