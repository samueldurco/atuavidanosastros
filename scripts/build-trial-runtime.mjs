import { build } from 'esbuild';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
const output = 'supabase/functions/atv-trial-runtime/runtime.js';
await build({
 entryPoints: ['supabase/functions/atv-trial-runtime/handler.ts'], outfile: output,
 bundle: true, platform: 'neutral', format: 'esm', target: 'es2022', minify: true,
 alias: { '@atv/domain': resolve('packages/domain/src/index.ts'), '@atv/astrology': resolve('packages/astrology/src/index.ts') },
 conditions: ['import', 'default']
});
const { size } = await stat(output);
if (size > 20 * 1024 * 1024) throw new Error('Trial runtime exceeds deployment size limit');
console.log(`Trial runtime bundle: ${size} bytes`);
