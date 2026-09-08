import { execFileSync } from 'node:child_process';

// Report categories and file names only, never the matching credential material.
const patch = execFileSync('git', ['diff', '--cached', '--no-ext-diff', '--unified=0'], { encoding: 'utf8' });
const patterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['google-api-key', /AIza[0-9A-Za-z_-]{30,}/],
  ['github-token', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
  ['supabase-secret', /sb_secret_[A-Za-z0-9_-]{20,}/],
  ['aws-access-key', /AKIA[0-9A-Z]{16}/],
  ['credential-url', /(?:postgres(?:ql)?|https?):\/\/[^\s/:]+:[^\s/@]{8,}@/]
];
let file = '';
const findings = new Set();
for (const line of patch.split('\n')) {
  if (line.startsWith('+++ b/')) file = line.slice(6);
  if (!line.startsWith('+') || line.startsWith('+++')) continue;
  for (const [name, pattern] of patterns) if (pattern.test(line)) findings.add(`${file}: ${name}`);
}
if (findings.size) { console.error([...findings].join('\n')); process.exitCode = 1; }
else console.log('PASS: no known credential patterns in staged additions (complements CI Gitleaks).');
