import { build } from 'esbuild';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
const output = 'supabase/functions/atv-free-tools-runtime/runtime.js';
await build({ entryPoints: ['supabase/functions/atv-free-tools-runtime/handler.ts'], outfile: output,
 bundle: true, platform: 'neutral', format: 'esm', target: 'es2022', minify: true,
 alias: { '$lib': resolve('apps/web/src/lib'), '@atv/domain': resolve('packages/domain/src/index.ts'), '@atv/astrology': resolve('packages/astrology/src/index.ts') }, conditions: ['import', 'default'] });
const { size } = await stat(output);
if (size > 20 * 1024 * 1024) throw new Error('Public tool runtime exceeds deployment size limit');
console.log(`Public tool runtime bundle: ${size} bytes`);
