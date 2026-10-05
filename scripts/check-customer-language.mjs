import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { inspectEditorialStyle } from '../packages/ai/src/editorial-style.ts';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const roots = ['apps/web/src/lib/components', 'apps/web/src/routes', 'apps/web/src/lib/data'];
const sources = (await Promise.all(roots.map(files))).flat().filter((path) =>
  /\.(svelte|ts)$/.test(path) && !/\.(spec|test)\./.test(path) && !/[\\/](admin|_spec|api|design-system)[\\/]/.test(path));
sources.push('apps/web/src/lib/seo.ts', 'apps/web/src/lib/server/product-pdf.ts',
  'apps/web/src/lib/server/product-narration.ts', 'apps/web/src/lib/server/product-email-message.ts',
  'apps/web/src/lib/server/product-svg.ts');
const findings = [];
for (const path of sources) {
  const source = await readFile(path, 'utf8');
  // Source files contain alternative states that do not appear together on screen.
  // Repetition is checked on generated passages by the editorial director instead.
  for (const finding of inspectEditorialStyle([{ text: source, location: relative('.', path) }]))
    if (finding.code !== 'repeated_disclaimer') findings.push(finding);
}
console.log(JSON.stringify({ checked: sources.length, findings }, null, 2));
if (findings.length) process.exitCode = 1;
