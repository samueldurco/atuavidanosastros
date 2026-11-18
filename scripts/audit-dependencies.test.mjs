import test from 'node:test';
import assert from 'node:assert/strict';
import { isMitigated, verifyPicomatchMitigation } from './audit-dependencies.mjs';

test('installed picomatch fails closed on repeated wildcard attacks within a hard deadline', () => {
  assert.deepEqual([...verifyPicomatchMitigation()], ['4.0.7']);
});

test('audit mitigation is limited to the exact advisory and protected installed version', () => {
  const advisory = {
    url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
    module_name: 'picomatch', vulnerable_versions: '<=4.0.7', findings: [{ version: '4.0.7' }],
  };
  const versions = new Set(['4.0.7']);
  assert.equal(isMitigated(advisory, versions), true);
  for (const change of [
    { url: 'https://github.com/advisories/another-advisory' },
    { module_name: 'another-package' }, { vulnerable_versions: '<=4.0.8' },
    { findings: [] }, { findings: [{ version: '4.0.6' }] },
  ]) assert.equal(Boolean(isMitigated({ ...advisory, ...change }, versions)), false);
  assert.equal(isMitigated(advisory, new Set()), false);
});
