import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../packages/astrology/package.json', import.meta.url));
const entry = pathToFileURL(require.resolve('caelus/data-embedded'));
const files = [entry, ...[...readFileSync(entry, 'utf8').matchAll(/from "(\.\.\/data\/[^"\n]+)"/g)].map((match) => new URL(match[1], entry))];
const dependency = JSON.parse(readFileSync(new URL('../../package.json', entry), 'utf8'));
const manifest = { provider: dependency.name, version: dependency.version, tier: 'embedded', files: files.map((file) => ({ path: file.pathname.split('/dist/')[1], sha256: createHash('sha256').update(readFileSync(file)).digest('hex') })) };
const target = new URL('../packages/astrology/src/data-manifest.json', import.meta.url);
const content = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes('--write')) writeFileSync(target, content);
else if (readFileSync(target, 'utf8') !== content) throw new Error('O dataset do motor diverge do manifesto.');
console.log(`PASS: ${manifest.files.length} arquivos do dataset conferidos.`);
