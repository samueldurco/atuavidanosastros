import { buildProductLabCorpus } from './helpers/product-lab-corpus.mjs';

// Reproducible stdout export, no provider credentials or calls. Redirect only to a local artifact.
process.stdout.write(JSON.stringify(await buildProductLabCorpus(), null, 2) + '\n');
