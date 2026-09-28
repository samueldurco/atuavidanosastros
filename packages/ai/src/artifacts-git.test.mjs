import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readRepositoryArtifacts } from '../../../scripts/helpers/lab-artifacts.mjs';
import { validArtifactManifest } from './artifacts.ts';

const cli = fileURLToPath(new URL('../../../scripts/lab-artifacts.mjs', import.meta.url));
test('offline CLI snapshots immutable Git blobs, independent of cwd, without source content', () => {
  const expected = readRepositoryArtifacts();
  assert.equal(validArtifactManifest(expected), true);
  assert.deepEqual(readRepositoryArtifacts(expected.commit), expected);
  const result = spawnSync(process.execPath, [cli, expected.commit], {
    encoding: 'utf8', cwd: fileURLToPath(new URL('.', import.meta.url)),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), expected);
  assert.equal(Object.keys(JSON.parse(result.stdout)).length, 3);
});

test('offline snapshot fails closed for unknown commit, refs/options and extra arguments', () => {
  for (const value of ['main', '../secret', '--help', '0'.repeat(40)]) {
    assert.throws(() => readRepositoryArtifacts(value), /invalid_artifact_commit|artifact_snapshot_unavailable/);
    const result = spawnSync(process.execPath, [cli, value], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^Lab artifact snapshot unavailable/);
    assert.ok(!result.stderr.includes('fatal:'));
  }
  const result = spawnSync(process.execPath, [cli, 'HEAD', 'extra'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
});
