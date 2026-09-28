import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createArtifactManifest } from '../../packages/ai/src/artifacts.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
/** Read-only offline Git snapshot; no network, provider, evaluation or registry mutation. */
export function readRepositoryArtifacts(ref = 'HEAD') {
  if (ref !== 'HEAD' && !/^[a-f0-9]{40}$/.test(ref)) throw new Error('invalid_artifact_commit');
  try {
    const commit = execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
      cwd: root, encoding: 'utf8', maxBuffer: 4096, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return createArtifactManifest(commit, (path) => execFileSync('git', ['show', `${commit}:${path}`], {
      cwd: root, maxBuffer: 1048576, stdio: ['ignore', 'pipe', 'pipe'],
    }));
  } catch { throw new Error('artifact_snapshot_unavailable'); }
}
