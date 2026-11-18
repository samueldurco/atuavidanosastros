import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const advisoryUrl = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const guard = "const singleBranch = splitTopLevel(body);\n  if (singleBranch.length === 1 && singleBranch[0].includes('*')) {\n    return { risky: true };\n  }";

// The registry still reports patched local packages by their original version.
// Admit this one advisory only after verifying the installed, fail-closed patch
// and executing attack regressions in a child with a hard deadline.
export function verifyPicomatchMitigation(root = process.cwd()) {
  const store = resolve(root, 'node_modules/.pnpm');
  const installedLock = readFileSync(resolve(store, 'lock.yaml'), 'utf8').replaceAll('\r\n', '\n');
  const snapshots = installedLock.split('\nsnapshots:\n')[1];
  assert.ok(snapshots, 'Installed dependency snapshots missing');
  const references = [...snapshots.matchAll(/^      picomatch: (.+)$/gm)].map(match => match[1]);
  const patchHash = createHash('sha256').update(readFileSync(resolve(root, 'patches/picomatch@4.0.7.patch'), 'utf8').replaceAll('\r\n', '\n')).digest('hex');
  assert.ok(references.length > 0, 'Installed picomatch graph missing');
  assert.ok(references.every(value => value === `4.0.7(patch_hash=${patchHash})`), 'Unpatched picomatch reference in installed graph');
  const copies = readdirSync(store).filter(name => name.startsWith('picomatch@4.0.7_patch_hash='));
  assert.ok(copies.length > 0, 'picomatch installation missing');
  for (const copy of copies) {
    const directory = resolve(store, copy, 'node_modules/picomatch');
    const pkg = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
    assert.equal(pkg.version, '4.0.7', 'Reassess mitigation after any version change');
    const source = readFileSync(resolve(directory, 'lib/parse.js'), 'utf8').replaceAll('\r\n', '\n');
    assert.ok(source.includes(guard), 'picomatch security patch missing');
    assert.ok(source.indexOf(guard) < source.indexOf('if (options.maxExtglobRecursion === false)'), 'Security guard must precede recursion opt-out');
    const result = spawnSync(process.execPath, ['--input-type=commonjs', '-e', `
      const assert = require('node:assert/strict');
      const pm = require(${JSON.stringify(directory)});
      for (const options of [{}, { maxExtglobRecursion: false }, { capture: true }, { bash: true }]) {
        for (const pattern of ['+(*)b', '+(*a)', '*(*a)', '+(a*)b', '+(*ab*)c', '+([a]*b)', '+(*(a))b']) {
          const match = pm(pattern, options);
          assert.equal(match('a'.repeat(10000) + '!'), false, pattern);
          assert.equal(match(pattern), true, pattern + ' must fail closed as literal text');
        }
      }
      assert.equal(pm.isMatch('src/components/page.svelte', '**/*.svelte'), true);
      assert.equal(pm.isMatch('page.ts', '*.{ts,svelte}'), true);
      assert.equal(pm.isMatch('aaa', '+(a)'), true);
      assert.equal(pm.isMatch('ab', '@(ab|cd)'), true);
    `], { encoding: 'utf8', timeout: 5000 });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr);
  }
  return new Set(['4.0.7']);
}

export function isMitigated(advisory, protectedVersions) {
  return advisory.url === advisoryUrl && advisory.module_name === 'picomatch'
    && advisory.vulnerable_versions === '<=4.0.7'
    && advisory.findings?.length > 0
    && advisory.findings.every(finding => protectedVersions.has(finding.version));
}

export function audit(root = process.cwd()) {
  const protectedVersions = verifyPicomatchMitigation(root);
  const windows = process.platform === 'win32';
  const result = spawnSync(windows ? 'pnpm audit --json' : 'pnpm', windows ? [] : ['audit', '--json'], {
    cwd: root, shell: process.platform === 'win32', encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const report = JSON.parse(result.stdout);
  assert.ok(report.advisories && report.metadata, result.stderr || 'Unexpected audit response');
  const advisories = Object.values(report.advisories);
  const remaining = advisories.filter(item => !isMitigated(item, protectedVersions));
  console.log(JSON.stringify({
    mitigated: advisories.filter(item => isMitigated(item, protectedVersions)).map(item => item.url),
    remaining: remaining.map(item => ({ url: item.url, severity: item.severity, module: item.module_name })),
    patchSha256: createHash('sha256').update(readFileSync(resolve(root, 'patches/picomatch@4.0.7.patch'))).digest('hex'),
  }, null, 2));
  assert.equal(remaining.length, 0, 'Unmitigated dependency advisory');
  assert.ok(result.status === 0 || (result.status === 1 && advisories.length > 0), 'Audit process failed');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) audit();
