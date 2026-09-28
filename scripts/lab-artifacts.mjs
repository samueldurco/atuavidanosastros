import { readRepositoryArtifacts } from './helpers/lab-artifacts.mjs';

try {
  if (process.argv.length > 3) throw new Error('invalid_arguments');
  console.log(JSON.stringify(readRepositoryArtifacts(process.argv[2]), null, 2));
} catch {
  console.error('Lab artifact snapshot unavailable. Use HEAD or an existing full commit SHA.');
  process.exitCode = 1;
}
