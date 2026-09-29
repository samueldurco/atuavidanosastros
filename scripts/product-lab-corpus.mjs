import { buildProductLabCorpus } from './helpers/product-lab-corpus.mjs';

// Reproducible stdout export, no provider credentials or calls. Redirect only to a local artifact.
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--experimental-synastry')) {
  process.stderr.write('usage: product-lab-corpus.mjs [--experimental-synastry]\n');
  process.exitCode = 2;
} else {
  process.stdout.write(JSON.stringify(await buildProductLabCorpus(args.length ? { experimentalProduct: 'synastry' } : {}), null, 2) + '\n');
}
