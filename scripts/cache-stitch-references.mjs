import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Input must be the unmodified get_screen response from the authorized Stitch MCP.
const manifest = resolve(process.argv[2] ?? 'test-results/gate-b/stitch-references.json');
const destination = resolve('test-results/gate-b/references');
const screens = JSON.parse(await readFile(manifest, 'utf8'));
await mkdir(destination, { recursive: true });
for (let start = 0; start < screens.length; start += 4) {
  await Promise.all(screens.slice(start, start + 4).map(async (screen) => {
    const id = screen.name.split('/').at(-1);
    if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('Unexpected screen identifier');
    const files = {};
    for (const [kind, extension] of [['htmlCode', 'html'], ['screenshot', 'png']]) {
      const url = new URL(screen[kind].downloadUrl);
      if (url.protocol !== 'https:' || !['contribution.usercontent.google.com', 'lh3.googleusercontent.com'].includes(url.hostname)) throw new Error('Unexpected export host');
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      await writeFile(resolve(destination, `${id}.${extension}`), bytes);
      files[extension] = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    }
    console.log(JSON.stringify({ id, title: screen.title, files }));
  }));
}
